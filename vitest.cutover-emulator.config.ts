import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/firebase/src/admin-write/cutover-rules.emulator.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
