import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import base from "../playwright.config";

// All artifacts and browser cwd belong to the runner's OS staging; no repository PNG writers.
const staging = process.env.DENN_E2E_STAGING;
if (!staging) throw new Error("Run spec132 through scripts/e2e-run.mjs");

export default defineConfig({
  ...base,
  testDir: ".",
  globalSetup: "./global-setup.ts",
  outputDir: join(staging, "test-results"),
  projects: [
    ...["chromium", "firefox", "webkit"].map((name, index) => ({
      name,
      testMatch: ["composer-room-source/source.spec.ts"],
      use: { ...devices[["Desktop Chrome", "Desktop Firefox", "Desktop Safari"][index]] },
    })),
    {
      name: "regression-chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: [
        "e2e/canvas-surface.spec.ts",
        "e2e/mockup-preview.spec.ts",
        "e2e/space-frame-view.spec.ts",
        "e2e/space-production-route.spec.ts",
        "e2e/preparation-pair-paint.spec.ts",
        "room-source-native/source.spec.ts",
      ],
      grepInvert: /spec 085 evidence|spec 088 Korean picker|spec063 screenshot|spec080 screenshot/,
    },
  ],
});
