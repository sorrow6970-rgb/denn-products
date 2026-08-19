// Side-effect CSS imports (e.g. "@denn/ui/theme.css") are handled by Vite at build time.
// This ambient declaration lets tsc --noEmit typecheck those imports without emitting.
declare module "*.css";

interface ImportMetaEnv {
  readonly VITE_DENN_SPACE_FIREBASE_ENABLED?: string;
  readonly VITE_DENN_SPACE_FIREBASE_API_KEY?: string;
  readonly VITE_DENN_SPACE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_DENN_SPACE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_DENN_SPACE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_DENN_SPACE_FIREBASE_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
