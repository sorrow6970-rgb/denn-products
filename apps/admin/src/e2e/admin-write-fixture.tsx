import { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import "@denn/ui/theme.css";
import type { AdminFirebaseFacade } from "@denn/firebase/admin-read";
import type { AdminStateSaveResult, AdminStateWritePort } from "@denn/firebase/admin-write";
import type { CatalogDocumentV1 } from "@denn/shared";
import { createAdminOperatorCompositionFromEnv } from "../admin-composition/create";
import { AdminRemoteStateCard } from "../admin-read/AdminRemoteStateCard";
import { FramePrintSizeEditor } from "../admin-write/FramePrintSizeEditor";
import type { AdminWriteSessionController } from "../admin-write/session-controller";

type SaveMode = "success" | "conflict" | "outcome-unknown";

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
  const diagnosticListeners = new Set<() => void>();
  const notifyDiagnostics = (): void => {
    for (const listener of [...diagnosticListeners]) listener();
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
        promotedLegacyPrintSizeIds: ["legacy"],
      },
    }),
    save: async (request): Promise<AdminStateSaveResult> => {
      saveCalls += 1;
      lastExpectedBase = request.expectedBase;
      notifyDiagnostics();
      if (mode === "conflict") {
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
      if (mode === "outcome-unknown") {
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
    subscribeDiagnostics(listener: () => void) {
      diagnosticListeners.add(listener);
      return () => diagnosticListeners.delete(listener);
    },
    diagnosticSnapshot: () =>
      `${mode}:${writeFactoryCalls}:${saveCalls}:${lastExpectedBase ?? "none"}`,
    diagnostics: () => ({ mode, writeFactoryCalls, saveCalls, lastExpectedBase }),
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
