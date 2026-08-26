// Local-emulator test harness support (spec 037 §7.2). NOT exported from the package barrel.
//
// Fails closed on purpose: if the emulator variables are missing, or the project id is not a
// `demo-` id, the suite must refuse to start rather than let a request reach a real project. The
// production `.firebaserc` project (`denn-products`) must never appear here.

const DEMO_PREFIX = "demo-";

export interface EmulatorEnvironment {
  readonly projectId: string;
  readonly authUrl: string;
  readonly firestoreHost: string;
  readonly firestorePort: number;
  readonly storageHost: string;
  readonly storagePort: number;
  readonly storageBucket: string;
}

function requireVar(name: string): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`emulator gate refused to start: ${name} is not set`);
  }
  return value.trim();
}

/** `host:port` -> parts. The emulator variables always carry both. */
function splitHostPort(raw: string, name: string): { host: string; port: number } {
  const at = raw.lastIndexOf(":");
  const host = at === -1 ? raw : raw.slice(0, at);
  const port = at === -1 ? Number.NaN : Number.parseInt(raw.slice(at + 1), 10);
  if (host === "" || !Number.isInteger(port)) {
    throw new Error(`emulator gate refused to start: ${name} is not host:port`);
  }
  return { host, port };
}

export function readEmulatorEnvironment(): EmulatorEnvironment {
  // `firebase emulators:exec` sets these; running vitest directly leaves them unset, which is
  // exactly when this must refuse.
  const projectId = requireVar("GCLOUD_PROJECT");
  if (!projectId.startsWith(DEMO_PREFIX)) {
    throw new Error(
      `emulator gate refused to start: project id must begin with "${DEMO_PREFIX}" (got a non-demo id)`,
    );
  }
  const auth = requireVar("FIREBASE_AUTH_EMULATOR_HOST");
  const firestore = splitHostPort(requireVar("FIRESTORE_EMULATOR_HOST"), "FIRESTORE_EMULATOR_HOST");
  const storage = splitHostPort(
    requireVar("FIREBASE_STORAGE_EMULATOR_HOST"),
    "FIREBASE_STORAGE_EMULATOR_HOST",
  );

  return {
    projectId,
    authUrl: auth.startsWith("http") ? auth : `http://${auth}`,
    firestoreHost: firestore.host,
    firestorePort: firestore.port,
    storageHost: storage.host,
    storagePort: storage.port,
    storageBucket: `${projectId}.firebasestorage.app`,
  };
}

/**
 * Creates an emulator account with a CHOSEN uid, through the emulator's own admin endpoint.
 *
 * This is how the rules can be exercised against the fixed synthetic uid: the client SDK assigns a
 * random uid on sign-up, so the uid has to be pinned here. `Bearer owner` is the emulator's
 * well-known local credential and has no meaning outside it.
 */
export async function createEmulatorAccount(
  env: EmulatorEnvironment,
  uid: string,
  email: string,
  password: string,
): Promise<void> {
  const response = await fetch(
    `${env.authUrl}/identitytoolkit.googleapis.com/v1/projects/${env.projectId}/accounts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
      body: JSON.stringify({ localId: uid, email, password, emailVerified: true }),
    },
  );
  if (response.ok || response.status === 409) return;
  if (response.status === 400) {
    try {
      const body = (await response.json()) as { readonly error?: { readonly message?: unknown } };
      if (body.error?.message === "EMAIL_EXISTS" || body.error?.message === "DUPLICATE_LOCAL_ID") {
        return;
      }
    } catch {
      // Fall through to the safe status-only error below.
    }
  }
  throw new Error(`emulator account creation failed: ${response.status}`);
}

/** Wipes emulator state between scenarios so each one starts from "no head, no objects". */
export async function resetEmulatorState(env: EmulatorEnvironment): Promise<void> {
  await fetch(
    `http://${env.firestoreHost}:${env.firestorePort}/emulator/v1/projects/${env.projectId}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}
