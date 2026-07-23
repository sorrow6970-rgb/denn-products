import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // Component contracts are asserted via react-dom/server renderToStaticMarkup (node env),
  // so no jsdom/happy-dom/RTL is introduced. Vite 8's oxc transform handles the .tsx test
  // files with the automatic JSX runtime by default — no explicit jsx option needed.
  test: {
    include: ["packages/**/src/**/*.test.{ts,tsx}"],
    // Live network validation (*.live.test.ts, spec 014) is opt-in only — never in the
    // default gate. It runs via vitest.live.config.ts.
    exclude: [...configDefaults.exclude, "**/*.live.test.ts"],
    environment: "node",
  },
});
