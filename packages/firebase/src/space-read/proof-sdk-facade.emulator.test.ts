// Opt-in integration verification for the spec 079 proof read adapter. This runs only under
// `firebase emulators:exec` with a `demo-` project and never belongs to the default unit suite.
//
// It uses the EXISTING `storage.emulator.rules` and `firebase.emulator.json` unchanged: the proof
// object path is public-read, approved-UID create-only, update/delete denied.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createEmulatorAccount,
  type EmulatorEnvironment,
  readEmulatorEnvironment,
} from "../admin-write/emulator-env";
import { createFirebaseSpaceV2WriteFacade } from "../space-write/sdk-facade";
import type { SpaceV2ProofReadFirebaseFacade } from "./proof-facade";
import { createSpaceV2ProofBytesReader } from "./proof-reader";
import { createFirebaseSpaceV2ProofReadFacade } from "./proof-sdk-facade";
import { SPACE_FIREBASE_APP_NAME } from "./sdk-facade";

const APPROVED_UID = "emulator-operator-DO-NOT-DEPLOY";
const PASSWORD = "emulator-password-0000";
const ASSET_ID = "a23e4567-e89b-42d3-a456-426614174079";
const OBJECT_PATH = `rebuild-space-assets/objects/${ASSET_ID}.png`;
// A minimal but real PNG signature + IHDR-shaped tail. Nothing here is decoded by this suite.
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);

let env: EmulatorEnvironment;
let proofFacade: SpaceV2ProofReadFirebaseFacade;

function viewerConfig(projectId: string, storageBucket: string) {
  return {
    apiKey: "demo-emulator-key",
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket,
    appId: "1:0:web:demo",
  };
}

beforeAll(async () => {
  env = readEmulatorEnvironment();
  expect(env.projectId).toBe("demo-denn-emulator");
  await createEmulatorAccount(env, APPROVED_UID, `${APPROVED_UID}@example.test`, PASSWORD);

  // --- seed, through the existing approved-operator write adapter (default app) ---
  const writeFacade = await createFirebaseSpaceV2WriteFacade(
    viewerConfig(env.projectId, env.storageBucket),
    {
      emulators: {
        authUrl: env.authUrl,
        firestoreHost: env.firestoreHost,
        firestorePort: env.firestorePort,
        storageHost: env.storageHost,
        storagePort: env.storagePort,
      },
    },
  );
  const [firebaseApp, auth] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const authInstance = auth.getAuth(firebaseApp.getApp());
  await auth.signInWithEmailAndPassword(authInstance, `${APPROVED_UID}@example.test`, PASSWORD);
  await writeFacade.uploadProofAsset({
    objectPath: OBJECT_PATH,
    bytes: PNG,
    contentType: "image/png",
  });

  // The operator session is dropped BEFORE the reads. Whatever the reader gets back is therefore
  // served by the public-read rule, not by a lingering privileged session.
  await auth.signOut(authInstance);

  proofFacade = await createFirebaseSpaceV2ProofReadFacade(
    viewerConfig(env.projectId, env.storageBucket),
    { emulators: { storageHost: env.storageHost, storagePort: env.storagePort } },
  );
}, 60_000);

afterAll(async () => {
  const firebaseApp = await import("firebase/app");
  // No app or emulator connection is left behind by this suite.
  await Promise.all(firebaseApp.getApps().map((app) => firebaseApp.deleteApp(app)));
});

describe("space V2 proof read adapter against local Rules", () => {
  it("owns the customer named app and never the default one", async () => {
    const firebaseApp = await import("firebase/app");
    const names = firebaseApp.getApps().map((app) => app.name);
    expect(names).toContain(SPACE_FIREBASE_APP_NAME);
    expect(names.filter((name) => name === SPACE_FIREBASE_APP_NAME)).toHaveLength(1);
  });

  it("reads the real metadata without a signed-in session", async () => {
    const metadata = await proofFacade.readMetadata(OBJECT_PATH);
    expect(metadata).toEqual({
      fullPath: OBJECT_PATH,
      contentType: "image/png",
      size: PNG.byteLength,
    });
  });

  it("returns the exact seeded bytes through the reader contract", async () => {
    const reader = createSpaceV2ProofBytesReader(proofFacade);
    const result = await reader.read({ objectPath: OBJECT_PATH, maxBytes: 1_048_576 });
    expect(result.contentType).toBe("image/png");
    expect([...result.bytes]).toEqual([...PNG]);

    // The result is detached: mutating it cannot affect a later read.
    result.bytes[0] = 0;
    const second = await reader.read({ objectPath: OBJECT_PATH, maxBytes: 1_048_576 });
    expect([...second.bytes]).toEqual([...PNG]);
  });

  it("refuses a ceiling below the object's real size before downloading it", async () => {
    const reader = createSpaceV2ProofBytesReader(proofFacade);
    await expect(
      reader.read({ objectPath: OBJECT_PATH, maxBytes: PNG.byteLength - 1 }),
    ).rejects.toMatchObject({ code: "SPACE_V2_PROOF_READ_METADATA_REJECTED" });
  });

  it("refuses a well-formed path that no object occupies", async () => {
    const reader = createSpaceV2ProofBytesReader(proofFacade);
    await expect(
      reader.read({
        objectPath: "rebuild-space-assets/objects/b23e4567-e89b-42d3-a456-426614174079.png",
        maxBytes: 1_048_576,
      }),
    ).rejects.toMatchObject({ code: "SPACE_V2_PROOF_READ_METADATA_UNAVAILABLE" });
  });
});
