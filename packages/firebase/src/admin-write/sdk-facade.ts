// The real Firebase adapter for the write path (spec 037 §5.1).
//
// The SDK is loaded through dynamic imports INSIDE the factory, so importing this module does not
// pull the SDK in, does not initialise an app and does not touch the network. Unit tests never call
// this factory — they inject a synthetic facade.

import { HEAD_COLLECTION_ID, HEAD_DOCUMENT_ID, OBJECT_CLAIM_COLLECTION_ID } from "./constants";
import type {
  AdminWriteClaimRequest,
  AdminWriteFacade,
  AdminWriteReadRequest,
  AdminWriteUploadRequest,
} from "./facade";
import type { AdminStateHead } from "./types";

/** Public Firebase configuration, owned and validated by the app (same rule as spec 036 §3.1). */
export interface AdminWriteFirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly appId: string;
}

/**
 * LOCAL EMULATOR WIRING ONLY.
 *
 * The app never passes this. It exists so the emulator gate can drive the SAME adapter the product
 * would use instead of a look-alike, and it is inert unless supplied. Supplying it requires a
 * `demo-` project id, which is checked before any SDK is even loaded.
 */
export interface AdminWriteEmulatorHosts {
  readonly authUrl: string;
  readonly firestoreHost: string;
  readonly firestorePort: number;
  readonly storageHost: string;
  readonly storagePort: number;
}

export interface AdminWriteFacadeOptions {
  readonly emulators?: AdminWriteEmulatorHosts;
}

const DEMO_PROJECT_PREFIX = "demo-";
const DEFAULT_APP_NAME = "[DEFAULT]";

/** Config keys that must agree with an already-initialised app before it is reused. */
const OWNED_CONFIG_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "appId",
] as const satisfies readonly (keyof AdminWriteFirebaseConfig)[];

export async function createFirebaseAdminWriteFacade(
  config: AdminWriteFirebaseConfig,
  options: AdminWriteFacadeOptions = {},
): Promise<AdminWriteFacade> {
  // Checked BEFORE any dynamic import, so a non-demo project reaches neither initializeApp nor
  // Auth, Firestore or Storage. Pointing emulator wiring at a real project id is the one mistake
  // that could let a local test talk to production.
  if (options.emulators !== undefined && !config.projectId.startsWith(DEMO_PROJECT_PREFIX)) {
    throw new Error(
      `admin-write refused emulator wiring: project id must begin with "${DEMO_PROJECT_PREFIX}"`,
    );
  }

  const [{ getApp, getApps, initializeApp }, auth, firestore, storage] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/storage"),
  ]);

  // ★ App ownership. The default app belongs to whoever created it first — in the admin shell that
  // is spec 036's read adapter. This path REUSES it and never initialises a second one:
  //   - a duplicate initializeApp of the default app is an SDK error, and
  //   - a separate named app would carry its OWN auth state, so a write could run under a session
  //     the operator never signed into. That split is the bug, not a workaround for it.
  // If an existing app disagrees with the config we were handed, we fail closed rather than write
  // into whatever project happens to be initialised.
  const existing = getApps().some((instance) => instance.name === DEFAULT_APP_NAME);
  let app: import("firebase/app").FirebaseApp;
  if (existing) {
    app = getApp();
    const current = app.options as Partial<Record<string, unknown>>;
    for (const key of OWNED_CONFIG_KEYS) {
      if (current[key] !== config[key]) {
        throw new Error(
          `admin-write refused to reuse the existing Firebase app: ${key} does not match`,
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

  const headRef = firestore.doc(db, HEAD_COLLECTION_ID, HEAD_DOCUMENT_ID);

  return {
    // Node 24 and every target browser expose this; it is on the facade so a fake can count calls.
    randomOperationId: () => crypto.randomUUID(),

    createObjectClaim: async (request: AdminWriteClaimRequest) => {
      const claimRef = firestore.doc(db, OBJECT_CLAIM_COLLECTION_ID, request.recId);
      await firestore.setDoc(claimRef, { claimedBase: request.claimedBase });
    },

    uploadJsonObject: async (request: AdminWriteUploadRequest) => {
      const objectRef = storage.ref(storageInstance, request.objectPath);
      const bytes = new TextEncoder().encode(request.json);
      // No overwrite is attempted or intended: the create-only rule refuses a second write to the
      // same path, which is what makes an SDK-level retry harmless rather than destructive.
      await storage.uploadBytes(objectRef, bytes, { contentType: request.contentType });
    },

    readObjectBytes: async (request: AdminWriteReadRequest) => {
      const objectRef = storage.ref(storageInstance, request.objectPath);
      const buffer = await storage.getBytes(objectRef, request.maxDownloadSizeBytes);
      return new Uint8Array(buffer);
    },

    getHead: async () => {
      const snapshot = await firestore.getDoc(headRef);
      return snapshot.exists() ? (snapshot.data() as unknown) : null;
    },

    runHeadTransaction: async (compute: (current: unknown | null) => AdminStateHead) => {
      // Called exactly once by the app. The SDK may run this callback several times; `compute` is
      // pure, so a re-run reads the head again and re-decides without any side effect.
      await firestore.runTransaction(db, async (tx) => {
        const snapshot = await tx.get(headRef);
        const current = snapshot.exists() ? (snapshot.data() as unknown) : null;
        const next = compute(current);
        tx.set(headRef, { ...next });
      });
    },
  };
}
