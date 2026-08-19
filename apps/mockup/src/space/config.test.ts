import { describe, expect, it } from "vitest";
import { resolveSpaceFirebaseConfig } from "./config";

const ENV = {
  VITE_DENN_SPACE_FIREBASE_ENABLED: "true",
  VITE_DENN_SPACE_FIREBASE_API_KEY: "key",
  VITE_DENN_SPACE_FIREBASE_AUTH_DOMAIN: "auth.example",
  VITE_DENN_SPACE_FIREBASE_PROJECT_ID: "project",
  VITE_DENN_SPACE_FIREBASE_STORAGE_BUCKET: "bucket",
  VITE_DENN_SPACE_FIREBASE_APP_ID: "app",
};

describe("space Firebase config", () => {
  it.each([undefined, {}, { ...ENV, VITE_DENN_SPACE_FIREBASE_ENABLED: "TRUE" }])(
    "requires the exact enable flag",
    (env) => expect(resolveSpaceFirebaseConfig(env)).toEqual({ status: "unconfigured" }),
  );

  it("rejects every partial or blank key", () => {
    for (const key of Object.keys(ENV).filter((key) => !key.endsWith("ENABLED"))) {
      expect(resolveSpaceFirebaseConfig({ ...ENV, [key]: " " })).toEqual({
        status: "unconfigured",
      });
    }
  });

  it("returns a trimmed complete config", () => {
    expect(
      resolveSpaceFirebaseConfig({ ...ENV, VITE_DENN_SPACE_FIREBASE_API_KEY: " key " }),
    ).toEqual({
      status: "configured",
      config: {
        apiKey: "key",
        authDomain: "auth.example",
        projectId: "project",
        storageBucket: "bucket",
        appId: "app",
      },
    });
  });
});
