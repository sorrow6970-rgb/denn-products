// Side-effect CSS imports (e.g. "@denn/ui/theme.css") are handled by Vite at build time.
// This ambient declaration lets tsc --noEmit typecheck those imports without emitting.
declare module "*.css";

// spec 036: the operator remote-read feature is OFF unless every one of these is provided at build
// time. They are typed as possibly-undefined on purpose — the resolver must prove each one is a
// non-empty string before any adapter is created, and no value is ever committed to the repo.
interface ImportMetaEnv {
  readonly VITE_DENN_ADMIN_FIREBASE_ENABLED?: string;
  readonly VITE_DENN_ADMIN_FIREBASE_API_KEY?: string;
  readonly VITE_DENN_ADMIN_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_DENN_ADMIN_FIREBASE_PROJECT_ID?: string;
  readonly VITE_DENN_ADMIN_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_DENN_ADMIN_FIREBASE_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
