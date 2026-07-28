// Playwright globalSetup: own the two preview servers as exact in-process handles and close those
// same handles in the returned teardown callback (spec 021 re-verification, round 3).
//
// No `webServer` child process is used, so there is no shell wrapper to orphan, no inherited stdio
// pipe to keep the run alive, and nothing is ever located by port or PID. See scripts/e2e-preview.mjs
// for the measured Windows failure this replaces.

import { closePreviewServers, startPreviewServers } from "../scripts/e2e-preview.mjs";
import { ADMIN_PORT, MOCKUP_PORT } from "../playwright.config";

export default async function globalSetup(): Promise<() => Promise<void>> {
  const handles = await startPreviewServers([
    { app: "mockup", port: MOCKUP_PORT },
    { app: "admin", port: ADMIN_PORT },
  ]);
  // Returned to Playwright as global teardown; runs after the last test, including on failure.
  return async () => {
    await closePreviewServers(handles);
  };
}
