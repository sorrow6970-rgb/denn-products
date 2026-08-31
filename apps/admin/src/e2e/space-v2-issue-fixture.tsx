// E2E-only harness for the Space V2 issue panel (spec 083). NOT a product screen.
//
// Everything below the WRITE PORT is the real product path: the real composition and gates, the real
// spec 081 session, the real spec 072 bundle with real Web Crypto encryption and SHA-256, the real
// proof owner with real Blob/Image decoding, and the real Canvas executor. Only the writer is
// synthetic, so the harness never reaches Firebase, a bucket, a document or the network.

import { StrictMode, useEffect, useMemo, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import "@denn/ui/theme.css";
import type { AdminFirebaseFacade, AdminFacadeUser } from "@denn/firebase/admin-read";
import type { AdminStateWritePort } from "@denn/firebase/admin-write";
import type {
  SpaceV2IssueAuthPort,
  SpaceV2IssueRequest,
  SpaceV2IssueResult,
  SpaceV2IssueWritePort,
} from "@denn/firebase/space-write";
import type { CatalogDocumentV1 } from "@denn/shared";
import type { AdminOperatorCompositionDependencies } from "../admin-composition/create";
import { useOwnedAdminComposition } from "../App";
import { AdminSpaceV2IssuePanel } from "../space-v2/AdminSpaceV2IssuePanel";
import type {
  AdminWriteSessionController,
  AdminWriteSessionSnapshot,
} from "../admin-write/session-controller";
import type {
  SpaceV2IssueSessionController,
  SpaceV2IssueSessionSnapshot,
} from "../space-v2/issue-session";

type IssueMode = "success" | "definite-failure" | "outcome-unknown" | "hang";

// --- instrumentation (harness only) ------------------------------------------
//
// Two things the panel is contractually responsible for cannot be observed from the DOM: the object
// URLs it creates for the proof preview, and the store subscriptions it holds. Both are counted
// here, at the boundary, so "nothing leaked when the panel went away" is a measurement rather than
// a claim. The counters wrap the real browser API and the real controllers — the panel still runs
// its production path.

let objectUrlsCreated = 0;
let objectUrlsRevoked = 0;
let panelListeners = 0;

const instrumentListeners = new Set<() => void>();
const instrumentsChanged = (): void => {
  for (const listener of [...instrumentListeners]) listener();
};
const instrumentSnapshot = (): string =>
  `${objectUrlsCreated}:${objectUrlsRevoked}:${panelListeners}`;

const nativeCreateObjectUrl = URL.createObjectURL.bind(URL);
const nativeRevokeObjectUrl = URL.revokeObjectURL.bind(URL);
URL.createObjectURL = (source: Blob | MediaSource): string => {
  objectUrlsCreated += 1;
  const url = nativeCreateObjectUrl(source as Blob);
  instrumentsChanged();
  return url;
};
URL.revokeObjectURL = (url: string): void => {
  objectUrlsRevoked += 1;
  nativeRevokeObjectUrl(url);
  instrumentsChanged();
};

/** Counts the panel's own subscriptions without changing what it subscribes to. */
function countingWriteController(
  controller: AdminWriteSessionController,
): AdminWriteSessionController {
  return {
    ...controller,
    subscribe: (listener: (value: AdminWriteSessionSnapshot) => void): (() => void) => {
      const detach = controller.subscribe(listener);
      panelListeners += 1;
      instrumentsChanged();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        panelListeners -= 1;
        detach();
        instrumentsChanged();
      };
    },
  };
}

function countingIssueSession(
  controller: SpaceV2IssueSessionController,
): SpaceV2IssueSessionController {
  return {
    ...controller,
    subscribe: (listener: (snapshot: SpaceV2IssueSessionSnapshot) => void): (() => void) => {
      const detach = controller.subscribe(listener);
      panelListeners += 1;
      instrumentsChanged();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        panelListeners -= 1;
        detach();
        instrumentsChanged();
      };
    },
  };
}

const CID = "abcdef0123456789";

/**
 * The clock is opt-OUT in the legacy model, so a template this capability can issue says so
 * explicitly. `clocked` and `art` are here to prove the panel refuses them ON SCREEN rather than
 * hiding them.
 */
const INITIAL_CATALOG: CatalogDocumentV1 = {
  schemaVersion: 1,
  migratedFrom: "legacy-v0",
  data: {
    frameTemplates: [
      { id: "full", name: "전체 사진", type: "builtin", dataUrl: null, clock: false },
      { id: "clocked", name: "시계형", type: "builtin", dataUrl: null },
      {
        id: "art",
        name: "아트",
        type: "uploaded",
        dataUrl: "data:image/png;base64,QUJD",
        clock: false,
      },
    ],
    frameSizes: [
      { id: "a4", name: "A4", aspect: 1.5, clock: null },
      { id: "wide", name: "가로형", aspect: 0.75, clock: null },
    ],
    frameColors: [
      { id: "black", name: "블랙", fill: "#1A1A1A", grain: false },
      { id: "oak", name: "오크", fill: "#C8A87A", grain: true },
    ],
    frameThickness: 5.5,
    clockSettings: { x: 88, y: 88, size: 12, customImg: null },
  },
};

function createFixture() {
  let revision = 3;
  let catalog = structuredClone(INITIAL_CATALOG);
  let mode: IssueMode = "success";
  let issueCalls = 0;
  let writeFactoryCalls = 0;
  let lastToken = "";
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  // The observer is KEPT, so the harness can deliver a later auth notification the way the SDK
  // does. That is how an operator session that expired between two actions is reproduced here:
  // nothing is faked in the panel, the real auth port publishes a real signed-out state.
  const authObservers = new Set<(user: AdminFacadeUser | null) => void>();
  let operatorUser: AdminFacadeUser | null = { isAnonymous: false };
  /** Every attach the composition's auth port ever made — a disposed composition must leave none. */
  let authAttached = 0;
  let authDetached = 0;

  const readFacade: AdminFirebaseFacade = {
    setPersistenceLocal: async () => undefined,
    onAuthStateChanged: (listener) => {
      authObservers.add(listener);
      authAttached += 1;
      notify();
      listener(operatorUser);
      return () => {
        authObservers.delete(listener);
        authDetached += 1;
        notify();
      };
    },
    signInWithEmailPassword: async () => undefined,
    signOut: async () => undefined,
    readObjectBytes: async () => new Uint8Array(),
  };

  const write: AdminStateWritePort = {
    loadBaseline: async () => ({
      ok: true,
      value: {
        catalog: structuredClone(catalog),
        revision,
        source: "rebuild",
        promotedLegacyPrintSizeIds: [],
      },
    }),
    save: async (request) => {
      catalog = structuredClone(request.catalog);
      revision += 1;
      return { ok: true, value: { revision, objectPath: "synthetic/never-exposed.json" } };
    },
  };

  /** Resolves an issue that was left hanging, so a LATE completion can be delivered on purpose. */
  let releaseHungIssue: (() => void) | null = null;

  /**
   * The result the synthetic writer produces, decided when it answers rather than when it was
   * called — which is what makes a late completion late.
   *
   * The operator gate is the REAL one: `currentOperator()` is the narrowed port the production
   * composition handed to the writer, and a session that is no longer authenticated closes as the
   * same definite `SPACE_V2_ISSUE_AUTH_REQUIRED` the real write port returns, never as a success.
   */
  const settleIssue = (
    request: SpaceV2IssueRequest,
    auth: SpaceV2IssueAuthPort,
    value: { readonly token: string; readonly objectPath: string },
  ): SpaceV2IssueResult => {
    if (auth.currentOperator().status !== "authenticated") {
      return {
        ok: false,
        error: {
          category: "AUTH",
          code: "SPACE_V2_ISSUE_AUTH_REQUIRED",
          retryable: true,
          correlationId: request.correlationId,
        },
      };
    }
    if (mode === "definite-failure") {
      return {
        ok: false,
        error: {
          category: "NETWORK",
          code: "SPACE_V2_ISSUE_UPLOAD_FAILED",
          retryable: true,
          correlationId: request.correlationId,
        },
      };
    }
    if (mode === "outcome-unknown") {
      return {
        ok: false,
        error: {
          category: "NETWORK",
          code: "SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN",
          retryable: false,
          correlationId: request.correlationId,
        },
      };
    }
    return { ok: true, value };
  };

  /** The ONLY synthetic seam. It reads the prepared bundle exactly as the real port would. */
  const createIssuePort = (auth: SpaceV2IssueAuthPort): SpaceV2IssueWritePort => ({
    issue: async (request: SpaceV2IssueRequest): Promise<SpaceV2IssueResult> => {
      issueCalls += 1;
      const token = request.bundle.token;
      const objectPath = request.bundle.copyProofDescriptor().objectPath;
      // Reading the bytes and the document proves the panel handed over a complete bundle.
      request.bundle.copyUploadBytes();
      request.bundle.copyDocument();
      lastToken = token;
      notify();
      if (mode !== "hang") return settleIssue(request, auth, { token, objectPath });
      return new Promise<SpaceV2IssueResult>((resolve) => {
        releaseHungIssue = () => {
          releaseHungIssue = null;
          notify();
          resolve(settleIssue(request, auth, { token, objectPath }));
        };
        notify();
      });
    },
  });

  /**
   * The env and dependencies the REAL composition factory is given. The composition itself is NOT
   * built here: `FixtureApp` builds it through the product's own `useOwnedAdminComposition`, so the
   * ownership under test is `App.tsx`'s, not a copy of it.
   */
  const env = {
    VITE_DENN_ADMIN_FIREBASE_ENABLED: "true",
    VITE_DENN_ADMIN_WRITE_ENABLED: "true",
    VITE_DENN_ADMIN_SPACE_V2_ISSUE_ENABLED: "true",
    VITE_DENN_ADMIN_FIREBASE_API_KEY: "synthetic-api-key",
    VITE_DENN_ADMIN_FIREBASE_AUTH_DOMAIN: "synthetic.invalid",
    VITE_DENN_ADMIN_FIREBASE_PROJECT_ID: "demo-synthetic",
    VITE_DENN_ADMIN_FIREBASE_STORAGE_BUCKET: "synthetic.invalid",
    VITE_DENN_ADMIN_FIREBASE_APP_ID: "synthetic-app-id",
  };

  const dependencies: AdminOperatorCompositionDependencies = {
    makeReadFacade: async () => readFacade,
    makeWritePort: async () => write,
    createCorrelationId: () => CID,
    spaceV2Issue: {
      makeWritePort: async ({ auth }) => {
        writeFactoryCalls += 1;
        notify();
        return createIssuePort(auth);
      },
    },
  };

  return {
    env,
    dependencies,
    setMode(next: IssueMode) {
      mode = next;
      notify();
    },
    bumpRevision(writeController: AdminWriteSessionController) {
      // An out-of-band save by another operator: the loaded baseline is no longer current.
      revision += 1;
      void writeController.loadBaseline();
      notify();
    },
    /** The operator session ended between two actions — exactly what an expiry looks like here. */
    expireAuth() {
      operatorUser = null;
      for (const observer of [...authObservers]) observer(null);
      notify();
    },
    releaseIssue() {
      releaseHungIssue?.();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () =>
      `${mode}:${writeFactoryCalls}:${issueCalls}:${lastToken}:${releaseHungIssue === null ? 0 : 1}:${authAttached}:${authObservers.size}`,
    diagnostics: () => ({
      mode,
      writeFactoryCalls,
      issueCalls,
      pendingIssues: releaseHungIssue === null ? 0 : 1,
      /** Every observer the composition's auth port ever attached, and how many are live now. */
      authAttached,
      authDetached,
      authObserversLive: authObservers.size,
    }),
  };
}

const fixture = createFixture();

/**
 * A synthetic clipboard: it records what an explicit copy click handed over, and nothing else.
 *
 * The three failure shapes are selectable because they are genuinely different code paths in the
 * caller. `sync-throw` is the one production actually takes when `navigator.clipboard` is absent —
 * `write()` throws before a promise exists — and `missing` is a build with no port injected at all.
 */
type ClipboardMode = "ok" | "sync-throw" | "reject" | "missing";
let clipboardMode: ClipboardMode = "ok";
let copiedText = "";
let copyCalls = 0;
const clipboardListeners = new Set<() => void>();
const clipboardChanged = (): void => {
  for (const listener of [...clipboardListeners]) listener();
};
const clipboard = {
  write: (text: string): Promise<void> => {
    copyCalls += 1;
    clipboardChanged();
    if (clipboardMode === "sync-throw") {
      throw new TypeError("Cannot read properties of undefined (reading 'writeText')");
    }
    if (clipboardMode === "reject") {
      return Promise.reject(new Error("NotAllowedError: 합성 거부"));
    }
    copiedText = text;
    clipboardChanged();
    return Promise.resolve();
  },
};
const setClipboardMode = (next: ClipboardMode): void => {
  clipboardMode = next;
  clipboardChanged();
};

/**
 * Whether the panel is on screen. Taking it away is a REAL unmount of the product component: the
 * effect cleanups run, the subscriptions detach and the proof owner disposes.
 *
 * This is NOT a stand-in for StrictMode. A real unmount destroys the component instance, so the
 * next mount starts from fresh state; StrictMode's effect replay keeps the same instance and its
 * state, which is exactly why a disposed owner could survive there. This page is built twice —
 * once for production and once with React's development build (see `vite.e2e-fixture.config.ts`,
 * output `dev/`) — and the StrictMode replay is exercised on the development page only.
 */
let panelMounted = true;
const shellListeners = new Set<() => void>();
const shellSnapshot = (): string => (panelMounted ? "mounted" : "unmounted");
const subscribeShell = (listener: () => void): (() => void) => {
  shellListeners.add(listener);
  return () => {
    shellListeners.delete(listener);
  };
};
const setPanelMounted = (next: boolean): void => {
  panelMounted = next;
  for (const listener of [...shellListeners]) listener();
};

/**
 * The harness's readouts are styled by `.denn-shell__inner p`, whose muted token sits just under the
 * 4.5:1 the axe gate requires. The gate measures the WHOLE page, so the harness meets it rather than
 * being excused from it — and a class rule beats inheritance, so the colour is set per paragraph.
 */
const DIAG = { color: "var(--ink)" } as const;

function Diagnostics({
  writeController,
  session,
}: {
  readonly writeController: AdminWriteSessionController;
  readonly session: SpaceV2IssueSessionController;
}) {
  const write = useSyncExternalStore(
    writeController.subscribe,
    writeController.getSnapshot,
    writeController.getSnapshot,
  );
  const issue = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useSyncExternalStore(fixture.subscribe, fixture.snapshot, fixture.snapshot);
  useSyncExternalStore(
    (listener: () => void) => {
      clipboardListeners.add(listener);
      return () => clipboardListeners.delete(listener);
    },
    () => `${copyCalls}:${copiedText}:${clipboardMode}`,
    () => `${copyCalls}:${copiedText}:${clipboardMode}`,
  );
  useSyncExternalStore(subscribeShell, shellSnapshot, shellSnapshot);
  useSyncExternalStore(
    (listener: () => void) => {
      instrumentListeners.add(listener);
      return () => instrumentListeners.delete(listener);
    },
    instrumentSnapshot,
    instrumentSnapshot,
  );
  const diagnostics = fixture.diagnostics();

  return (
    <section aria-label="합성 fixture 진단">
      <p style={DIAG} data-testid="fixture-write-status">
        {write.status}
      </p>
      <p style={DIAG} data-testid="fixture-revision">
        {write.revision ?? "none"}
      </p>
      <p style={DIAG} data-testid="fixture-issue-status">
        {issue.status}
      </p>
      <p style={DIAG} data-testid="fixture-issue-can">
        {issue.canIssue ? "yes" : "no"}
      </p>
      <p style={DIAG} data-testid="fixture-write-factory-calls">
        {diagnostics.writeFactoryCalls}
      </p>
      <p style={DIAG} data-testid="fixture-issue-calls">
        {diagnostics.issueCalls}
      </p>
      <p style={DIAG} data-testid="fixture-copy-calls">
        {copyCalls}
      </p>
      <p style={DIAG} data-testid="fixture-copied">
        {copiedText}
      </p>
      <p style={DIAG} data-testid="fixture-pending-issues">
        {diagnostics.pendingIssues}
      </p>
      {/* created:revoked. Equal means the panel released every object URL it made. */}
      <p style={DIAG} data-testid="fixture-object-urls">
        {`${objectUrlsCreated}:${objectUrlsRevoked}`}
      </p>
      <p style={DIAG} data-testid="fixture-panel-listeners">
        {panelListeners}
      </p>
      <p style={DIAG} data-testid="fixture-panel-mounted">
        {panelMounted ? "yes" : "no"}
      </p>
      {/* attached : detached : live. A disposed composition must leave no live auth observer. */}
      <p style={DIAG} data-testid="fixture-auth-observers">
        {`${diagnostics.authAttached}:${diagnostics.authDetached}:${diagnostics.authObserversLive}`}
      </p>
      {/* 1 in a production build, 2 when React's development StrictMode replays the effect. */}
      <p style={DIAG} data-testid="fixture-effect-setups">
        {effectSetups}
      </p>
      <button type="button" onClick={() => void writeController.loadBaseline()}>
        편집 기준 불러오기
      </button>
      <button type="button" onClick={() => fixture.setMode("success")}>
        다음 발급 성공
      </button>
      <button type="button" onClick={() => fixture.setMode("definite-failure")}>
        다음 발급 실패
      </button>
      <button type="button" onClick={() => fixture.setMode("outcome-unknown")}>
        다음 발급 결과 미확정
      </button>
      <button type="button" onClick={() => fixture.setMode("hang")}>
        다음 발급 지연
      </button>
      <button type="button" onClick={() => fixture.bumpRevision(writeController)}>
        기준본 변경
      </button>
      <button type="button" onClick={() => fixture.expireAuth()}>
        운영자 인증 만료
      </button>
      <button type="button" onClick={() => fixture.releaseIssue()}>
        지연 발급 완료
      </button>
      <button type="button" onClick={() => setPanelMounted(false)}>
        패널 내리기
      </button>
      <button type="button" onClick={() => setPanelMounted(true)}>
        패널 올리기
      </button>
      <button
        type="button"
        onClick={() => {
          // What the production shell does when the whole app goes away: the panel is unmounted and
          // the composition disposes the session it owns.
          setPanelMounted(false);
          session.dispose();
        }}
      >
        패널 내리고 세션 정리
      </button>
      <button type="button" onClick={() => setClipboardMode("sync-throw")}>
        복사 동기 예외
      </button>
      <button type="button" onClick={() => setClipboardMode("reject")}>
        복사 거부
      </button>
      <button type="button" onClick={() => setClipboardMode("missing")}>
        복사 수단 없음
      </button>
    </section>
  );
}

/** Effect setups this harness has run. 1 in production, 2 under a development StrictMode replay. */
let effectSetups = 0;

function FixtureApp() {
  // The REAL product hook from `App.tsx`, given synthetic ports. The ownership under test is the
  // one the admin shell ships, not a copy of it.
  const composition = useOwnedAdminComposition(fixture.env, fixture.dependencies);
  useSyncExternalStore(subscribeShell, shellSnapshot, shellSnapshot);
  useSyncExternalStore(
    (listener: () => void) => {
      clipboardListeners.add(listener);
      return () => clipboardListeners.delete(listener);
    },
    () => clipboardMode,
    () => clipboardMode,
  );
  useEffect(() => {
    // A development StrictMode replay runs this twice; a production build runs it once. The E2E
    // reads it so a page that is NOT a development build cannot pass a StrictMode assertion.
    effectSetups += 1;
    instrumentsChanged();
  }, []);

  const writeController = composition.writeController;
  const session = composition.spaceV2IssueSession;

  // The panel gets the COUNTING controllers; the diagnostics keep the raw ones, so the listener
  // readout is the panel's own subscription count and nothing else. They are memoized per
  // controller identity, so a StrictMode replacement produces exactly one new pair.
  const panelWriteController = useMemo(
    () => (writeController === null ? null : countingWriteController(writeController)),
    [writeController],
  );
  const panelSession = useMemo(
    () => (session === null ? null : countingIssueSession(session)),
    [session],
  );

  if (
    writeController === null ||
    session === null ||
    panelWriteController === null ||
    panelSession === null
  ) {
    throw new Error("synthetic space v2 composition must be enabled");
  }

  return (
    <main className="denn-shell">
      <div className="denn-shell__inner">
        <h1>Space V2 issue E2E fixture (not a product screen)</h1>
        {panelMounted ? (
          <AdminSpaceV2IssuePanel
            writeController={panelWriteController}
            session={panelSession}
            clipboard={clipboardMode === "missing" ? undefined : clipboard}
          />
        ) : null}
        <Diagnostics writeController={writeController} session={session} />
      </div>
    </main>
  );
}

const root = document.getElementById("root");
// StrictMode exactly as `main.tsx` mounts the real admin shell. It is inert in the production
// build and replays every effect in the development build this config also emits.
if (root)
  createRoot(root).render(
    <StrictMode>
      <FixtureApp />
    </StrictMode>,
  );
