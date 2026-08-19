import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  apps: [] as { name: string; options: Record<string, unknown> }[],
  initialize: [] as { options: Record<string, unknown>; name: string }[],
  firestoreApps: [] as unknown[],
  docCalls: [] as { collection: string; token: string }[],
  snapshot: { exists: true, data: { schema: "space-v1" } } as
    | { exists: true; data: unknown }
    | { exists: false },
}));

vi.mock("firebase/app", () => ({
  getApps: () => state.apps,
  getApp: (name: string) => state.apps.find((app) => app.name === name),
  initializeApp: (options: Record<string, unknown>, name: string) => {
    state.initialize.push({ options, name });
    const app = { name, options };
    state.apps.push(app);
    return app;
  },
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: (app: unknown) => {
    state.firestoreApps.push(app);
    return { app };
  },
  doc: (_db: unknown, collection: string, token: string) => {
    state.docCalls.push({ collection, token });
    return { collection, token };
  },
  getDoc: async () => ({
    exists: () => state.snapshot.exists,
    data: () => (state.snapshot.exists ? state.snapshot.data : undefined),
  }),
  getDocFromServer: () => {
    throw new Error("server-only API must not be used");
  },
}));

import { createFirebaseSpaceReadFacade, SPACE_FIREBASE_APP_NAME } from "./sdk-facade";

const CONFIG = {
  apiKey: "key",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo.firebasestorage.app",
  appId: "app",
};

beforeEach(() => {
  state.apps = [];
  state.initialize = [];
  state.firestoreApps = [];
  state.docCalls = [];
  state.snapshot = { exists: true, data: { schema: "space-v1" } };
});

describe("space read Firebase facade", () => {
  it("initialises the legacy named app and uses getDoc on spaces/{token}", async () => {
    const facade = await createFirebaseSpaceReadFacade(CONFIG);
    expect(state.initialize).toEqual([{ options: CONFIG, name: "denn-space-viewer" }]);
    await expect(facade.readDocument("legacy-token")).resolves.toEqual({
      exists: true,
      data: { schema: "space-v1" },
    });
    expect(state.docCalls).toEqual([{ collection: "spaces", token: "legacy-token" }]);
  });

  it("reuses the named app with matching config and never initialises the default app", async () => {
    state.apps.push({ name: SPACE_FIREBASE_APP_NAME, options: { ...CONFIG } });
    await createFirebaseSpaceReadFacade(CONFIG);
    expect(state.initialize).toEqual([]);
    expect(state.apps.some((app) => app.name === "[DEFAULT]")).toBe(false);
  });

  it("fails closed on named-app config mismatch", async () => {
    state.apps.push({
      name: SPACE_FIREBASE_APP_NAME,
      options: { ...CONFIG, projectId: "other-project" },
    });
    await expect(createFirebaseSpaceReadFacade(CONFIG)).rejects.toThrow(/projectId/);
    expect(state.initialize).toEqual([]);
    expect(state.firestoreApps).toEqual([]);
  });

  it("does not reuse or disturb an unrelated default app", async () => {
    state.apps.push({ name: "[DEFAULT]", options: { ...CONFIG, projectId: "admin-project" } });
    await createFirebaseSpaceReadFacade(CONFIG);
    expect(state.initialize).toHaveLength(1);
    expect(state.initialize[0]?.name).toBe(SPACE_FIREBASE_APP_NAME);
    expect(state.apps.filter((app) => app.name === "[DEFAULT]")).toHaveLength(1);
  });

  it("returns an explicit missing snapshot", async () => {
    state.snapshot = { exists: false };
    const facade = await createFirebaseSpaceReadFacade(CONFIG);
    await expect(facade.readDocument("missing")).resolves.toEqual({ exists: false });
  });
});
