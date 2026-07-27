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
  // Each preview server is stopped by Playwright with SIGTERM then a 5s force-kill on run end
  // (gracefulShutdown below). Investigation confirmed no repo-owned vite/esbuild process survives
  // the run and the ports are released, so no extra port-killing teardown is used.
  webServer: [
    {
      command: `vite preview apps/mockup --port ${MOCKUP_PORT} --strictPort`,
      port: MOCKUP_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
    {
      command: `vite preview apps/admin --port ${ADMIN_PORT} --strictPort`,
      port: ADMIN_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
  ],
});
