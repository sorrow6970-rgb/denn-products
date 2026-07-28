import { defineConfig, devices } from "@playwright/test";

export const MOCKUP_PORT = 4183;
export const ADMIN_PORT = 4184;

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: true,
  fullyParallel: false,
  reporter: "list",
  use: { trace: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Shutdown ownership (measured, spec 021 re-verification):
  //   Playwright spawns each webServer command with `shell: true` and, on win32, without `detached`,
  //   so the PID it owns is a `cmd.exe` wrapper. `gracefulShutdown` is REFUSED on win32 by
  //   playwright-core ("Graceful shutdown is not supported on Windows"), so shutdown there is always
  //   `taskkill /pid <wrapper> /T /F` — and it is skipped once the wrapper has closed. With the old
  //   `vite preview …` command the real server was a descendant of that wrapper: orphan it and it
  //   keeps the inherited stdio pipes, the wrapper's `close` never fires, and webServer teardown
  //   waits forever with the port still LISTENING (reproduced by killing only the wrapper mid-run).
  //   `scripts/e2e-preview.mjs` runs the preview server IN-PROCESS via Vite's Node API, so the node
  //   process spawned here IS the port owner, and it self-terminates on signal / stdin EOF / dead
  //   parent. It closes only the server it started; nothing is killed by port number, and no
  //   globalTeardown or broad process sweep is used. `gracefulShutdown` is kept because it is the
  //   POSIX path (the launcher handles SIGTERM); on win32 it stays a documented no-op.
  webServer: [
    {
      command: `node scripts/e2e-preview.mjs mockup ${MOCKUP_PORT}`,
      port: MOCKUP_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
    {
      command: `node scripts/e2e-preview.mjs admin ${ADMIN_PORT}`,
      port: ADMIN_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
  ],
});
