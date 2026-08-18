// E2E orchestrator (spec 022 re-verification round 2).
//
// WHY THIS EXISTS — the Hosting boundary, not the git boundary:
//   `firebase.json` publishes `hosting.public: "."` (the whole repository) and its `ignore` list
//   contains no staging entry, and there is no `.firebaseignore`. firebase-tools globs `**/*` with
//   `dot: true`, so being gitignored is NOT a deploy exclusion: ANY build output written inside the
//   repository — including the previous `.e2e-staging/` — is a deploy candidate. The E2E harness
//   must therefore never be written inside the repo at all.
//
// So this script creates a per-run staging directory under the OS temp dir with `mkdtemp`, builds
// the customer app, the admin app and the canvas harness into it, hands the exact path to Playwright
// (`DENN_E2E_STAGING`), and removes exactly that directory afterwards. Nothing is written to
// `apps/*/dist` or anywhere else in the repository, Firebase config and Rules are untouched, no
// server or port is added, and cleanup targets only the unique directory this run created — no broad
// delete, no port/PID kill, no teardown sweep.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assembleHostingStage } from "./hosting-stage.mjs";

export const STAGING_PREFIX = "denn-e2e-";

/**
 * A path may be removed only when it is the kind of directory this script creates: inside the OS
 * temp root, exactly one level below it, and carrying our prefix. Anything else (a repo path, the
 * temp root itself, a parent) is refused, so the cleanup can never widen into a broad delete.
 */
export function isDisposableStagingPath(candidate, tempRoot) {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  if (typeof tempRoot !== "string" || tempRoot.length === 0) return false;
  const root = resolve(tempRoot);
  const path = resolve(candidate);
  if (path === root) return false;
  if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) return false;
  const rest = path.slice(root.endsWith(sep) ? root.length : root.length + 1);
  if (rest.includes(sep)) return false; // exactly one level below the temp root
  return rest.startsWith(STAGING_PREFIX);
}

function run(command, args, env) {
  const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const binDir = join(repoRoot, "node_modules", ".bin");
  const result = spawnSync([command, ...args].join(" "), {
    cwd: repoRoot,
    env: { ...process.env, PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`, ...env },
    shell: true,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

async function main() {
  const staging = mkdtempSync(join(tmpdir(), STAGING_PREFIX));
  const mockupOut = join(staging, "mockup");
  const adminOut = join(staging, "admin");
  const adminHostingOut = join(staging, "admin-hosting-source");
  process.stdout.write(`e2e staging: ${staging}\n`);

  let status = 1;
  try {
    const buildSteps = [
      ["vite", ["build", "apps/mockup", "--outDir", `"${mockupOut}"`, "--emptyOutDir"], {}],
      ["vite", ["build", "apps/admin", "--outDir", `"${adminOut}"`, "--emptyOutDir"], {}],
      [
        "vite",
        [
          "build",
          "apps/admin",
          "--base",
          "/admin/",
          "--outDir",
          `"${adminHostingOut}"`,
          "--emptyOutDir",
        ],
        {},
      ],
    ];
    for (const [command, args, env] of buildSteps) {
      status = run(command, args, env);
      if (status !== 0) break;
    }
    if (status === 0) {
      assembleHostingStage({
        repoRoot: dirname(dirname(fileURLToPath(import.meta.url))),
        e2eRoot: staging,
        mockupOut,
        adminOut: adminHostingOut,
      });
      const steps = [
        [
          "vite",
          ["build", "--config", "apps/mockup/vite.e2e-fixture.config.ts"],
          { DENN_E2E_FIXTURE_OUT_DIR: mockupOut },
        ],
        [
          "vite",
          ["build", "--config", "apps/admin/vite.e2e-fixture.config.ts"],
          { DENN_E2E_ADMIN_FIXTURE_OUT_DIR: adminOut },
        ],
        ["playwright", ["test"], { DENN_E2E_STAGING: staging }],
      ];
      for (const [command, args, env] of steps) {
        status = run(command, args, env);
        if (status !== 0) break;
      }
    }
  } finally {
    // Exactly the directory this run created — guarded, and never a repo path.
    if (isDisposableStagingPath(staging, tmpdir())) {
      rmSync(staging, { recursive: true, force: true });
    }
  }
  process.exit(status);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
