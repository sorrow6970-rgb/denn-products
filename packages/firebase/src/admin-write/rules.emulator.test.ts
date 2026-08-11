// Local emulator verification against the REAL rules (spec 037 §7.5 A, E-1..E-8).
//
// What this layer proves: identity gating, create-only storage, head get/list, key/path/revision
// rules, two-writer compare-and-set, and that a losing writer leaves the head untouched.
// What it does NOT prove: the app's error branches, callback re-execution or unknown-outcome
// handling — those have no deterministic, non-destructive seam here and are covered by the fakes.
//
// Runs only through `pnpm test:emulator`, which supplies --config firebase.emulator.json and
// --project demo-denn-emulator. Never touches a real project, bucket or network.

import { beforeAll, describe, expect, it } from "vitest";
import { HEAD_SCHEMA_VERSION } from "./constants";
import {
  createEmulatorAccount,
  type EmulatorEnvironment,
  readEmulatorEnvironment,
  resetEmulatorState,
} from "./emulator-env";

const APPROVED_UID = "emulator-operator-DO-NOT-DEPLOY";
const OTHER_UID = "emulator-intruder-DO-NOT-DEPLOY";
const PASSWORD = "emulator-password-0000";

const path = (uuid: string) => `rebuild-admin-state/objects/${uuid}.json`;

// Storage objects are immutable and `resetEmulatorState` only clears Firestore, so every scenario
// mints its own paths — exactly as a real save does. Reusing one would make the create-only rule
// refuse the setup step, which is correct behaviour but useless as a fixture.
let pathCounter = 0;
function freshPath(): string {
  pathCounter += 1;
  const head = pathCounter.toString(16).padStart(8, "0");
  return path(`${head}-1111-1111-1111-111111111111`);
}

let env: EmulatorEnvironment;

interface Client {
  readonly storage: typeof import("firebase/storage");
  readonly firestore: typeof import("firebase/firestore");
  readonly storageInstance: import("firebase/storage").FirebaseStorage;
  readonly db: import("firebase/firestore").Firestore;
}

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
    expect(authInstance.currentUser?.uid).toBe(uid);
  }
  return { storage, firestore, storageInstance, db };
}

const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

async function upload(client: Client, objectPath: string, contentType = "application/json") {
  const ref = client.storage.ref(client.storageInstance, objectPath);
  await client.storage.uploadBytes(ref, bytes({ ok: true }), { contentType });
}

const headRef = (client: Client) => client.firestore.doc(client.db, "rebuildAdminState", "head");

const headDoc = (revision: number, objectPath: string) => ({
  schemaVersion: HEAD_SCHEMA_VERSION,
  revision,
  objectPath,
});

async function expectRejected(run: () => Promise<unknown>): Promise<void> {
  await expect(run()).rejects.toBeDefined();
}

let approved: Client;
let other: Client;
let anonymous: Client;

beforeAll(async () => {
  env = readEmulatorEnvironment();
  await createEmulatorAccount(env, APPROVED_UID, `${APPROVED_UID}@example.test`, PASSWORD);
  await createEmulatorAccount(env, OTHER_UID, `${OTHER_UID}@example.test`, PASSWORD);
  approved = await connect(APPROVED_UID, "approved");
  other = await connect(OTHER_UID, "other");
  anonymous = await connect(null, "anonymous");
  await resetEmulatorState(env);
}, 60_000);

describe("E-1/E-2 identity gating", () => {
  it("lets the approved operator create an object and the head", async () => {
    await resetEmulatorState(env);
    const objectPath = freshPath();
    await upload(approved, objectPath);
    await approved.firestore.setDoc(headRef(approved), headDoc(1, objectPath));
    const snap = await approved.firestore.getDoc(headRef(approved));
    expect(snap.data()).toEqual(headDoc(1, objectPath));
  });

  it("refuses another uid and an unauthenticated client on both services", async () => {
    const objectPath = freshPath();
    await expectRejected(() => upload(other, objectPath));
    await expectRejected(() => upload(anonymous, objectPath));
    await expectRejected(() => other.firestore.setDoc(headRef(other), headDoc(9, objectPath)));
    await expectRejected(() =>
      anonymous.firestore.setDoc(headRef(anonymous), headDoc(9, objectPath)),
    );
  });
});

describe("E-3 storage is create-only", () => {
  it("refuses a second write to the same path and refuses delete", async () => {
    const objectPath = freshPath();
    await upload(approved, objectPath);
    // This is what makes an SDK-level retry harmless instead of destructive.
    await expectRejected(() => upload(approved, objectPath));
    await expectRejected(() =>
      approved.storage.deleteObject(approved.storage.ref(approved.storageInstance, objectPath)),
    );
  });

  it("refuses a non-JSON content type", async () => {
    await expectRejected(() => upload(approved, freshPath(), "text/plain"));
  });
});

describe("E-4/E-5 head read", () => {
  it("lets the approved operator get the head and refuses every other identity", async () => {
    await resetEmulatorState(env);
    await approved.firestore.setDoc(headRef(approved), headDoc(1, freshPath()));
    await expect(approved.firestore.getDoc(headRef(approved))).resolves.toBeDefined();
    await expectRejected(() => other.firestore.getDoc(headRef(other)));
    await expectRejected(() => anonymous.firestore.getDoc(headRef(anonymous)));
  });

  it("refuses listing the collection even for the approved operator", async () => {
    await expectRejected(() =>
      approved.firestore.getDocs(approved.firestore.collection(approved.db, "rebuildAdminState")),
    );
  });
});

describe("E-6 head schema and revision rules", () => {
  it("refuses a fourth key, a bad objectPath, and a first revision other than 1", async () => {
    await resetEmulatorState(env);
    await expectRejected(() =>
      approved.firestore.setDoc(headRef(approved), { ...headDoc(1, freshPath()), extra: true }),
    );
    await expectRejected(() =>
      approved.firestore.setDoc(headRef(approved), headDoc(1, "admin/state.json")),
    );
    await expectRejected(() =>
      approved.firestore.setDoc(headRef(approved), headDoc(2, freshPath())),
    );
  });

  it("refuses an update that is not exactly +1 or that reuses the objectPath", async () => {
    await resetEmulatorState(env);
    const first = freshPath();
    const second = freshPath();
    await approved.firestore.setDoc(headRef(approved), headDoc(1, first));
    await expectRejected(() => approved.firestore.setDoc(headRef(approved), headDoc(3, second)));
    await expectRejected(() => approved.firestore.setDoc(headRef(approved), headDoc(1, second)));
    // objectPath must change, which is what later makes "did my commit land?" answerable
    await expectRejected(() => approved.firestore.setDoc(headRef(approved), headDoc(2, first)));
    await expect(
      approved.firestore.setDoc(headRef(approved), headDoc(2, second)),
    ).resolves.toBeUndefined();
  });

  it("refuses deleting the head", async () => {
    await expectRejected(() => approved.firestore.deleteDoc(headRef(approved)));
  });
});

describe("E-7/E-8 two-writer compare-and-set", () => {
  it("advances the head exactly once and leaves the loser's object unreferenced", async () => {
    await resetEmulatorState(env);
    await approved.firestore.setDoc(headRef(approved), headDoc(1, freshPath()));

    const objectA = freshPath();
    const objectB = freshPath();
    await upload(approved, objectA);
    await upload(approved, objectB);

    const attempt = (objectPath: string) =>
      approved.firestore.runTransaction(approved.db, async (tx) => {
        const snap = await tx.get(headRef(approved));
        const current = snap.data() as { revision: number } | undefined;
        if (current?.revision !== 1) throw new Error("conflict");
        tx.set(headRef(approved), headDoc(2, objectPath));
      });

    const outcomes = await Promise.allSettled([attempt(objectA), attempt(objectB)]);
    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const snap = await approved.firestore.getDoc(headRef(approved));
    const head = snap.data() as { revision: number; objectPath: string };
    expect(head.revision).toBe(2); // exactly +1, never +2
    // the loser's object still exists but nothing references it — an orphan, and the head is intact
    const loser = head.objectPath === objectA ? objectB : objectA;
    await expect(
      approved.storage.getBytes(approved.storage.ref(approved.storageInstance, loser)),
    ).resolves.toBeDefined();
  });
});
