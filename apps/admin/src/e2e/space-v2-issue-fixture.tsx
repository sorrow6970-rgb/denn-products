// E2E-only harness for the Space V2 issue panel (spec 083). NOT a product screen.
//
// Everything below the WRITE PORT is the real product path: the real composition and gates, the real
// spec 081 session, the real spec 072 bundle with real Web Crypto encryption and SHA-256, the real
// proof owner with real Blob/Image decoding, and the real Canvas executor. Only the writer is
// synthetic, so the harness never reaches Firebase, a bucket, a document or the network.

import { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import "@denn/ui/theme.css";
import type { AdminFirebaseFacade } from "@denn/firebase/admin-read";
import type { AdminStateWritePort } from "@denn/firebase/admin-write";
import type {
  SpaceV2IssueRequest,
  SpaceV2IssueResult,
  SpaceV2IssueWritePort,
} from "@denn/firebase/space-write";
import type { CatalogDocumentV1 } from "@denn/shared";
import { createAdminOperatorCompositionFromEnv } from "../admin-composition/create";
import { AdminSpaceV2IssuePanel } from "../space-v2/AdminSpaceV2IssuePanel";
import type { AdminWriteSessionController } from "../admin-write/session-controller";
import type { SpaceV2IssueSessionController } from "../space-v2/issue-session";

type IssueMode = "success" | "definite-failure" | "outcome-unknown" | "hang";

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

  const readFacade: AdminFirebaseFacade = {
    setPersistenceLocal: async () => undefined,
    onAuthStateChanged: (listener) => {
      listener({ isAnonymous: false });
      return () => undefined;
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

  /** The ONLY synthetic seam. It reads the prepared bundle exactly as the real port would. */
  const issuePort: SpaceV2IssueWritePort = {
    issue: async (request: SpaceV2IssueRequest): Promise<SpaceV2IssueResult> => {
      issueCalls += 1;
      const token = request.bundle.token;
      const objectPath = request.bundle.copyProofDescriptor().objectPath;
      // Reading the bytes and the document proves the panel handed over a complete bundle.
      request.bundle.copyUploadBytes();
      request.bundle.copyDocument();
      lastToken = token;
      notify();
      if (mode === "hang") return new Promise<SpaceV2IssueResult>(() => undefined);
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
      return { ok: true, value: { token, objectPath } };
    },
  };

  const composition = createAdminOperatorCompositionFromEnv(
    {
      VITE_DENN_ADMIN_FIREBASE_ENABLED: "true",
      VITE_DENN_ADMIN_WRITE_ENABLED: "true",
      VITE_DENN_ADMIN_SPACE_V2_ISSUE_ENABLED: "true",
      VITE_DENN_ADMIN_FIREBASE_API_KEY: "synthetic-api-key",
      VITE_DENN_ADMIN_FIREBASE_AUTH_DOMAIN: "synthetic.invalid",
      VITE_DENN_ADMIN_FIREBASE_PROJECT_ID: "demo-synthetic",
      VITE_DENN_ADMIN_FIREBASE_STORAGE_BUCKET: "synthetic.invalid",
      VITE_DENN_ADMIN_FIREBASE_APP_ID: "synthetic-app-id",
    },
    {
      makeReadFacade: async () => readFacade,
      makeWritePort: async () => write,
      createCorrelationId: () => CID,
      spaceV2Issue: {
        makeWritePort: async () => {
          writeFactoryCalls += 1;
          notify();
          return issuePort;
        },
      },
    },
  );

  const writeController = composition.writeController;
  const session = composition.spaceV2IssueSession;
  if (writeController === null || session === null) {
    throw new Error("synthetic space v2 composition must be enabled");
  }

  return {
    writeController,
    session,
    setMode(next: IssueMode) {
      mode = next;
      notify();
    },
    bumpRevision() {
      // An out-of-band save by another operator: the loaded baseline is no longer current.
      revision += 1;
      void writeController.loadBaseline();
      notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => `${mode}:${writeFactoryCalls}:${issueCalls}:${lastToken}`,
    diagnostics: () => ({ mode, writeFactoryCalls, issueCalls }),
  };
}

const fixture = createFixture();

/** A synthetic clipboard: it records what an explicit copy click handed over, and nothing else. */
let copiedText = "";
let copyCalls = 0;
const clipboardListeners = new Set<() => void>();
const clipboard = {
  write: async (text: string): Promise<void> => {
    copyCalls += 1;
    copiedText = text;
    for (const listener of [...clipboardListeners]) listener();
  },
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
    () => `${copyCalls}:${copiedText}`,
    () => `${copyCalls}:${copiedText}`,
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
      <button type="button" onClick={() => void fixture.writeController.loadBaseline()}>
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
      <button type="button" onClick={() => fixture.bumpRevision()}>
        기준본 변경
      </button>
    </section>
  );
}

function FixtureApp() {
  return (
    <main className="denn-shell">
      <div className="denn-shell__inner">
        <h1>Space V2 issue E2E fixture (not a product screen)</h1>
        <AdminSpaceV2IssuePanel
          writeController={fixture.writeController}
          session={fixture.session}
          clipboard={clipboard}
        />
        <Diagnostics writeController={fixture.writeController} session={fixture.session} />
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<FixtureApp />);
