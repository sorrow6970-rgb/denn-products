// App-ownership and emulator-guard verification for the real adapter (spec 037 correction round 1).
//
// The Firebase modules are mocked, so nothing here initialises a real app or touches the network.
// What is being pinned is which SDK entry points get called, and in which order — the adapter must
// reuse the app spec 036 already owns rather than standing up a second one with its own session.

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  apps: [] as { name: string; options: Record<string, unknown> }[],
  initializeAppCalls: 0,
  getAuthCalls: 0,
  getFirestoreCalls: 0,
  getStorageCalls: 0,
  connectCalls: [] as string[],
  setDocCalls: [] as { ref: unknown; data: unknown }[],
}));

vi.mock("firebase/app", () => ({
  getApps: () => state.apps,
  getApp: () => state.apps.find((a) => a.name === "[DEFAULT]"),
  initializeApp: (options: Record<string, unknown>) => {
    state.initializeAppCalls += 1;
    const app = { name: "[DEFAULT]", options };
    state.apps.push(app);
    return app;
  },
}));

vi.mock("firebase/auth", () => ({
  getAuth: () => {
    state.getAuthCalls += 1;
    return { kind: "auth" };
  },
  connectAuthEmulator: () => {
    state.connectCalls.push("auth");
  },
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: () => {
    state.getFirestoreCalls += 1;
    return { kind: "db" };
  },
  connectFirestoreEmulator: () => {
    state.connectCalls.push("firestore");
  },
  doc: (_db: unknown, collection: string, id: string) => ({ kind: "docRef", collection, id }),
  setDoc: async (ref: unknown, data: unknown) => {
    state.setDocCalls.push({ ref, data });
  },
  getDoc: async () => ({ exists: () => false }),
  runTransaction: async () => undefined,
}));

vi.mock("firebase/storage", () => ({
  getStorage: () => {
    state.getStorageCalls += 1;
    return { kind: "storage" };
  },
  connectStorageEmulator: () => {
    state.connectCalls.push("storage");
  },
  ref: () => ({ kind: "objectRef" }),
  uploadBytes: async () => undefined,
  getBytes: async () => new ArrayBuffer(0),
}));

import { createFirebaseAdminWriteFacade } from "./sdk-facade";

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

/** Simulates spec 036's read adapter having already created the default app. */
function seedExistingApp(overrides: Partial<typeof CONFIG> = {}): void {
  state.apps.push({ name: "[DEFAULT]", options: { ...CONFIG, ...overrides } });
}

beforeEach(() => {
  state.apps = [];
  state.initializeAppCalls = 0;
  state.getAuthCalls = 0;
  state.getFirestoreCalls = 0;
  state.getStorageCalls = 0;
  state.connectCalls = [];
  state.setDocCalls = [];
});

describe("app ownership", () => {
  it("initialises the default app when nothing has yet", async () => {
    await createFirebaseAdminWriteFacade(CONFIG);
    expect(state.initializeAppCalls).toBe(1);
    expect(state.apps).toHaveLength(1);
  });

  it("reuses the app spec 036 already owns instead of initialising a second one", async () => {
    seedExistingApp();
    await createFirebaseAdminWriteFacade(CONFIG);
    // A second app would carry its own auth state, so a write could run under a session the
    // operator never signed into.
    expect(state.initializeAppCalls).toBe(0);
    expect(state.apps).toHaveLength(1);
    expect(state.apps[0].name).toBe("[DEFAULT]");
  });

  it("never creates a named app alongside the default one", async () => {
    seedExistingApp();
    await createFirebaseAdminWriteFacade(CONFIG);
    expect(state.apps.filter((a) => a.name !== "[DEFAULT]")).toHaveLength(0);
  });

  it("fails closed when the existing app disagrees with the supplied config", async () => {
    seedExistingApp({ projectId: "some-other-project" });
    await expect(createFirebaseAdminWriteFacade(CONFIG)).rejects.toThrow(/projectId/);
    // and it does not fall back to standing up its own app
    expect(state.initializeAppCalls).toBe(0);
  });

  it("checks every owned config key, not just the project id", async () => {
    seedExistingApp({ storageBucket: "another-bucket.firebasestorage.app" });
    await expect(createFirebaseAdminWriteFacade(CONFIG)).rejects.toThrow(/storageBucket/);
  });

  it("takes Auth, Firestore and Storage from that one app", async () => {
    seedExistingApp();
    await createFirebaseAdminWriteFacade(CONFIG);
    expect(state.getAuthCalls).toBe(1);
    expect(state.getFirestoreCalls).toBe(1);
    expect(state.getStorageCalls).toBe(1);
  });
});

describe("emulator guard", () => {
  it("refuses emulator wiring for a non-demo project before touching the SDK", async () => {
    const production = { ...CONFIG, projectId: "denn-products" };
    await expect(
      createFirebaseAdminWriteFacade(production, { emulators: EMULATORS }),
    ).rejects.toThrow(/demo-/);
    // Nothing was initialised and no service was obtained: pointing emulator wiring at a real
    // project is the one mistake that could let a local run reach production.
    expect(state.initializeAppCalls).toBe(0);
    expect(state.getAuthCalls).toBe(0);
    expect(state.getFirestoreCalls).toBe(0);
    expect(state.getStorageCalls).toBe(0);
    expect(state.connectCalls).toEqual([]);
  });

  it("connects all three emulators for a demo project", async () => {
    await createFirebaseAdminWriteFacade(CONFIG, { emulators: EMULATORS });
    expect(state.connectCalls.sort()).toEqual(["auth", "firestore", "storage"]);
  });

  it("connects nothing when no emulator wiring is supplied", async () => {
    await createFirebaseAdminWriteFacade(CONFIG);
    expect(state.connectCalls).toEqual([]);
  });

  it("leaves a non-demo project alone when there is no emulator wiring", async () => {
    const production = { ...CONFIG, projectId: "denn-products" };
    await expect(createFirebaseAdminWriteFacade(production)).resolves.toBeDefined();
    expect(state.initializeAppCalls).toBe(1);
  });
});

describe("structure A REC adapter", () => {
  it("writes the exact UUID.json REC id and claimedBase", async () => {
    const facade = await createFirebaseAdminWriteFacade(CONFIG);
    await facade.createObjectClaim({
      recId: "11111111-2222-3333-4444-555555555555.json",
      claimedBase: 7,
    });
    expect(state.setDocCalls).toEqual([
      {
        ref: {
          kind: "docRef",
          collection: "rebuildAdminStateObjects",
          id: "11111111-2222-3333-4444-555555555555.json",
        },
        data: { claimedBase: 7 },
      },
    ]);
  });
});
