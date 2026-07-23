import { defineConfig, devices } from "@playwright/test";
import { MOCKUP_PORT } from "./playwright.config";

// OPT-IN live browser config (spec 014). Separate testDir so the default `test:e2e` never runs it.
// trace/video/screenshot OFF and no downloads — only safe aggregates are logged by the spec.
export default defineConfig({
  testDir: "./tests/e2e-live",
  forbidOnly: true,
  fullyParallel: false,
  reporter: "list",
  use: { trace: "off", video: "off", screenshot: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `vite preview apps/mockup --port ${MOCKUP_PORT} --strictPort`,
      port: MOCKUP_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
