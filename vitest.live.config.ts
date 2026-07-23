import { defineConfig } from "vitest/config";

// OPT-IN live config (spec 014). Runs ONLY *.live.test.ts, which perform a real network GET and
// are gated on DENN_LIVE_PUBLIC_CATALOG_READ=1. Never part of the default `test:unit` / `check`.
export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.live.test.ts"],
    environment: "node",
  },
});
