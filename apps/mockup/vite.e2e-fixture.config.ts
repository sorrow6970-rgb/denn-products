// Build config for the spec 022 E2E canvas harness ONLY.
//
// It is a SEPARATE build on purpose. Adding the fixture as a second input of the customer build
// makes Rollup hoist the shared React/app modules into a common chunk, which changes the customer
// entry's asset graph and hashes. Building it on its own keeps `pnpm run build` (and therefore the
// shipped customer bundle) byte-identical.
//
// The output directory is REQUIRED from the environment and is provided by `scripts/e2e-run.mjs`,
// which points it at a per-run `mkdtemp` directory under the OS temp root. It must never fall back
// to `dist` or to any path inside the repository: `firebase.json` publishes `hosting.public: "."`
// with no staging entry in `ignore` and there is no `.firebaseignore`, so anything written inside
// the repo is a Firebase Hosting deploy candidate regardless of gitignore. Failing closed here is
// what keeps the harness out of the deployable tree.

import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const outDir = process.env.DENN_E2E_FIXTURE_OUT_DIR;
if (!outDir) {
  throw new Error(
    "DENN_E2E_FIXTURE_OUT_DIR is required — run the E2E harness build via `pnpm run test:e2e`",
  );
}
const temp = resolve(tmpdir());
if (!resolve(outDir).startsWith(temp.endsWith(sep) ? temp : temp + sep)) {
  throw new Error("DENN_E2E_FIXTURE_OUT_DIR must be inside the OS temp directory");
}

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  // This non-production build deliberately uses development React so StrictMode performs its
  // setup→cleanup→setup replay and the fixture can detect owner leaks that a production build hides.
  define: { "process.env.NODE_ENV": JSON.stringify("development") },
  build: {
    outDir,
    emptyOutDir: false,
    rollupOptions: {
      input: [
        "e2e-canvas-fixture.html",
        "e2e-space-frame-fixture.html",
        "e2e-space-production-route-fixture.html",
      ],
    },
  },
});
