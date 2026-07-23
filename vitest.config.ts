import { defineConfig } from "vitest/config";

export default defineConfig({
  // Component contracts are asserted via react-dom/server renderToStaticMarkup (node env),
  // so no jsdom/happy-dom/RTL is introduced. Automatic JSX runtime for .tsx test files.
  esbuild: { jsx: "automatic" },
  test: {
    include: ["packages/**/src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
