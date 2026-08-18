import { beforeAll, describe, expect, it } from "vitest";
import {
  createEmulatorAccount,
  type EmulatorEnvironment,
  readEmulatorEnvironment,
  resetEmulatorState,
} from "./emulator-env";

const APPROVED_UID = "emulator-operator-DO-NOT-DEPLOY";
const OTHER_UID = "emulator-intruder-DO-NOT-DEPLOY";
const PASSWORD = "emulator-password-0000";
const REC_ID = "00000001-1111-1111-1111-111111111111.json";
const OBJECT_PATH = `rebuild-admin-state/objects/${REC_ID}`;

interface Client {
  readonly storage: typeof import("firebase/storage");
  readonly firestore: typeof import("firebase/firestore");
  readonly storageInstance: import("firebase/storage").FirebaseStorage;
  readonly db: import("firebase/firestore").Firestore;
}

let env: EmulatorEnvironment;

async function connect(uid: string | null, label: string): Promise<Client> {
  const [{ initializeApp }, auth, firestore, storage] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/storage"),
  ]);
  const app = initializeApp(
    {
      apiKey: "demo-emulator-key",
      authDomain: `${env.projectId}.firebaseapp.com`,
      projectId: env.projectId,
      storageBucket: env.storageBucket,
      appId: "1:0:web:demo",
    },
    label,
  );
  const authInstance = auth.getAuth(app);
  auth.connectAuthEmulator(authInstance, env.authUrl, { disableWarnings: true });
  const db = firestore.getFirestore(app);
  firestore.connectFirestoreEmulator(db, env.firestoreHost, env.firestorePort);
  const storageInstance = storage.getStorage(app);
  storage.connectStorageEmulator(storageInstance, env.storageHost, env.storagePort);
  if (uid !== null) {
    await auth.signInWithEmailAndPassword(authInstance, `${uid}@example.test`, PASSWORD);
  }
  return { storage, firestore, storageInstance, db };
}

const data = new TextEncoder().encode('{"schemaVersion":1}');
const upload = (client: Client, path: string) =>
  client.storage.uploadBytes(client.storage.ref(client.storageInstance, path), data, {
    contentType: "application/json",
  });
const reject = async (run: () => Promise<unknown>) => expect(run()).rejects.toBeDefined();

let approved: Client;
let other: Client;
let anonymous: Client;

beforeAll(async () => {
  env = readEmulatorEnvironment();
  expect(env.projectId).toBe("demo-denn-cutover");
  await createEmulatorAccount(env, APPROVED_UID, `${APPROVED_UID}@example.test`, PASSWORD);
  await createEmulatorAccount(env, OTHER_UID, `${OTHER_UID}@example.test`, PASSWORD);
  approved = await connect(APPROVED_UID, "cutover-approved");
  other = await connect(OTHER_UID, "cutover-other");
  anonymous = await connect(null, "cutover-anonymous");
  await resetEmulatorState(env);
});

describe("transitional legacy window", () => {
  it("preserves non-anonymous legacy create and overwrite but rejects unauthenticated write", async () => {
    await upload(approved, "admin/state.json");
    await upload(other, "admin/state.json");
    await reject(() => upload(anonymous, "admin/state.json"));
  });
});

describe("rebuild isolation", () => {
  it("allows only the synthetic approved UID and keeps objects immutable", async () => {
    await resetEmulatorState(env);
    const rec = approved.firestore.doc(approved.db, "rebuildAdminStateObjects", REC_ID);
    await approved.firestore.setDoc(rec, { claimedBase: 0 });
    await upload(approved, OBJECT_PATH);
    await reject(() => upload(approved, OBJECT_PATH));
    await reject(() =>
      approved.storage.deleteObject(approved.storage.ref(approved.storageInstance, OBJECT_PATH)),
    );
    await reject(() =>
      upload(other, `rebuild-admin-state/objects/00000002-1111-1111-1111-111111111111.json`),
    );
  });

  it("creates the first head only for the approved UID and refuses deletion", async () => {
    await resetEmulatorState(env);
    const rec = approved.firestore.doc(approved.db, "rebuildAdminStateObjects", REC_ID);
    const head = approved.firestore.doc(approved.db, "rebuildAdminState", "head");
    await approved.firestore.setDoc(rec, { claimedBase: 0 });
    await approved.firestore.setDoc(head, { schemaVersion: 1, revision: 1, recId: REC_ID });
    await reject(() => approved.firestore.deleteDoc(head));
    await reject(() =>
      other.firestore.setDoc(other.firestore.doc(other.db, "rebuildAdminState", "head"), {
        schemaVersion: 1,
        revision: 2,
        recId: "00000002-1111-1111-1111-111111111111.json",
      }),
    );
  });
});

describe("existing spaces contract", () => {
  it("still allows create but refuses update and delete", async () => {
    await resetEmulatorState(env);
    const space = anonymous.firestore.doc(anonymous.db, "spaces", "cutover-fixture");
    await anonymous.firestore.setDoc(space, { encrypted: true });
    await reject(() => anonymous.firestore.setDoc(space, { encrypted: false }));
    await reject(() => anonymous.firestore.deleteDoc(space));
  });
});
