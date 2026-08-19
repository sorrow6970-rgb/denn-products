import type { SpaceReadFirebaseConfig } from "@denn/firebase/space-read";

export type SpaceFirebaseConfigResolution =
  | { readonly status: "unconfigured" }
  | { readonly status: "configured"; readonly config: SpaceReadFirebaseConfig };

const ENABLED = "VITE_DENN_SPACE_FIREBASE_ENABLED";
const KEYS = {
  apiKey: "VITE_DENN_SPACE_FIREBASE_API_KEY",
  authDomain: "VITE_DENN_SPACE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_DENN_SPACE_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_DENN_SPACE_FIREBASE_STORAGE_BUCKET",
  appId: "VITE_DENN_SPACE_FIREBASE_APP_ID",
} as const;

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function resolveSpaceFirebaseConfig(
  env: ImportMetaEnv | Record<string, unknown> | undefined,
): SpaceFirebaseConfigResolution {
  if (!env || (env as Record<string, unknown>)[ENABLED] !== "true") {
    return { status: "unconfigured" };
  }
  const read = (key: string): unknown => (env as Record<string, unknown>)[key];
  const apiKey = nonEmpty(read(KEYS.apiKey));
  const authDomain = nonEmpty(read(KEYS.authDomain));
  const projectId = nonEmpty(read(KEYS.projectId));
  const storageBucket = nonEmpty(read(KEYS.storageBucket));
  const appId = nonEmpty(read(KEYS.appId));
  if (!apiKey || !authDomain || !projectId || !storageBucket || !appId) {
    return { status: "unconfigured" };
  }
  return {
    status: "configured",
    config: { apiKey, authDomain, projectId, storageBucket, appId },
  };
}
