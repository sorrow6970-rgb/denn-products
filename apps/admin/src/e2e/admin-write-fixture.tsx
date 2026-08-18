import { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import "@denn/ui/theme.css";
import type { OperatorAuthPort, OperatorAuthState } from "@denn/firebase/admin-read";
import type { AdminStateSaveResult, AdminStateWritePort } from "@denn/firebase/admin-write";
import type { CatalogDocumentV1 } from "@denn/shared";
import { FramePrintSizeEditor } from "../admin-write/FramePrintSizeEditor";
import {
  createAdminWriteSessionController,
  type AdminWriteSessionController,
} from "../admin-write/session-controller";

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
  let lastExpectedBase: number | null = null;
  const diagnosticListeners = new Set<() => void>();
  const notifyDiagnostics = (): void => {
    for (const listener of [...diagnosticListeners]) listener();
  };

  const authenticated: OperatorAuthState = { status: "authenticated" };
  const auth: OperatorAuthPort = {
    currentOperator: () => authenticated,
    subscribe: (listener) => {
      listener(authenticated);
      return () => undefined;
    },
    signInWithEmailPassword: async () => ({ ok: true, value: { correlationId: CID } }),
    signOut: async () => ({ ok: true, value: { correlationId: CID } }),
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

  const controller = createAdminWriteSessionController({
    auth,
    write,
    createCorrelationId: () => CID,
  });

  return {
    controller,
    setMode(next: SaveMode) {
      mode = next;
      notifyDiagnostics();
    },
    subscribeDiagnostics(listener: () => void) {
      diagnosticListeners.add(listener);
      return () => diagnosticListeners.delete(listener);
    },
    diagnosticSnapshot: () => `${mode}:${saveCalls}:${lastExpectedBase ?? "none"}`,
    diagnostics: () => ({ mode, saveCalls, lastExpectedBase }),
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
        <FramePrintSizeEditor controller={fixture.controller} />
        <Diagnostics controller={fixture.controller} />
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<FixtureApp />);
