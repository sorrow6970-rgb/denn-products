// Build config for the spec 022 E2E canvas harness ONLY.
//
// It is a SEPARATE build on purpose. Adding the fixture as a second input of the customer build
// makes Rollup hoist the shared React/app modules into a common chunk, which changes the customer
// entry's asset graph and hashes. Building it on its own keeps `pnpm run build` (and therefore the
// shipped customer bundle) byte-identical.
//
// It emits into `.e2e-staging/mockup`, NEVER into `apps/mockup/dist`: `pnpm run test:e2e` builds the
// customer app into that same staging directory first and then appends the harness there
// (`emptyOutDir: false`), and the spec 021 preview server serves the staging directory. So the
// deployable artifact in `apps/mockup/dist` is never written by an E2E run and can never contain the
// harness — on success, on test failure and on startup failure alike. `.e2e-staging/` is gitignored
// and is not a deploy source (firebase.json publishes the app dist, not staging).

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../../.e2e-staging/mockup",
    emptyOutDir: false,
    rollupOptions: { input: "e2e-canvas-fixture.html" },
  },
});
