import { defineConfig, devices } from "@playwright/test";
import base from "../playwright.config";

// Opt-in only. Keep the default Chromium suite and its protected outputs unchanged.
export default defineConfig({
  ...base,
  testDir: "./e2e",
  globalSetup: "./global-setup.ts",
  testMatch: [
    "native-orientation-pixel.spec.ts",
    "room-background-file.spec.ts",
    "room-background-evidence.spec.ts",
    "background-native-lifecycle.spec.ts",
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
