import { defineConfig, devices } from '@playwright/test';

// POC viewport auto-check. Serves the production build via `vite preview` and drives one
// Chromium instance across the viewport matrix (the spec iterates sizes inside the test).
// Desktop emulation does NOT replace real in-app webview checks — see results/device-matrix.md.
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './results/playwright-artifacts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  reporter: [['list'], ['json', { outputFile: 'results/e2e-report.json' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
