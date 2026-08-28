import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const outDir = process.env.DENN_E2E_ADMIN_FIXTURE_OUT_DIR;
if (!outDir) {
  throw new Error("DENN_E2E_ADMIN_FIXTURE_OUT_DIR is required — run pnpm test:e2e");
}
const temp = resolve(tmpdir());
if (!resolve(outDir).startsWith(temp.endsWith(sep) ? temp : temp + sep)) {
  throw new Error("DENN_E2E_ADMIN_FIXTURE_OUT_DIR must be inside the OS temp directory");
}

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  build: {
    outDir,
    emptyOutDir: false,
    rollupOptions: {
      input: ["e2e-admin-write-fixture.html", "e2e-space-v2-issue-fixture.html"],
    },
  },
});
