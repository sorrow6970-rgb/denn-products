// Firebase configuration ownership (spec 036 §3.1). The APP decides whether the remote read is
// enabled; `@denn/firebase` never reads `import.meta.env`. A partial config is not "almost on" —
// it is off, and nothing is initialized.

import type { AdminFirebaseConfig } from "@denn/firebase/admin-read";

export type AdminFirebaseConfigResolution =
  | { readonly status: "unconfigured" }
  | { readonly status: "configured"; readonly config: AdminFirebaseConfig };

/** Only the exact string "true" enables the feature — "1", "TRUE" and "yes" do not. */
const ENABLED_FLAG = "VITE_DENN_ADMIN_FIREBASE_ENABLED";
const WRITE_ENABLED_FLAG = "VITE_DENN_ADMIN_WRITE_ENABLED";
const SPACE_V2_ISSUE_ENABLED_FLAG = "VITE_DENN_ADMIN_SPACE_V2_ISSUE_ENABLED";

const KEYS = {
  apiKey: "VITE_DENN_ADMIN_FIREBASE_API_KEY",
  authDomain: "VITE_DENN_ADMIN_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_DENN_ADMIN_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_DENN_ADMIN_FIREBASE_STORAGE_BUCKET",
  appId: "VITE_DENN_ADMIN_FIREBASE_APP_ID",
} as const;

const nonEmpty = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/**
 * Resolves the injected environment into a complete config or "unconfigured". There is no partial
 * result on purpose: an adapter built from half a config would fail at the network layer instead
 * of here, and the operator would see a mysterious error rather than "not enabled yet".
 */
export function resolveAdminFirebaseConfig(
  env: ImportMetaEnv | Record<string, unknown> | undefined,
): AdminFirebaseConfigResolution {
  if (env === undefined || env === null) return { status: "unconfigured" };
  const read = (key: string): unknown => (env as Record<string, unknown>)[key];
  if (read(ENABLED_FLAG) !== "true") return { status: "unconfigured" };

  const apiKey = nonEmpty(read(KEYS.apiKey));
  const authDomain = nonEmpty(read(KEYS.authDomain));
  const projectId = nonEmpty(read(KEYS.projectId));
  const storageBucket = nonEmpty(read(KEYS.storageBucket));
  const appId = nonEmpty(read(KEYS.appId));
  if (
    apiKey === null ||
    authDomain === null ||
    projectId === null ||
    storageBucket === null ||
    appId === null
  ) {
    return { status: "unconfigured" };
  }
  return {
    status: "configured",
    config: { apiKey, authDomain, projectId, storageBucket, appId },
  };
}

/** Write is a second, stricter gate. A partial/off read config can never enable it. */
export function resolveAdminWriteEnabled(
  env: ImportMetaEnv | Record<string, unknown> | undefined,
  resolution: AdminFirebaseConfigResolution = resolveAdminFirebaseConfig(env),
): boolean {
  if (resolution.status !== "configured" || env === undefined || env === null) return false;
  return (env as Record<string, unknown>)[WRITE_ENABLED_FLAG] === "true";
}

/**
 * Space V2 issue is a THIRD gate (spec 083 §1), stacked on the other two rather than replacing
 * them: issuing a space needs the same complete config and the same C5 write baseline the operator
 * edits, so opening it without them would mean a panel with no baseline to freeze. Like every gate
 * here, only the exact string "true" counts — "1", "TRUE" and "yes" leave it off.
 */
export function resolveAdminSpaceV2IssueEnabled(
  env: ImportMetaEnv | Record<string, unknown> | undefined,
  resolution: AdminFirebaseConfigResolution = resolveAdminFirebaseConfig(env),
): boolean {
  if (!resolveAdminWriteEnabled(env, resolution)) return false;
  if (env === undefined || env === null) return false;
  return (env as Record<string, unknown>)[SPACE_V2_ISSUE_ENABLED_FLAG] === "true";
}
