// Aggregate root quality gate for the rebuild monorepo (spec 010).
// Order: format -> lint -> typecheck -> unit -> build. e2e is a separate command.
// Runs local .bin tools directly (no nested pnpm) so it works under Corepack.
import { spawnSync } from "node:child_process";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const binDir = join(root, "node_modules", ".bin");
const env = { ...process.env, PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}` };

const projects = [
  "packages/shared",
  "packages/firebase",
  "packages/spaces",
  "packages/render",
  "packages/ui",
  "apps/mockup",
  "apps/admin",
];

const BIOME_TARGETS = [
  "apps",
  "packages",
  "tests",
  "scripts",
  "vitest.config.ts",
  "vitest.live.config.ts",
  // Opt-in emulator config (spec 037). Listed here as well as in package.json: biome only checks
  // the paths it is given, so a config missing from this list is silently skipped rather than
  // failing — which reads as "checked" when it was not.
  "vitest.emulator.config.ts",
  "playwright.config.ts",
  "playwright.live.config.ts",
];
const steps = [
  ["format", "biome", ["format", ...BIOME_TARGETS]],
  ["lint", "biome", ["lint", "--error-on-warnings", ...BIOME_TARGETS]],
  ...projects.map((p) => [`typecheck:${p}`, "tsc", ["--noEmit", "-p", `${p}/tsconfig.json`]]),
  ["unit", "vitest", ["run"]],
  ["build:mockup", "vite", ["build", "apps/mockup"]],
  ["build:admin", "vite", ["build", "apps/admin"]],
];

for (const [name, cmd, args] of steps) {
  process.stdout.write(`\n▶ ${name}\n`);
  // Pass one command string (args have no spaces) to avoid DEP0190 from shell + args array.
  const res = spawnSync([cmd, ...args].join(" "), {
    cwd: root,
    env,
    shell: true,
    stdio: "inherit",
  });
  if (res.status !== 0) {
    process.stdout.write(`\n✗ check failed at: ${name} (exit ${res.status})\n`);
    process.exit(res.status ?? 1);
  }
}
process.stdout.write("\n✓ check passed (format, lint, typecheck, unit, build)\n");
