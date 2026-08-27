// Firebase Web SDK adapter for the space V2 proof-asset read (spec 079 §5).
//
// Every SDK import stays inside the factory, so importing `@denn/firebase/space-read` initialises
// no app, obtains no service and touches no network. The customer document reader already owns the
// `denn-space-viewer` named app (Founder MM-1=A): this adapter REUSES it on an exact config match
// rather than creating a second app whose config could drift from the one the documents come from.

import type { SpaceV2ProofReadFirebaseFacade } from "./proof-facade";
import { SPACE_FIREBASE_APP_NAME, type SpaceReadFirebaseConfig } from "./sdk-facade";

export interface SpaceV2ProofReadEmulatorHosts {
  readonly storageHost: string;
  readonly storagePort: number;
}

export interface SpaceV2ProofReadFacadeOptions {
  readonly emulators?: SpaceV2ProofReadEmulatorHosts;
}

const DEMO_PROJECT_PREFIX = "demo-";
const OWNED_CONFIG_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "appId",
] as const satisfies readonly (keyof SpaceReadFirebaseConfig)[];

export async function createFirebaseSpaceV2ProofReadFacade(
  config: SpaceReadFirebaseConfig,
  options: SpaceV2ProofReadFacadeOptions = {},
): Promise<SpaceV2ProofReadFirebaseFacade> {
  // Runs BEFORE any dynamic import: emulator wiring against a production project id must not get
  // far enough to initialise an app or obtain a service.
  if (options.emulators !== undefined && !config.projectId.startsWith(DEMO_PROJECT_PREFIX)) {
    throw new Error(
      `space-v2-proof-read refused emulator wiring: project id must begin with "${DEMO_PROJECT_PREFIX}"`,
    );
  }

  // Auth and Firestore are deliberately absent. The proof object is public-read, so this adapter
  // never signs in — not even anonymously.
  const [{ getApp, getApps, initializeApp }, storage] = await Promise.all([
    import("firebase/app"),
    import("firebase/storage"),
  ]);

  const existing = getApps().some((candidate) => candidate.name === SPACE_FIREBASE_APP_NAME);
  let app: import("firebase/app").FirebaseApp;
  if (existing) {
    app = getApp(SPACE_FIREBASE_APP_NAME);
    const current = app.options as Partial<Record<string, unknown>>;
    for (const key of OWNED_CONFIG_KEYS) {
      // Fail closed BEFORE getStorage: a mismatched app would read assets from a different
      // project than the one that served the space document.
      if (current[key] !== config[key]) {
        throw new Error(
          `space-v2-proof-read refused the existing Firebase app: ${key} does not match`,
        );
      }
    }
  } else {
    // The admin shell's `[DEFAULT]` app is never looked up, reused or created here.
    app = initializeApp(
      {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        appId: config.appId,
      },
      SPACE_FIREBASE_APP_NAME,
    );
  }

  const storageInstance = storage.getStorage(app);
  if (options.emulators !== undefined) {
    storage.connectStorageEmulator(
      storageInstance,
      options.emulators.storageHost,
      options.emulators.storagePort,
    );
  }

  return {
    readMetadata: async (objectPath) => {
      const metadata = await storage.getMetadata(storage.ref(storageInstance, objectPath));
      // Only these three fields cross the seam. Generation, metageneration, bucket, download
      // tokens and the Storage reference itself stay inside the adapter.
      return {
        fullPath: metadata.fullPath,
        contentType: metadata.contentType,
        size: metadata.size,
      };
    },

    readBytes: (objectPath, maxBytes) =>
      storage.getBytes(storage.ref(storageInstance, objectPath), maxBytes),
  };
}
