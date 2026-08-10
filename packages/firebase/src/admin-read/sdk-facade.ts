// The real Firebase adapter (spec 036 §2, §3). The SDK is loaded through dynamic imports INSIDE
// the factory, so importing this module does not pull the SDK in, does not initialize an app and
// does not touch the network. Unit tests never call this factory — they inject a synthetic facade.

import type { AdminFirebaseFacade, AdminReadObjectRequest } from "./facade";

/**
 * Public Firebase configuration, owned and validated by the app (spec 036 §3.1).
 * This package never reads `import.meta.env`; a config that is not fully present is simply never
 * handed over, and then no adapter exists at all.
 */
export interface AdminFirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly appId: string;
}

/** Creates the live adapter. Callers must only invoke this once a complete config exists. */
export async function createFirebaseAdminFacade(
  config: AdminFirebaseConfig,
): Promise<AdminFirebaseFacade> {
  const [{ initializeApp }, auth, storage] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/storage"),
  ]);

  const app = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    appId: config.appId,
  });
  const authInstance = auth.getAuth(app);
  const storageInstance = storage.getStorage(app);

  return {
    setPersistenceLocal: () => auth.setPersistence(authInstance, auth.browserLocalPersistence),
    onAuthStateChanged: (listener, onError) =>
      auth.onAuthStateChanged(
        authInstance,
        (user) =>
          // only `isAnonymous` crosses the boundary — no uid, email, token or User instance
          listener(user === null ? null : { isAnonymous: user.isAnonymous }),
        // the SDK reports observer failures here; without this the port would wait forever
        (error) => onError(error),
      ),
    signInWithEmailPassword: async (email, password) => {
      await auth.signInWithEmailAndPassword(authInstance, email, password);
    },
    signOut: () => auth.signOut(authInstance),
    readObjectBytes: async (request: AdminReadObjectRequest) => {
      const objectRef = storage.ref(storageInstance, request.objectPath);
      const buffer = await storage.getBytes(objectRef, request.maxDownloadSizeBytes);
      return new Uint8Array(buffer);
    },
  };
}
