import { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import "@denn/ui/theme.css";
import type { AdminFirebaseFacade } from "@denn/firebase/admin-read";
import type {
  AdminStateBaselineResult,
  AdminStateSaveResult,
  AdminStateWritePort,
} from "@denn/firebase/admin-write";
import type { CatalogDocumentV1 } from "@denn/shared";
import { createAdminOperatorCompositionFromEnv } from "../admin-composition/create";
import { AdminRemoteStateCard } from "../admin-read/AdminRemoteStateCard";
import { FramePrintSizeEditor } from "../admin-write/FramePrintSizeEditor";
import type { AdminWriteSessionController } from "../admin-write/session-controller";

type SaveMode =
  | "success"
  | "conflict"
  | "outcome-unknown"
  | "upload-failed"
  | "head-failed"
  | "hold";
type LoadMode = "success" | "failure" | "hold";

// Spec 093: only this opt-in test page exposes pending/error/auth controls. No production import.
const extendedAudit = new URLSearchParams(window.location.search).get("audit") === "spec093";

const CID = "abcdef0123456789";
const INITIAL_CATALOG: CatalogDocumentV1 = {
  schemaVersion: 1,
  migratedFrom: "legacy-v0",
  data: {
    frameSizes: [
      { id: "a4", name: "A4", printWidthCm: 21, printHeightCm: 29.7 },
      { id: "blank", name: "Blank" },
      {
        id: "legacy",
        name: "Legacy",
        wcm: 10,
        hcm: 20,
        printWidthCm: 10,
        printHeightCm: 20,
      },
    ],
  },
};

function createFixture() {
  let revision = 3;
  let catalog = structuredClone(INITIAL_CATALOG);
  let mode: SaveMode = "success";
  let saveCalls = 0;
  let writeFactoryCalls = 0;
  let lastExpectedBase: number | null = null;
  let loadMode: LoadMode = "success";
  let loadCalls = 0;
  let loadCompleted = 0;
  let saveCompleted = 0;
  let releaseLoad: (() => void) | null = null;
  let releaseSave: (() => void) | null = null;
  const authListeners = new Set<Parameters<AdminFirebaseFacade["onAuthStateChanged"]>[0]>();
  const diagnosticListeners = new Set<() => void>();
  const notifyDiagnostics = (): void => {
    for (const listener of [...diagnosticListeners]) listener();
  };

  const readFacade: AdminFirebaseFacade = {
    setPersistenceLocal: async () => undefined,
    onAuthStateChanged: (listener) => {
      authListeners.add(listener);
      listener({ isAnonymous: false });
      return () => authListeners.delete(listener);
    },
    signInWithEmailPassword: async () => undefined,
    signOut: async () => undefined,
    readObjectBytes: async () => new Uint8Array(),
  };

  const write: AdminStateWritePort = {
    loadBaseline: async (request): Promise<AdminStateBaselineResult> => {
      loadCalls += 1;
      const attemptMode = loadMode;
      const result: AdminStateBaselineResult =
        attemptMode === "failure"
          ? {
              ok: false,
              error: {
                category: "NETWORK",
                code: "NETWORK_UNAVAILABLE",
                retryable: true,
                correlationId: request.correlationId,
              },
            }
          : {
              ok: true,
              value: {
                catalog: structuredClone(catalog),
                revision,
                source: "rebuild",
                promotedLegacyPrintSizeIds: ["legacy"],
              },
            };
      if (attemptMode === "hold") {
        await new Promise<void>((resolve) => {
          releaseLoad = resolve;
          notifyDiagnostics();
        });
      }
      loadCompleted += 1;
      notifyDiagnostics();
      return result;
    },
    save: async (request): Promise<AdminStateSaveResult> => {
      saveCalls += 1;
      lastExpectedBase = request.expectedBase;
      notifyDiagnostics();
      const attemptMode = mode;
      if (attemptMode === "hold") {
        await new Promise<void>((resolve) => {
          releaseSave = resolve;
          notifyDiagnostics();
        });
      }
      saveCompleted += 1;
      notifyDiagnostics();
      if (attemptMode === "upload-failed" || attemptMode === "head-failed") {
        return {
          ok: false,
          error: {
            category: "NETWORK",
            code: attemptMode === "upload-failed" ? "WRITE_UPLOAD_FAILED" : "WRITE_HEAD_FAILED",
            retryable: attemptMode === "upload-failed",
            correlationId: request.correlationId,
          },
        };
      }
      if (attemptMode === "conflict") {
        return {
          ok: false,
          error: {
            category: "UNKNOWN",
            code: "WRITE_CONFLICT",
            retryable: false,
            correlationId: request.correlationId,
          },
        };
      }
      if (attemptMode === "outcome-unknown") {
        return {
          ok: false,
          error: {
            category: "UNKNOWN",
            code: "WRITE_COMMIT_OUTCOME_UNKNOWN",
            retryable: false,
            correlationId: request.correlationId,
          },
        };
      }
      catalog = structuredClone(request.catalog);
      revision += 1;
      notifyDiagnostics();
      return { ok: true, value: { revision, objectPath: "synthetic/never-exposed.json" } };
    },
  };

  const composition = createAdminOperatorCompositionFromEnv(
    {
      VITE_DENN_ADMIN_FIREBASE_ENABLED: "true",
      VITE_DENN_ADMIN_WRITE_ENABLED: "true",
      VITE_DENN_ADMIN_FIREBASE_API_KEY: "synthetic-api-key",
      VITE_DENN_ADMIN_FIREBASE_AUTH_DOMAIN: "synthetic.invalid",
      VITE_DENN_ADMIN_FIREBASE_PROJECT_ID: "demo-synthetic",
      VITE_DENN_ADMIN_FIREBASE_STORAGE_BUCKET: "synthetic.invalid",
      VITE_DENN_ADMIN_FIREBASE_APP_ID: "synthetic-app-id",
    },
    {
      makeReadFacade: async () => readFacade,
      makeWritePort: async () => {
        writeFactoryCalls += 1;
        notifyDiagnostics();
        return write;
      },
      createCorrelationId: () => CID,
    },
  );
  const controller = composition.writeController;
  if (controller === null) {
    throw new Error("synthetic write composition must be enabled");
  }

  return {
    controller,
    remoteController: composition.remoteController,
    setMode(next: SaveMode) {
      mode = next;
      notifyDiagnostics();
    },
    setLoadMode(next: LoadMode) {
      loadMode = next;
      notifyDiagnostics();
    },
    releaseLoad() {
      const release = releaseLoad;
      releaseLoad = null;
      release?.();
      notifyDiagnostics();
    },
    releaseSave() {
      const release = releaseSave;
      releaseSave = null;
      release?.();
      notifyDiagnostics();
    },
    expireAuth() {
      for (const listener of [...authListeners]) listener(null);
    },
    subscribeDiagnostics(listener: () => void) {
      diagnosticListeners.add(listener);
      return () => diagnosticListeners.delete(listener);
    },
    diagnosticSnapshot: () =>
      `${mode}:${writeFactoryCalls}:${saveCalls}:${lastExpectedBase ?? "none"}:${loadMode}:${loadCalls}:${loadCompleted}:${saveCompleted}:${revision}:${releaseLoad !== null}:${releaseSave !== null}`,
    diagnostics: () => ({
      mode,
      writeFactoryCalls,
      saveCalls,
      lastExpectedBase,
      loadCalls,
      loadCompleted,
      saveCompleted,
      remoteRevision: revision,
      pendingLoad: releaseLoad !== null,
      pendingSave: releaseSave !== null,
    }),
  };
}

const fixture = createFixture();

function Diagnostics({ controller }: { readonly controller: AdminWriteSessionController }) {
  const session = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useSyncExternalStore(
    fixture.subscribeDiagnostics,
    fixture.diagnosticSnapshot,
    fixture.diagnosticSnapshot,
  );
  const diagnostics = fixture.diagnostics();
  return (
    <section aria-label="합성 fixture 진단">
      <p data-testid="fixture-status">{session.status}</p>
      <p data-testid="fixture-revision">{session.revision ?? "none"}</p>
      <p data-testid="fixture-write-factory-calls">{diagnostics.writeFactoryCalls}</p>
      <p data-testid="fixture-save-calls">{diagnostics.saveCalls}</p>
      <p data-testid="fixture-expected-base">{diagnostics.lastExpectedBase ?? "none"}</p>
      <button type="button" onClick={() => fixture.setMode("success")}>
        다음 저장 성공
      </button>
      <button type="button" onClick={() => fixture.setMode("conflict")}>
        다음 저장 충돌
      </button>
      <button type="button" onClick={() => fixture.setMode("outcome-unknown")}>
        다음 저장 결과 미확정
      </button>
      {extendedAudit ? (
        <div data-testid="fixture-extended-audit">
          <p data-testid="fixture-load-calls">{diagnostics.loadCalls}</p>
          <p data-testid="fixture-load-completed">{diagnostics.loadCompleted}</p>
          <p data-testid="fixture-save-completed">{diagnostics.saveCompleted}</p>
          <p data-testid="fixture-remote-revision">{diagnostics.remoteRevision}</p>
          <p data-testid="fixture-pending-load">{String(diagnostics.pendingLoad)}</p>
          <p data-testid="fixture-pending-save">{String(diagnostics.pendingSave)}</p>
          <button type="button" onClick={() => fixture.setLoadMode("hold")}>
            읽기 보류 모드
          </button>
          <button type="button" onClick={() => fixture.setLoadMode("failure")}>
            읽기 실패 모드
          </button>
          <button type="button" onClick={() => fixture.setLoadMode("success")}>
            읽기 성공 모드
          </button>
          <button
            type="button"
            disabled={!diagnostics.pendingLoad}
            onClick={() => fixture.releaseLoad()}
          >
            보류 읽기 완료
          </button>
          <button type="button" onClick={() => fixture.setMode("hold")}>
            저장 보류 모드
          </button>
          <button type="button" onClick={() => fixture.setMode("upload-failed")}>
            업로드 실패 모드
          </button>
          <button type="button" onClick={() => fixture.setMode("head-failed")}>
            head 실패 모드
          </button>
          <button
            type="button"
            disabled={!diagnostics.pendingSave}
            onClick={() => fixture.releaseSave()}
          >
            보류 저장 완료
          </button>
          <button type="button" onClick={() => fixture.expireAuth()}>
            합성 인증 만료
          </button>
        </div>
      ) : null}
    </section>
  );
}

function FixtureApp() {
  return (
    <main className="denn-shell">
      <div className="denn-shell__inner">
        <h1>Admin write E2E fixture (not a product screen)</h1>
        <AdminRemoteStateCard controller={fixture.remoteController} mode="auth-only" />
        <FramePrintSizeEditor controller={fixture.controller} />
        <Diagnostics controller={fixture.controller} />
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<FixtureApp />);
