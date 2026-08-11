// The real Firebase adapter for the write path (spec 037 §5.1).
//
// The SDK is loaded through dynamic imports INSIDE the factory, so importing this module does not
// pull the SDK in, does not initialise an app and does not touch the network. Unit tests never call
// this factory — they inject a synthetic facade.

import { HEAD_COLLECTION_ID, HEAD_DOCUMENT_ID } from "./constants";
import type { AdminWriteFacade, AdminWriteReadRequest, AdminWriteUploadRequest } from "./facade";
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
 * would use instead of a look-alike, and it is inert unless supplied. A run that provides it must
 * also use a `demo-` project id, which has no real credentials attached.
 */
export interface AdminWriteEmulatorHosts {
  readonly authUrl: string;
  readonly firestoreHost: string;
  readonly firestorePort: number;
  readonly storageHost: string;
  readonly storagePort: number;
}

export interface AdminWriteFacadeOptions {
  /** Distinct name per Firebase app instance; needed when a test drives two identities at once. */
  readonly appName?: string;
  readonly emulators?: AdminWriteEmulatorHosts;
}

export async function createFirebaseAdminWriteFacade(
  config: AdminWriteFirebaseConfig,
  options: AdminWriteFacadeOptions = {},
): Promise<AdminWriteFacade> {
  const [{ initializeApp }, auth, firestore, storage] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/storage"),
  ]);

  const app = initializeApp(
    {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      appId: config.appId,
    },
    options.appName,
  );

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
