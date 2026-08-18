import { describe, expect, it, vi } from "vitest";
import type { AdminFirebaseFacade, OperatorAuthState } from "@denn/firebase/admin-read";
import type {
  AdminStateBaselineResult,
  AdminStateSaveResult,
  AdminStateWritePort,
} from "@denn/firebase/admin-write";
import { createAdminOperatorCompositionFromEnv, createLazyAdminStateWritePort } from "./create";

const ENV = {
  VITE_DENN_ADMIN_FIREBASE_ENABLED: "true",
  VITE_DENN_ADMIN_WRITE_ENABLED: "true",
  VITE_DENN_ADMIN_FIREBASE_API_KEY: "k",
  VITE_DENN_ADMIN_FIREBASE_AUTH_DOMAIN: "d",
  VITE_DENN_ADMIN_FIREBASE_PROJECT_ID: "p",
  VITE_DENN_ADMIN_FIREBASE_STORAGE_BUCKET: "b",
  VITE_DENN_ADMIN_FIREBASE_APP_ID: "a",
} as const;
const CID = "0123abcdef456789";
const CATALOG = { schemaVersion: 1, migratedFrom: "legacy-v0", data: {} } as const;

function readFacade(initial: OperatorAuthState = { status: "authenticated" }) {
  let observerCalls = 0;
  let stopCalls = 0;
  const facade: AdminFirebaseFacade = {
    setPersistenceLocal: async () => undefined,
    onAuthStateChanged: (listener) => {
      observerCalls += 1;
      listener(initial.status === "authenticated" ? { isAnonymous: false } : null);
      return () => {
        stopCalls += 1;
      };
    },
    signInWithEmailPassword: async () => undefined,
    signOut: async () => undefined,
    readObjectBytes: async () => new TextEncoder().encode(JSON.stringify(CATALOG)),
  };
  return { facade, observerCalls: () => observerCalls, stopCalls: () => stopCalls };
}

function writePort(): AdminStateWritePort {
  const baseline: AdminStateBaselineResult = {
    ok: true,
    value: {
      catalog: CATALOG,
      revision: 0,
      source: "legacy",
      promotedLegacyPrintSizeIds: [],
    },
  };
  const saved: AdminStateSaveResult = {
    ok: true,
    value: { revision: 1, objectPath: "not-rendered" },
  };
  return { loadBaseline: vi.fn(async () => baseline), save: vi.fn(async () => saved) };
}

describe("admin operator composition", () => {
  it("creates no read or write adapter when unconfigured", () => {
    const makeReadFacade = vi.fn();
    const makeWritePort = vi.fn();
    const composition = createAdminOperatorCompositionFromEnv(undefined, {
      makeReadFacade,
      makeWritePort,
      createCorrelationId: () => CID,
    });
    expect(composition.remoteController.getSnapshot().status).toBe("unconfigured");
    expect(composition.writeController).toBeNull();
    expect(makeReadFacade).not.toHaveBeenCalled();
    expect(makeWritePort).not.toHaveBeenCalled();
    composition.dispose();
  });

  it("keeps write absent when only read is enabled", () => {
    const source = readFacade();
    const makeWritePort = vi.fn();
    const composition = createAdminOperatorCompositionFromEnv(
      { ...ENV, VITE_DENN_ADMIN_WRITE_ENABLED: "false" },
      {
        makeReadFacade: vi.fn(async () => source.facade),
        makeWritePort,
        createCorrelationId: () => CID,
      },
    );
    expect(composition.writeController).toBeNull();
    expect(makeWritePort).not.toHaveBeenCalled();
    composition.dispose();
  });

  it("shares one auth observer and creates write only on explicit baseline load", async () => {
    const source = readFacade();
    const port = writePort();
    const makeReadFacade = vi.fn(async () => source.facade);
    const makeWritePort = vi.fn(async () => port);
    const composition = createAdminOperatorCompositionFromEnv(ENV, {
      makeReadFacade,
      makeWritePort,
      createCorrelationId: () => CID,
    });
    const write = composition.writeController;
    expect(write).not.toBeNull();
    if (write === null) return;
    const stopRead = composition.remoteController.subscribe(() => undefined);
    const stopWrite = write.subscribe(() => undefined);
    await Promise.resolve();
    expect(makeReadFacade).toHaveBeenCalledTimes(1);
    expect(source.observerCalls()).toBe(1);
    expect(makeWritePort).not.toHaveBeenCalled();

    await write.loadBaseline();
    expect(makeWritePort).toHaveBeenCalledTimes(1);
    expect(write.getSnapshot().status).toBe("ready-clean");
    await write.loadBaseline();
    expect(makeWritePort).toHaveBeenCalledTimes(1);

    stopRead();
    stopWrite();
    composition.dispose();
    expect(source.stopCalls()).toBe(1);
  });

  it("maps a factory rejection safely and retries only on another explicit load", async () => {
    const source = readFacade();
    const makeWritePort = vi
      .fn<() => Promise<AdminStateWritePort>>()
      .mockRejectedValueOnce({ message: "RAW-FACTORY-MESSAGE" })
      .mockResolvedValueOnce(writePort());
    const composition = createAdminOperatorCompositionFromEnv(ENV, {
      makeReadFacade: vi.fn(async () => source.facade),
      makeWritePort,
      createCorrelationId: () => CID,
    });
    const write = composition.writeController;
    expect(write).not.toBeNull();
    if (write === null) return;
    write.subscribe(() => undefined);
    await Promise.resolve();

    await write.loadBaseline();
    expect(write.getSnapshot()).toMatchObject({
      status: "load-error",
      errorCode: "UNEXPECTED_ADMIN_READ_ERROR",
    });
    expect(JSON.stringify(write.getSnapshot())).not.toContain("RAW-FACTORY-MESSAGE");
    expect(makeWritePort).toHaveBeenCalledTimes(1);

    await write.loadBaseline();
    expect(makeWritePort).toHaveBeenCalledTimes(2);
    expect(write.getSnapshot().status).toBe("ready-clean");
    composition.dispose();
  });
});

describe("lazy write port", () => {
  it("rejects save before a successful baseline without creating the factory", async () => {
    const factory = vi.fn(async () => writePort());
    const lazy = createLazyAdminStateWritePort(factory);
    const result = await lazy.save({
      correlationId: CID,
      expectedBase: 0,
      catalog: CATALOG,
    });
    expect(result).toMatchObject({ ok: false, error: { code: "WRITE_INVALID_INPUT" } });
    expect(factory).not.toHaveBeenCalled();
  });
});
