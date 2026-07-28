// Build config for the spec 022 E2E canvas harness ONLY.
//
// It is a SEPARATE build on purpose. Adding the fixture as a second input of the customer build
// makes Rollup hoist the shared React/app modules into a common chunk, which changes the customer
// entry's asset graph and hashes. Building it on its own leaves `pnpm run build` (and therefore the
// shipped customer bundle) byte-identical, and only appends the harness files to `dist`
// (`emptyOutDir: false`) so the spec 021 preview server can serve them without a second server,
// port or config change.
//
// `pnpm run test:e2e` runs this build before Playwright; `pnpm run build` and `pnpm run check` do
// not, so the production artifact never contains the harness.

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: { input: "e2e-canvas-fixture.html" },
  },
});
