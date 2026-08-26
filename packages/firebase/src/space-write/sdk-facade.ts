// Firebase Web SDK adapter for the space V2 issue path (spec 076).
//
// Every SDK import stays inside the factory. Importing `@denn/firebase/space-write` therefore does
// not initialise Firebase, obtain Auth/Firestore/Storage or touch the network.

import type { SpaceV2IssueWriteFacade } from "./facade";

export interface SpaceV2WriteFirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly appId: string;
}

export interface SpaceV2WriteEmulatorHosts {
  readonly authUrl: string;
  readonly firestoreHost: string;
  readonly firestorePort: number;
  readonly storageHost: string;
  readonly storagePort: number;
}

export interface SpaceV2WriteFacadeOptions {
  readonly emulators?: SpaceV2WriteEmulatorHosts;
}

const DEMO_PROJECT_PREFIX = "demo-";
const DEFAULT_APP_NAME = "[DEFAULT]";
const SPACES_COLLECTION_ID = "spaces";
const OWNED_CONFIG_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "appId",
] as const satisfies readonly (keyof SpaceV2WriteFirebaseConfig)[];

export async function createFirebaseSpaceV2WriteFacade(
  config: SpaceV2WriteFirebaseConfig,
  options: SpaceV2WriteFacadeOptions = {},
): Promise<SpaceV2IssueWriteFacade> {
  // This guard runs before a dynamic import. Emulator wiring with a production project id must not
  // get far enough to initialise an app or obtain any Firebase service.
  if (options.emulators !== undefined && !config.projectId.startsWith(DEMO_PROJECT_PREFIX)) {
    throw new Error(
      `space-v2-write refused emulator wiring: project id must begin with "${DEMO_PROJECT_PREFIX}"`,
    );
  }

  const [{ getApp, getApps, initializeApp }, auth, firestore, storage] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/storage"),
  ]);

  // The admin shell's default app owns the signed-in operator session. A named app would have a
  // separate Auth state, so it is not an acceptable workaround for duplicate initialisation.
  const hasDefaultApp = getApps().some((candidate) => candidate.name === DEFAULT_APP_NAME);
  let app: import("firebase/app").FirebaseApp;
  if (hasDefaultApp) {
    app = getApp();
    const current = app.options as Partial<Record<string, unknown>>;
    for (const key of OWNED_CONFIG_KEYS) {
      if (current[key] !== config[key]) {
        throw new Error(
          `space-v2-write refused to reuse the existing Firebase app: ${key} does not match`,
        );
      }
    }
  } else {
    app = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      appId: config.appId,
    });
  }

  const authInstance = auth.getAuth(app);
  const db = firestore.getFirestore(app);
  const storageInstance = storage.getStorage(app);

  if (options.emulators !== undefined) {
    const hosts = options.emulators;
    auth.connectAuthEmulator(authInstance, hosts.authUrl, { disableWarnings: true });
    firestore.connectFirestoreEmulator(db, hosts.firestoreHost, hosts.firestorePort);
    storage.connectStorageEmulator(storageInstance, hosts.storageHost, hosts.storagePort);
  }

  const spaceDocumentRef = (token: string) => firestore.doc(db, SPACES_COLLECTION_ID, token);

  return {
    uploadProofAsset: async (request) => {
      const objectRef = storage.ref(storageInstance, request.objectPath);
      const result = await storage.uploadBytes(objectRef, new Uint8Array(request.bytes), {
        contentType: request.contentType,
      });
      return { byteLength: result.metadata.size };
    },

    createSpaceDocument: async (request) => {
      await firestore.setDoc(spaceDocumentRef(request.token), {
        schema: request.document.schema,
        enc: {
          salt: request.document.enc.salt,
          iv: request.document.enc.iv,
          ct: request.document.enc.ct,
        },
      });
    },

    readSpaceDocumentFromServer: async (token) => {
      const snapshot = await firestore.getDocFromServer(spaceDocumentRef(token));
      const base = {
        exists: snapshot.exists(),
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      };
      return snapshot.exists() ? { ...base, data: snapshot.data() } : base;
    },
  };
}
