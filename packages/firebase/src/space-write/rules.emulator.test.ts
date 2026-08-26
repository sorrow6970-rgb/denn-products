// Local `demo-` emulator verification for spec 075. This file is excluded from default unit/check.
// It proves Rules behaviour only; it does not prove SDK adapter error mapping or live deployment.

import { beforeAll, describe, expect, it } from "vitest";
import {
  createEmulatorAccount,
  type EmulatorEnvironment,
  readEmulatorEnvironment,
  resetEmulatorState,
} from "../admin-write/emulator-env";

const APPROVED_UID = "emulator-operator-DO-NOT-DEPLOY";
const OTHER_UID = "emulator-intruder-DO-NOT-DEPLOY";
const PASSWORD = "emulator-password-0000";
const ASSET_PATH = "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png";
const TOKEN = "123e4567-e89b-42d3-b456-426614174001";
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const ENVELOPE = {
  salt: "AAECAwQFBgcICQoLDA0ODw==",
  iv: "EBESExQVFhcYGRob",
  ct: "AAECAwQFBgcICQoLDA0ODw==",
};

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

async function upload(
  client: Client,
  objectPath = ASSET_PATH,
  bytes = PNG,
  contentType = "image/png",
): Promise<void> {
  await client.storage.uploadBytes(client.storage.ref(client.storageInstance, objectPath), bytes, {
    contentType,
  });
}

const spaceRef = (client: Client, token = TOKEN) =>
  client.firestore.doc(client.db, "spaces", token);
const v2 = () => ({ schema: "space-v2", enc: { ...ENVELOPE } });
const v1 = () => ({
  schema: "space-v1",
  enc: { ...ENVELOPE },
  ownerMeta: { label: "synthetic" },
  createdAt: "2026-08-26T00:00:00.000Z",
});
const reject = async (run: () => Promise<unknown>) => expect(run()).rejects.toBeDefined();

let approved: Client;
let other: Client;
let anonymous: Client;

beforeAll(async () => {
  env = readEmulatorEnvironment();
  expect(env.projectId).toBe("demo-denn-emulator");
  await createEmulatorAccount(env, APPROVED_UID, `${APPROVED_UID}@example.test`, PASSWORD);
  await createEmulatorAccount(env, OTHER_UID, `${OTHER_UID}@example.test`, PASSWORD);
  approved = await connect(APPROVED_UID, "space-v2-approved");
  other = await connect(OTHER_UID, "space-v2-other");
  anonymous = await connect(null, "space-v2-anonymous");
  await resetEmulatorState(env);
}, 60_000);

describe("space V2 Storage Rules", () => {
  it("allows only the approved UID to create one public immutable PNG", async () => {
    await upload(approved);
    const downloaded = await anonymous.storage.getBytes(
      anonymous.storage.ref(anonymous.storageInstance, ASSET_PATH),
    );
    expect(new Uint8Array(downloaded)).toEqual(PNG);
    await reject(() => upload(approved));
    await reject(() =>
      approved.storage.deleteObject(approved.storage.ref(approved.storageInstance, ASSET_PATH)),
    );
  });

  it("rejects another UID and an unauthenticated create", async () => {
    await reject(() =>
      upload(other, "rebuild-space-assets/objects/223e4567-e89b-42d3-a456-426614174000.png"),
    );
    await reject(() =>
      upload(anonymous, "rebuild-space-assets/objects/323e4567-e89b-42d3-a456-426614174000.png"),
    );
  });

  it("rejects a bad path, wrong content type and the exclusive 20 MiB ceiling", async () => {
    await reject(() => upload(approved, "rebuild-space-assets/objects/not-a-uuid.png"));
    await reject(() =>
      upload(
        approved,
        "rebuild-space-assets/objects/423e4567-e89b-42d3-a456-426614174000.png",
        PNG,
        "image/jpeg",
      ),
    );
    await reject(() =>
      upload(
        approved,
        "rebuild-space-assets/objects/523e4567-e89b-42d3-a456-426614174000.png",
        new Uint8Array(20 * 1024 * 1024),
      ),
    );
  });
});

describe("space V2 Firestore Rules", () => {
  it("allows an exact V2 create only for the approved UID and public get", async () => {
    await approved.firestore.setDoc(spaceRef(approved), v2());
    await expect(anonymous.firestore.getDoc(spaceRef(anonymous))).resolves.toBeDefined();
    await reject(() => other.firestore.setDoc(spaceRef(other, `${TOKEN}-other`), v2()));
    await reject(() => anonymous.firestore.setDoc(spaceRef(anonymous, `${TOKEN}-anon`), v2()));
  });

  it("rejects extra or malformed V2 keys", async () => {
    await reject(() =>
      approved.firestore.setDoc(spaceRef(approved, `${TOKEN}-extra`), { ...v2(), extra: true }),
    );
    await reject(() =>
      approved.firestore.setDoc(spaceRef(approved, `${TOKEN}-enc-extra`), {
        schema: "space-v2",
        enc: { ...ENVELOPE, extra: true },
      }),
    );
    await reject(() =>
      approved.firestore.setDoc(spaceRef(approved, `${TOKEN}-bad-enc`), {
        schema: "space-v2",
        enc: { ...ENVELOPE, ct: 1 },
      }),
    );
  });

  it("preserves anonymous V1 and schema-less create while refusing update and delete", async () => {
    const ref = spaceRef(anonymous, `${TOKEN}-v1`);
    await anonymous.firestore.setDoc(ref, v1());
    await reject(() => anonymous.firestore.setDoc(ref, v1()));
    await reject(() => anonymous.firestore.deleteDoc(ref));

    await anonymous.firestore.setDoc(spaceRef(anonymous, `${TOKEN}-legacy`), {
      encrypted: true,
    });
  });

  it("refuses collection list for every identity", async () => {
    for (const client of [approved, other, anonymous]) {
      await reject(() =>
        client.firestore.getDocs(client.firestore.collection(client.db, "spaces")),
      );
    }
  });
});
