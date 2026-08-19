import type { SpaceReadFirebaseFacade } from "./facade";

export const SPACE_FIREBASE_APP_NAME = "denn-space-viewer";
const SPACES_COLLECTION = "spaces";

export interface SpaceReadFirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly appId: string;
}

const CONFIG_KEYS = ["apiKey", "authDomain", "projectId", "storageBucket", "appId"] as const;

export async function createFirebaseSpaceReadFacade(
  config: SpaceReadFirebaseConfig,
): Promise<SpaceReadFirebaseFacade> {
  const [{ getApp, getApps, initializeApp }, firestore] = await Promise.all([
    import("firebase/app"),
    import("firebase/firestore"),
  ]);

  const existing = getApps().some((app) => app.name === SPACE_FIREBASE_APP_NAME);
  const app = existing
    ? getApp(SPACE_FIREBASE_APP_NAME)
    : initializeApp(config, SPACE_FIREBASE_APP_NAME);
  if (existing) {
    for (const key of CONFIG_KEYS) {
      if (app.options[key] !== config[key]) {
        throw new Error(`space-read refused existing Firebase app: ${key} does not match`);
      }
    }
  }
  const db = firestore.getFirestore(app);
  return {
    async readDocument(token) {
      const snapshot = await firestore.getDoc(firestore.doc(db, SPACES_COLLECTION, token));
      return snapshot.exists() ? { exists: true, data: snapshot.data() } : { exists: false };
    },
  };
}
