// Playwright globalSetup: own the two preview servers as exact in-process handles and close those
// same handles in the returned teardown callback (spec 021), serving the per-run E2E staging build
// (spec 022 re-verification).
//
// No `webServer` child process is used, so there is no shell wrapper to orphan, no inherited stdio
// pipe to keep the run alive, and nothing is ever located by port or PID. The staging directory is
// created by `scripts/e2e-run.mjs` under the OS temp root and passed in as `DENN_E2E_STAGING`;
// nothing under the repository (a Firebase Hosting `public: "."` deploy candidate) is served.

import { join } from "node:path";
import { closePreviewServers, startPreviewServers } from "../scripts/e2e-preview.mjs";
import { ADMIN_PORT, MOCKUP_PORT } from "../playwright.config";

export default async function globalSetup(): Promise<() => Promise<void>> {
  const staging = process.env.DENN_E2E_STAGING;
  if (!staging) {
    throw new Error(
      "DENN_E2E_STAGING is required — run the E2E suite via `pnpm run test:e2e` (scripts/e2e-run.mjs)",
    );
  }
  const handles = await startPreviewServers([
    { app: "mockup", port: MOCKUP_PORT, outDir: join(staging, "mockup") },
    { app: "admin", port: ADMIN_PORT, outDir: join(staging, "admin") },
  ]);
  // Returned to Playwright as global teardown; runs after the last test, including on failure.
  return async () => {
    await closePreviewServers(handles);
  };
}
