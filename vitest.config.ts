import { defineConfig } from "vitest/config";

export default defineConfig({
  // Component contracts are asserted via react-dom/server renderToStaticMarkup (node env),
  // so no jsdom/happy-dom/RTL is introduced. Vite 8's oxc transform handles the .tsx test
  // files with the automatic JSX runtime by default — no explicit jsx option needed.
  test: {
    include: ["packages/**/src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
