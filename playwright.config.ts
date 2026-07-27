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
  // Deterministic teardown: Playwright stops each webServer (SIGTERM → 5s → force). A final
  // globalTeardown force-frees the ports as a cross-platform safety net so no preview/esbuild child
  // outlives the run even if OS tree-kill is partial. See tests/e2e/global-teardown.ts.
  globalTeardown: "./tests/e2e/global-teardown.ts",
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
