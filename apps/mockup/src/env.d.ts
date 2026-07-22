// Side-effect CSS imports (e.g. "@denn/ui/theme.css") are handled by Vite at build time.
// This ambient declaration lets tsc --noEmit typecheck those imports without emitting.
declare module "*.css";
