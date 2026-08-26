// Unit verification for the real Firebase adapter. Firebase modules are mocked, so this file has
// no network and never initialises a real app.

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  apps: [] as { name: string; options: Record<string, unknown> }[],
  initializeAppCalls: 0,
  getAuthApps: [] as unknown[],
  getFirestoreApps: [] as unknown[],
  getStorageApps: [] as unknown[],
  connectCalls: [] as string[],
  uploadCalls: [] as { ref: unknown; bytes: Uint8Array; metadata: unknown }[],
  setDocCalls: [] as { ref: unknown; data: unknown }[],
  getDocFromServerCalls: [] as unknown[],
  getDocCalls: 0,
  serverSnapshot: {
    exists: true,
    data: { schema: "space-v2", enc: { salt: "salt", iv: "iv", ct: "ct" } },
    fromCache: false,
    hasPendingWrites: false,
  },
}));

vi.mock("firebase/app", () => ({
  getApps: () => state.apps,
  getApp: () => state.apps.find((app) => app.name === "[DEFAULT]"),
  initializeApp: (options: Record<string, unknown>) => {
    state.initializeAppCalls += 1;
    const app = { name: "[DEFAULT]", options };
    state.apps.push(app);
    return app;
  },
}));

vi.mock("firebase/auth", () => ({
  getAuth: (app: unknown) => {
    state.getAuthApps.push(app);
    return { kind: "auth", app };
  },
  connectAuthEmulator: () => state.connectCalls.push("auth"),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: (app: unknown) => {
    state.getFirestoreApps.push(app);
    return { kind: "firestore", app };
  },
  connectFirestoreEmulator: () => state.connectCalls.push("firestore"),
  doc: (_db: unknown, collection: string, id: string) => ({ collection, id }),
  setDoc: async (ref: unknown, data: unknown) => state.setDocCalls.push({ ref, data }),
  getDoc: async () => {
    state.getDocCalls += 1;
    return { exists: () => false };
  },
  getDocFromServer: async (ref: unknown) => {
    state.getDocFromServerCalls.push(ref);
    return {
      exists: () => state.serverSnapshot.exists,
      data: () => state.serverSnapshot.data,
      metadata: {
        fromCache: state.serverSnapshot.fromCache,
        hasPendingWrites: state.serverSnapshot.hasPendingWrites,
      },
    };
  },
}));

vi.mock("firebase/storage", () => ({
  getStorage: (app: unknown) => {
    state.getStorageApps.push(app);
    return { kind: "storage", app };
  },
  connectStorageEmulator: () => state.connectCalls.push("storage"),
  ref: (_storage: unknown, path: string) => ({ path }),
  uploadBytes: async (ref: unknown, bytes: Uint8Array, metadata: unknown) => {
    state.uploadCalls.push({ ref, bytes, metadata });
    return { metadata: { size: bytes.byteLength, ignored: "raw metadata" } };
  },
}));

import { createFirebaseSpaceV2WriteFacade } from "./sdk-facade";

const CONFIG = {
  apiKey: "demo-key",
  authDomain: "demo-denn-emulator.firebaseapp.com",
  projectId: "demo-denn-emulator",
  storageBucket: "demo-denn-emulator.firebasestorage.app",
  appId: "1:0:web:demo",
};

const EMULATORS = {
  authUrl: "http://127.0.0.1:9099",
  firestoreHost: "127.0.0.1",
  firestorePort: 8080,
  storageHost: "127.0.0.1",
  storagePort: 9199,
};

const DOCUMENT = {
  schema: "space-v2" as const,
  enc: { salt: "salt", iv: "iv", ct: "ct" },
};

function seedExistingApp(overrides: Partial<typeof CONFIG> = {}): void {
  state.apps.push({ name: "[DEFAULT]", options: { ...CONFIG, ...overrides } });
}

beforeEach(() => {
  state.apps = [];
  state.initializeAppCalls = 0;
  state.getAuthApps = [];
  state.getFirestoreApps = [];
  state.getStorageApps = [];
  state.connectCalls = [];
  state.uploadCalls = [];
  state.setDocCalls = [];
  state.getDocFromServerCalls = [];
  state.getDocCalls = 0;
  state.serverSnapshot = {
    exists: true,
    data: { schema: "space-v2", enc: { salt: "salt", iv: "iv", ct: "ct" } },
    fromCache: false,
    hasPendingWrites: false,
  };
});

describe("space V2 SDK adapter ownership", () => {
  it("is inert until the factory is called", () => {
    expect(state.initializeAppCalls).toBe(0);
    expect(state.getAuthApps).toEqual([]);
    expect(state.getFirestoreApps).toEqual([]);
    expect(state.getStorageApps).toEqual([]);
  });

  it("initialises one default app and takes every service from it", async () => {
    await createFirebaseSpaceV2WriteFacade(CONFIG);
    expect(state.initializeAppCalls).toBe(1);
    expect(state.apps).toHaveLength(1);
    expect(state.apps[0].name).toBe("[DEFAULT]");
    expect(state.getAuthApps).toEqual([state.apps[0]]);
    expect(state.getFirestoreApps).toEqual([state.apps[0]]);
    expect(state.getStorageApps).toEqual([state.apps[0]]);
  });

  it("reuses the existing default app and creates no named app", async () => {
    seedExistingApp();
    await createFirebaseSpaceV2WriteFacade(CONFIG);
    expect(state.initializeAppCalls).toBe(0);
    expect(state.apps).toHaveLength(1);
    expect(state.apps.filter((app) => app.name !== "[DEFAULT]")).toEqual([]);
  });

  it("fails closed for every owned config mismatch", async () => {
    for (const key of ["apiKey", "authDomain", "projectId", "storageBucket", "appId"] as const) {
      state.apps = [];
      state.getAuthApps = [];
      state.getFirestoreApps = [];
      state.getStorageApps = [];
      seedExistingApp({ [key]: `wrong-${key}` });
      await expect(createFirebaseSpaceV2WriteFacade(CONFIG)).rejects.toThrow(key);
      expect(state.initializeAppCalls).toBe(0);
      expect(state.getAuthApps).toEqual([]);
      expect(state.getFirestoreApps).toEqual([]);
      expect(state.getStorageApps).toEqual([]);
    }
  });
});

describe("space V2 SDK adapter emulator guard", () => {
  it("rejects non-demo wiring before app or service initialisation", async () => {
    await expect(
      createFirebaseSpaceV2WriteFacade(
        { ...CONFIG, projectId: "denn-products" },
        { emulators: EMULATORS },
      ),
    ).rejects.toThrow(/demo-/);
    expect(state.initializeAppCalls).toBe(0);
    expect(state.getAuthApps).toEqual([]);
    expect(state.getFirestoreApps).toEqual([]);
    expect(state.getStorageApps).toEqual([]);
    expect(state.connectCalls).toEqual([]);
  });

  it("connects all three local emulators only when requested", async () => {
    await createFirebaseSpaceV2WriteFacade(CONFIG, { emulators: EMULATORS });
    expect(state.connectCalls.sort()).toEqual(["auth", "firestore", "storage"]);

    state.connectCalls = [];
    state.apps = [];
    await createFirebaseSpaceV2WriteFacade(CONFIG);
    expect(state.connectCalls).toEqual([]);
  });
});

describe("space V2 SDK facade mapping", () => {
  it("uploads a detached byte copy and returns only metadata.size", async () => {
    const facade = await createFirebaseSpaceV2WriteFacade(CONFIG);
    const source = new Uint8Array([1, 2, 3]);
    const receipt = await facade.uploadProofAsset({
      objectPath: "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png",
      bytes: source,
      contentType: "image/png",
    });
    source[0] = 9;
    expect(receipt).toEqual({ byteLength: 3 });
    expect(state.uploadCalls).toEqual([
      {
        ref: {
          path: "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png",
        },
        bytes: new Uint8Array([1, 2, 3]),
        metadata: { contentType: "image/png" },
      },
    ]);
  });

  it("creates only the exact V2 document at spaces/token", async () => {
    const facade = await createFirebaseSpaceV2WriteFacade(CONFIG);
    await facade.createSpaceDocument({
      token: "123e4567-e89b-42d3-b456-426614174001",
      document: DOCUMENT,
    });
    expect(state.setDocCalls).toEqual([
      {
        ref: { collection: "spaces", id: "123e4567-e89b-42d3-b456-426614174001" },
        data: DOCUMENT,
      },
    ]);
  });

  it("uses only getDocFromServer and preserves server metadata flags", async () => {
    state.serverSnapshot.fromCache = true;
    state.serverSnapshot.hasPendingWrites = true;
    const facade = await createFirebaseSpaceV2WriteFacade(CONFIG);
    await expect(
      facade.readSpaceDocumentFromServer("123e4567-e89b-42d3-b456-426614174001"),
    ).resolves.toEqual({
      exists: true,
      data: state.serverSnapshot.data,
      fromCache: true,
      hasPendingWrites: true,
    });
    expect(state.getDocFromServerCalls).toEqual([
      { collection: "spaces", id: "123e4567-e89b-42d3-b456-426614174001" },
    ]);
    expect(state.getDocCalls).toBe(0);
  });

  it("omits data for a server-confirmed missing document", async () => {
    state.serverSnapshot.exists = false;
    const facade = await createFirebaseSpaceV2WriteFacade(CONFIG);
    await expect(
      facade.readSpaceDocumentFromServer("123e4567-e89b-42d3-b456-426614174001"),
    ).resolves.toEqual({ exists: false, fromCache: false, hasPendingWrites: false });
  });
});
