import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  apps: [] as { name: string; options: Record<string, unknown> }[],
  initialize: [] as { options: Record<string, unknown>; name: string }[],
  getAppsCalls: 0,
  storageApps: [] as unknown[],
  connects: [] as { host: string; port: number; instance: unknown }[],
  refs: [] as { instance: unknown; path: string }[],
  metadataRefs: [] as unknown[],
  byteCalls: [] as { ref: unknown; maxBytes: unknown }[],
  // A FullMetadata carries far more than the three fields the seam is allowed to expose.
  metadata: {
    fullPath: "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png",
    contentType: "image/png",
    size: 8,
    bucket: "demo-denn-emulator.firebasestorage.app",
    generation: "1",
    metageneration: "1",
    name: "123e4567-e89b-42d3-a456-426614174000.png",
    md5Hash: "ignored",
  } as Record<string, unknown>,
  buffer: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer as ArrayBuffer,
  // Auth and Firestore must never be pulled in by the public-read proof adapter.
  importedModules: [] as string[],
}));

vi.mock("firebase/app", () => ({
  getApps: () => {
    state.getAppsCalls += 1;
    return state.apps;
  },
  getApp: (name: string) => state.apps.find((app) => app.name === name),
  initializeApp: (options: Record<string, unknown>, name: string) => {
    state.initialize.push({ options, name });
    const app = { name, options };
    state.apps.push(app);
    return app;
  },
}));

vi.mock("firebase/storage", () => ({
  getStorage: (app: unknown) => {
    state.storageApps.push(app);
    return { app };
  },
  connectStorageEmulator: (instance: unknown, host: string, port: number) => {
    state.connects.push({ instance, host, port });
  },
  ref: (instance: unknown, path: string) => {
    state.refs.push({ instance, path });
    return { instance, path };
  },
  getMetadata: async (reference: unknown) => {
    state.metadataRefs.push(reference);
    return state.metadata;
  },
  getBytes: async (reference: unknown, maxBytes: unknown) => {
    state.byteCalls.push({ ref: reference, maxBytes });
    return state.buffer;
  },
  getDownloadURL: () => {
    throw new Error("download URLs must not be used");
  },
}));

vi.mock("firebase/auth", () => {
  state.importedModules.push("firebase/auth");
  return {};
});

vi.mock("firebase/firestore", () => {
  state.importedModules.push("firebase/firestore");
  return {};
});

import { SPACE_FIREBASE_APP_NAME } from "./sdk-facade";
import { createFirebaseSpaceV2ProofReadFacade } from "./proof-sdk-facade";

// Captured before any test body runs: importing the module must not have touched Firebase.
const AT_IMPORT = {
  initialize: state.initialize.length,
  getAppsCalls: state.getAppsCalls,
  storageApps: state.storageApps.length,
  connects: state.connects.length,
  refs: state.refs.length,
  importedModules: [...state.importedModules],
};

const OBJECT_PATH = "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png";
const MAX_BYTES = 20_971_519;
const CONFIG = {
  apiKey: "key",
  authDomain: "demo-denn-emulator.firebaseapp.com",
  projectId: "demo-denn-emulator",
  storageBucket: "demo-denn-emulator.firebasestorage.app",
  appId: "1:0:web:demo",
};

beforeEach(() => {
  state.apps = [];
  state.initialize = [];
  state.getAppsCalls = 0;
  state.storageApps = [];
  state.connects = [];
  state.refs = [];
  state.metadataRefs = [];
  state.byteCalls = [];
  state.importedModules = [];
});

describe("space V2 proof read Firebase facade", () => {
  it("is inert at module import time", () => {
    expect(AT_IMPORT).toEqual({
      initialize: 0,
      getAppsCalls: 0,
      storageApps: 0,
      connects: 0,
      refs: 0,
      importedModules: [],
    });
  });

  it("initialises exactly the customer named app and never a default or extra app", async () => {
    await createFirebaseSpaceV2ProofReadFacade(CONFIG);
    expect(state.initialize).toEqual([{ options: CONFIG, name: SPACE_FIREBASE_APP_NAME }]);
    expect(state.apps.map((app) => app.name)).toEqual([SPACE_FIREBASE_APP_NAME]);
  });

  it("reuses the existing named app on an exact config match", async () => {
    state.apps.push({ name: SPACE_FIREBASE_APP_NAME, options: { ...CONFIG } });
    await createFirebaseSpaceV2ProofReadFacade(CONFIG);
    expect(state.initialize).toEqual([]);
    expect(state.storageApps).toHaveLength(1);
  });

  it("leaves an unrelated default app untouched", async () => {
    state.apps.push({ name: "[DEFAULT]", options: { ...CONFIG, projectId: "admin-project" } });
    await createFirebaseSpaceV2ProofReadFacade(CONFIG);
    expect(state.initialize).toHaveLength(1);
    expect(state.initialize[0]?.name).toBe(SPACE_FIREBASE_APP_NAME);
    expect(state.apps.filter((app) => app.name === "[DEFAULT]")).toHaveLength(1);
    expect(state.storageApps).toEqual([{ name: SPACE_FIREBASE_APP_NAME, options: CONFIG }]);
  });

  for (const key of ["apiKey", "authDomain", "projectId", "storageBucket", "appId"] as const) {
    it(`fails closed before getStorage when the existing app's ${key} differs`, async () => {
      state.apps.push({
        name: SPACE_FIREBASE_APP_NAME,
        options: { ...CONFIG, [key]: "different-value" },
      });
      await expect(createFirebaseSpaceV2ProofReadFacade(CONFIG)).rejects.toThrow(key);
      expect(state.initialize).toEqual([]);
      expect(state.storageApps).toEqual([]);
      expect(state.refs).toEqual([]);
      expect(state.metadataRefs).toEqual([]);
      expect(state.byteCalls).toEqual([]);
    });
  }

  it("refuses a non-demo emulator option before any SDK call", async () => {
    await expect(
      createFirebaseSpaceV2ProofReadFacade(
        { ...CONFIG, projectId: "denn-products" },
        { emulators: { storageHost: "127.0.0.1", storagePort: 9199 } },
      ),
    ).rejects.toThrow(/demo-/);
    expect(state.getAppsCalls).toBe(0);
    expect(state.initialize).toEqual([]);
    expect(state.storageApps).toEqual([]);
    expect(state.connects).toEqual([]);
  });

  it("connects only Storage to the emulator and never Auth or Firestore", async () => {
    await createFirebaseSpaceV2ProofReadFacade(CONFIG, {
      emulators: { storageHost: "127.0.0.1", storagePort: 9199 },
    });
    expect(state.connects).toEqual([
      {
        instance: { app: { name: SPACE_FIREBASE_APP_NAME, options: CONFIG } },
        host: "127.0.0.1",
        port: 9199,
      },
    ]);
    expect(state.importedModules).toEqual([]);
  });

  it("does not connect the emulator when no option is given", async () => {
    await createFirebaseSpaceV2ProofReadFacade(CONFIG);
    expect(state.connects).toEqual([]);
  });

  it("copies exactly the three metadata fields and drops the rest", async () => {
    const facade = await createFirebaseSpaceV2ProofReadFacade(CONFIG);
    const metadata = await facade.readMetadata(OBJECT_PATH);
    expect(metadata).toEqual({
      fullPath: OBJECT_PATH,
      contentType: "image/png",
      size: 8,
    });
    expect(Object.keys(metadata)).toEqual(["fullPath", "contentType", "size"]);
    expect(state.refs).toEqual([{ instance: { app: state.storageApps[0] }, path: OBJECT_PATH }]);
  });

  it("reads bytes through the exact path ref with the caller's ceiling", async () => {
    const facade = await createFirebaseSpaceV2ProofReadFacade(CONFIG);
    const bytes = await facade.readBytes(OBJECT_PATH, MAX_BYTES);
    expect(bytes).toBe(state.buffer);
    expect(state.byteCalls).toEqual([
      { ref: { instance: { app: state.storageApps[0] }, path: OBJECT_PATH }, maxBytes: MAX_BYTES },
    ]);
    expect(state.metadataRefs).toEqual([]);
  });
});
