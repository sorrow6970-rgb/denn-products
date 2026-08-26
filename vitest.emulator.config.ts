import { defineConfig } from "vitest/config";

// OPT-IN local emulator config (spec 037 §7.4). Runs ONLY *.emulator.test.ts, which talk to a
// LOCAL Firebase emulator on a `demo-` project id — never a real project, bucket or network.
// Never part of the default `test:unit` / `check`; it runs through `pnpm test:emulator`, which
// wraps this in `firebase emulators:exec --config firebase.emulator.json`.
//
// The suite refuses to start unless the emulator host variables are set and the project id carries
// the `demo-` prefix (see emulator-env.ts) — a missing variable must fail closed rather than let a
// request escape to a real project.
export default defineConfig({
  test: {
    include: [
      "packages/firebase/src/admin-write/rules.emulator.test.ts",
      "packages/firebase/src/space-write/rules.emulator.test.ts",
    ],
    environment: "node",
    // Rules and CAS behaviour are shared server state; parallel files would race each other.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
