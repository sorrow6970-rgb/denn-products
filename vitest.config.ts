import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // Component contracts are asserted via react-dom/server renderToStaticMarkup (node env),
  // so no jsdom/happy-dom/RTL is introduced. Vite 8's oxc transform handles the .tsx test
  // files with the automatic JSX runtime by default — no explicit jsx option needed.
  test: {
    include: [
      "packages/**/src/**/*.test.{ts,tsx}",
      "apps/**/src/**/*.test.{ts,tsx}",
      // E2E lifecycle helpers live in scripts/ (they are test infrastructure, not app code); their
      // shutdown wiring is unit tested so the Playwright exit path stays pinned.
      "scripts/**/*.test.mjs",
    ],
    // Live network validation (*.live.test.ts, spec 014) is opt-in only — never in the
    // default gate. It runs via vitest.live.config.ts.
    exclude: [...configDefaults.exclude, "**/*.live.test.ts"],
    environment: "node",
  },
});
