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
    // Local emulator validation (*.emulator.test.ts, spec 037) is opt-in the same way and runs via
    // vitest.emulator.config.ts. Both patterns end in `.test.ts`, so the include above would pick
    // them up without these excludes.
    exclude: [...configDefaults.exclude, "**/*.live.test.ts", "**/*.emulator.test.ts"],
    environment: "node",
  },
});
