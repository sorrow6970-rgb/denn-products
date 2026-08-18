import { describe, expect, it } from "vitest";
import type { CatalogDocumentV1 } from "@denn/shared";
import type { OperatorAuthPort, OperatorAuthState } from "@denn/firebase/admin-read";
import type { AdminStateWritePort } from "@denn/firebase/admin-write";
import { createAdminWriteSessionController } from "./session-controller";

const CATALOG = { version: 1, items: [] } as unknown as CatalogDocumentV1;
const CID = "abcdef01";

function harness() {
  let authState: OperatorAuthState = { status: "authenticated" };
  const authListeners = new Set<(state: OperatorAuthState) => void>();
  const calls: string[] = [];
  let loadResult: Awaited<ReturnType<AdminStateWritePort["loadBaseline"]>> = {
    ok: true,
    value: {
      catalog: CATALOG,
      revision: 4,
      source: "rebuild",
      promotedLegacyPrintSizeIds: [],
    },
  };
  let saveResult: Awaited<ReturnType<AdminStateWritePort["save"]>> = {
    ok: true,
    value: { revision: 5, objectPath: "rebuild-admin-state/objects/example.json" },
  };
  let resolveLoad: (() => void) | null = null;
  let resolveSave: (() => void) | null = null;
  let holdLoad = false;
  let holdSave = false;

  const auth: OperatorAuthPort = {
    subscribe: (listener) => {
      authListeners.add(listener);
      listener(authState);
      return () => authListeners.delete(listener);
    },
    currentOperator: () => authState,
    signInWithEmailPassword: async () => ({ ok: true, value: { correlationId: CID } }),
    signOut: async () => ({ ok: true, value: { correlationId: CID } }),
  };
  const write: AdminStateWritePort = {
    loadBaseline: async () => {
      calls.push("load");
      if (holdLoad) await new Promise<void>((resolve) => (resolveLoad = resolve));
      return loadResult;
    },
    save: async (request) => {
      calls.push(`save:${request.expectedBase}`);
      if (holdSave) await new Promise<void>((resolve) => (resolveSave = resolve));
      return saveResult;
    },
  };
  const controller = createAdminWriteSessionController({
    auth,
    write,
    createCorrelationId: () => CID,
  });
  const unsubscribe = controller.subscribe(() => undefined);

  return {
    controller,
    calls,
    setLoadResult: (value: typeof loadResult) => (loadResult = value),
    setSaveResult: (value: typeof saveResult) => (saveResult = value),
    holdLoad: () => (holdLoad = true),
    finishLoad: () => resolveLoad?.(),
    holdSave: () => (holdSave = true),
    finishSave: () => resolveSave?.(),
    auth: (next: OperatorAuthState) => {
      authState = next;
      for (const listener of [...authListeners]) listener(next);
    },
    unsubscribe,
  };
}

describe("admin write session controller", () => {
  it("loads and retains the exact baseline revision in memory", async () => {
    const h = harness();
    await h.controller.loadBaseline();
    expect(h.controller.getSnapshot()).toMatchObject({
      status: "ready-clean",
      revision: 4,
      source: "rebuild",
    });
    expect(h.controller.getBaseline()?.catalog).toBe(CATALOG);
  });

  it("saves only a valid dirty draft with the loaded expectedBase", async () => {
    const h = harness();
    await h.controller.loadBaseline();
    await h.controller.save(CATALOG);
    expect(h.calls).toEqual(["load"]);
    h.controller.setDraftState({ dirty: true, valid: true });
    await h.controller.save(CATALOG);
    expect(h.calls).toEqual(["load", "save:4"]);
    expect(h.controller.getSnapshot()).toMatchObject({ status: "ready-clean", revision: 5 });
  });

  it("requires explicit discard before a dirty reload", async () => {
    const h = harness();
    await h.controller.loadBaseline();
    h.controller.setDraftState({ dirty: true, valid: true });
    await h.controller.loadBaseline();
    expect(h.controller.getSnapshot().status).toBe("discard-confirmation");
    expect(h.calls).toEqual(["load"]);
    await h.controller.loadBaseline({ discardDirty: true });
    expect(h.calls).toEqual(["load", "load"]);
  });

  it("maps conflict and every outcome-unknown branch to a reload lock", async () => {
    for (const code of [
      "WRITE_CONFLICT",
      "WRITE_CLAIM_OUTCOME_UNKNOWN",
      "WRITE_UPLOAD_OUTCOME_UNKNOWN",
      "WRITE_COMMIT_OUTCOME_UNKNOWN",
    ] as const) {
      const h = harness();
      h.setSaveResult({
        ok: false,
        error: { category: "UNKNOWN", code, retryable: false, correlationId: CID },
      });
      await h.controller.loadBaseline();
      h.controller.setDraftState({ dirty: true, valid: true });
      await h.controller.save(CATALOG);
      expect(h.controller.getSnapshot().canSave).toBe(false);
      expect(h.controller.getSnapshot().status).toBe(
        code === "WRITE_CONFLICT" ? "conflict" : "outcome-unknown",
      );
      await h.controller.save(CATALOG);
      expect(h.calls.filter((call) => call.startsWith("save"))).toHaveLength(1);
    }
  });

  it("permits only an explicit retry after a definite upload failure", async () => {
    const h = harness();
    h.setSaveResult({
      ok: false,
      error: {
        category: "NETWORK",
        code: "WRITE_UPLOAD_FAILED",
        retryable: true,
        correlationId: CID,
      },
    });
    await h.controller.loadBaseline();
    h.controller.setDraftState({ dirty: true, valid: true });
    await h.controller.save(CATALOG);
    expect(h.controller.getSnapshot().canSave).toBe(true);
    await h.controller.save(CATALOG);
    expect(h.calls.filter((call) => call.startsWith("save"))).toHaveLength(2);
  });

  it("runtime-validates the catalog again and makes an invalid draft perform zero writes", async () => {
    const h = harness();
    await h.controller.loadBaseline();
    h.controller.setDraftState({ dirty: true, valid: true });
    await h.controller.save({ schemaVersion: 999 } as unknown as CatalogDocumentV1);
    expect(h.calls.filter((call) => call.startsWith("save"))).toHaveLength(0);
    expect(h.controller.getSnapshot()).toMatchObject({
      status: "ready-dirty-invalid",
      errorCode: "WRITE_INVALID_INPUT",
    });
  });

  it("turns a hostile catalog getter into WRITE_INVALID_INPUT without rejecting", async () => {
    const h = harness();
    await h.controller.loadBaseline();
    h.controller.setDraftState({ dirty: true, valid: true });
    const hostile = Proxy.revocable({}, {});
    hostile.revoke();
    await expect(h.controller.save(hostile.proxy as CatalogDocumentV1)).resolves.toBeUndefined();
    expect(h.calls.filter((call) => call.startsWith("save"))).toHaveLength(0);
    expect(JSON.stringify(h.controller.getSnapshot())).not.toContain("revoked");
    expect(h.controller.getSnapshot()).toMatchObject({
      status: "ready-dirty-invalid",
      errorCode: "WRITE_INVALID_INPUT",
    });
  });

  it("preserves the baseline and dirty state on an equivalent auth notification", async () => {
    const h = harness();
    await h.controller.loadBaseline();
    h.controller.setDraftState({ dirty: true, valid: true });
    const before = h.controller.getBaseline();
    h.auth({ status: "authenticated" });
    expect(h.controller.getBaseline()).toBe(before);
    expect(h.controller.getSnapshot()).toMatchObject({
      status: "ready-dirty-valid",
      revision: 4,
    });
  });

  it("returns to clean when an editor reports that the draft equals its baseline", async () => {
    const h = harness();
    await h.controller.loadBaseline();
    h.controller.setDraftState({ dirty: true, valid: true });
    expect(h.controller.getSnapshot().status).toBe("ready-dirty-valid");
    h.controller.setDraftState({ dirty: false, valid: true });
    expect(h.controller.getSnapshot()).toMatchObject({ status: "ready-clean", canSave: false });
  });

  it("makes load single-in-flight and ignores a late result after auth loss", async () => {
    const h = harness();
    h.holdLoad();
    const first = h.controller.loadBaseline();
    const second = h.controller.loadBaseline();
    expect(h.calls).toEqual(["load"]);
    h.auth({ status: "signed-out" });
    h.finishLoad();
    await Promise.all([first, second]);
    expect(h.controller.getSnapshot()).toMatchObject({ status: "auth-blocked", revision: null });
  });

  it("disposal detaches auth and silences late work", async () => {
    const h = harness();
    h.holdLoad();
    const pending = h.controller.loadBaseline();
    h.controller.dispose();
    h.finishLoad();
    await pending;
    expect(h.controller.getBaseline()).toBeNull();
    h.auth({ status: "authenticated" });
    expect(h.controller.getBaseline()).toBeNull();
  });

  it("ignores a late save result after auth loss", async () => {
    const h = harness();
    await h.controller.loadBaseline();
    h.controller.setDraftState({ dirty: true, valid: true });
    h.holdSave();
    const pending = h.controller.save(CATALOG);
    h.auth({ status: "signed-out" });
    h.finishSave();
    await pending;
    expect(h.controller.getSnapshot()).toMatchObject({ status: "auth-blocked", revision: null });
  });
});
