import { defineConfig, devices } from "@playwright/test";

export const MOCKUP_PORT = 4183;
export const ADMIN_PORT = 4184;
export const HOSTING_PORT = 4185;

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: true,
  fullyParallel: false,
  reporter: "list",
  use: { trace: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Server ownership (measured, spec 021 re-verification):
  //   `webServer` is deliberately NOT used. Playwright spawns every webServer command with
  //   `shell: true` and, on win32, without `detached`, so the PID it owns is a `cmd.exe` wrapper;
  //   `gracefulShutdown` is refused outright on win32 ("Graceful shutdown is not supported on
  //   Windows") and the fallback `taskkill /pid <wrapper> /T /F` is skipped once that wrapper has
  //   closed. Teardown then awaits the wrapper's `close`, which needs every inherited stdio pipe
  //   shut, so any surviving descendant blocks the command forever — reproduced twice, once with a
  //   held port and once with the ports already free.
  //   `tests/global-setup.ts` instead starts both preview servers IN-PROCESS via Vite's Node API and
  //   closes those exact handles in the teardown callback it returns: no child process, no wrapper,
  //   no inherited pipe, nothing located by port or PID, no taskkill/SIGKILL/globalTeardown sweep.
  //   `strictPort: true` there is the refuse-an-existing-server contract that `reuseExistingServer:
  //   false` provided.
  globalSetup: "./tests/global-setup.ts",
});
