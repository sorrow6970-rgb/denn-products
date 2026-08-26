// Opt-in integration verification for the spec 076 SDK facade. This runs only under
// `firebase emulators:exec` with a `demo-` project and never belongs to the default unit suite.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createEmulatorAccount,
  type EmulatorEnvironment,
  readEmulatorEnvironment,
  resetEmulatorState,
} from "../admin-write/emulator-env";
import type { SpaceV2IssueWriteFacade } from "./facade";
import { createFirebaseSpaceV2WriteFacade } from "./sdk-facade";
import type { SpaceV2PreparedIssueBundle } from "./types";
import { createSpaceV2IssueWritePort } from "./write-port";

const APPROVED_UID = "emulator-operator-DO-NOT-DEPLOY";
const PASSWORD = "emulator-password-0000";
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const SHA256 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const ENVELOPE = {
  salt: "AAECAwQFBgcICQoLDA0ODw==",
  iv: "EBESExQVFhcYGRob",
  ct: "AAECAwQFBgcICQoLDA0ODw==",
};

const FIRST_TOKEN = "623e4567-e89b-42d3-a456-426614174001";
const FIRST_ASSET = "723e4567-e89b-42d3-a456-426614174002";
const SECOND_TOKEN = "823e4567-e89b-42d3-a456-426614174003";
const SECOND_ASSET = "923e4567-e89b-42d3-a456-426614174004";

let env: EmulatorEnvironment;
let facade: SpaceV2IssueWriteFacade;
let app: import("firebase/app").FirebaseApp;
let authInstance: import("firebase/auth").Auth;
let db: import("firebase/firestore").Firestore;
let storageInstance: import("firebase/storage").FirebaseStorage;

function bundle(token: string, assetId: string): SpaceV2PreparedIssueBundle {
  const document = { schema: "space-v2" as const, enc: { ...ENVELOPE } };
  return {
    token,
    copyProofDescriptor: () => ({
      objectPath: `rebuild-space-assets/objects/${assetId}.png`,
      sha256: SHA256,
      byteLength: PNG.byteLength,
      contentType: "image/png",
      intrinsicWidth: 1,
      intrinsicHeight: 1,
    }),
    copyUploadBytes: () => new Uint8Array(PNG),
    copyDocument: () => ({ schema: document.schema, enc: { ...document.enc } }),
  };
}

function port(usingFacade: SpaceV2IssueWriteFacade = facade) {
  return createSpaceV2IssueWritePort({
    facade: usingFacade,
    auth: {
      currentOperator: () =>
        authInstance.currentUser === null
          ? { status: "signed-out" as const }
          : { status: "authenticated" as const },
    },
  });
}

beforeAll(async () => {
  env = readEmulatorEnvironment();
  expect(env.projectId).toBe("demo-denn-emulator");
  await resetEmulatorState(env);
  await createEmulatorAccount(env, APPROVED_UID, `${APPROVED_UID}@example.test`, PASSWORD);

  facade = await createFirebaseSpaceV2WriteFacade(
    {
      apiKey: "demo-emulator-key",
      authDomain: `${env.projectId}.firebaseapp.com`,
      projectId: env.projectId,
      storageBucket: env.storageBucket,
      appId: "1:0:web:demo",
    },
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

  const firebaseApp = await import("firebase/app");
  const auth = await import("firebase/auth");
  const firestore = await import("firebase/firestore");
  const storage = await import("firebase/storage");
  app = firebaseApp.getApp();
  authInstance = auth.getAuth(app);
  db = firestore.getFirestore(app);
  storageInstance = storage.getStorage(app);
  await auth.signInWithEmailAndPassword(authInstance, `${APPROVED_UID}@example.test`, PASSWORD);
}, 60_000);

afterAll(async () => {
  const [auth, firebaseApp] = await Promise.all([import("firebase/auth"), import("firebase/app")]);
  if (authInstance !== undefined) await auth.signOut(authInstance);
  if (app !== undefined) await firebaseApp.deleteApp(app);
});

describe("space V2 SDK facade against local Rules", () => {
  it("issues through the real adapter and persists exact bytes and document", async () => {
    const result = await port().issue({
      correlationId: "07600001",
      bundle: bundle(FIRST_TOKEN, FIRST_ASSET),
    });
    expect(result).toEqual({
      ok: true,
      value: {
        token: FIRST_TOKEN,
        objectPath: `rebuild-space-assets/objects/${FIRST_ASSET}.png`,
      },
    });

    const [firestore, storage] = await Promise.all([
      import("firebase/firestore"),
      import("firebase/storage"),
    ]);
    const document = await firestore.getDocFromServer(firestore.doc(db, "spaces", FIRST_TOKEN));
    expect(document.data()).toEqual({ schema: "space-v2", enc: ENVELOPE });
    const bytes = await storage.getBytes(
      storage.ref(storageInstance, `rebuild-space-assets/objects/${FIRST_ASSET}.png`),
    );
    expect(new Uint8Array(bytes)).toEqual(PNG);
  });

  it("reconciles a server-successful create whose caller outcome is unknown", async () => {
    const uncertainFacade: SpaceV2IssueWriteFacade = {
      uploadProofAsset: (request) => facade.uploadProofAsset(request),
      createSpaceDocument: async (request) => {
        await facade.createSpaceDocument(request);
        throw { code: "firestore/unavailable" };
      },
      readSpaceDocumentFromServer: (token) => facade.readSpaceDocumentFromServer(token),
    };
    const result = await port(uncertainFacade).issue({
      correlationId: "07600002",
      bundle: bundle(SECOND_TOKEN, SECOND_ASSET),
    });
    expect(result).toEqual({
      ok: true,
      value: {
        token: SECOND_TOKEN,
        objectPath: `rebuild-space-assets/objects/${SECOND_ASSET}.png`,
      },
    });
  });
});
