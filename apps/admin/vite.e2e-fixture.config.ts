import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { build, defineConfig, type Plugin } from "vite";

const outDir = process.env.DENN_E2E_ADMIN_FIXTURE_OUT_DIR;
if (!outDir) {
  throw new Error("DENN_E2E_ADMIN_FIXTURE_OUT_DIR is required — run pnpm test:e2e");
}
const temp = resolve(tmpdir());
if (!resolve(outDir).startsWith(temp.endsWith(sep) ? temp : temp + sep)) {
  throw new Error("DENN_E2E_ADMIN_FIXTURE_OUT_DIR must be inside the OS temp directory");
}

/** Served at `/dev/…` beside the production pages, from the same per-run staging directory. */
const DEV_SUBDIR = "dev";

/**
 * A SECOND build of the Space V2 issue fixture against React's DEVELOPMENT build (spec 083 보완
 * 라운드 2).
 *
 * Why it has to exist: StrictMode only replays effects (setup → cleanup → setup on the same mounted
 * component) in a development build. Every other E2E page here is a production build, where
 * StrictMode is inert — so unmounting and mounting a component there is a different lifecycle, not
 * a StrictMode proof. Ownership that survives the replay can only be verified on a page that
 * actually performs it.
 *
 * `mode: "development"` alone is not enough: `vite build` keeps NODE_ENV production, and React's
 * entry picks its production bundle from that constant. The `define` below is what selects
 * `react.development` — measured, and re-measured by the E2E itself, which reads the harness's
 * effect-setup counter and fails unless the replay really happened.
 *
 * Nothing else changes: same entry, same source, same plugins, same staging directory (`base` is
 * `/dev/` so the page loads its own assets), and no new dependency or install.
 */
function developmentStrictModeFixture(target: string): Plugin {
  let built = false;
  return {
    name: "denn-admin-development-strictmode-fixture",
    async closeBundle() {
      if (built) return;
      built = true;
      await build({
        configFile: false,
        root: import.meta.dirname,
        base: `/${DEV_SUBDIR}/`,
        mode: "development",
        define: { "process.env.NODE_ENV": JSON.stringify("development") },
        plugins: [react(), tailwindcss()],
        build: {
          outDir: resolve(target, DEV_SUBDIR),
          emptyOutDir: false,
          minify: false,
          rollupOptions: { input: ["e2e-space-v2-issue-fixture.html"] },
        },
      });
    },
  };
}

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss(), developmentStrictModeFixture(outDir)],
  build: {
    outDir,
    emptyOutDir: false,
    rollupOptions: {
      input: ["e2e-admin-write-fixture.html", "e2e-space-v2-issue-fixture.html"],
    },
  },
});
