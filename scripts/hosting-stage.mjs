import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";

export const LEGACY_FILES = ["denn-admin.html", "denn-mockup-tool.html"];
const BUILD_ENTRIES = ["assets", "index.html"];

export function isHostingStagePath(candidate, e2eRoot) {
  if (typeof candidate !== "string" || typeof e2eRoot !== "string") return false;
  const root = resolve(e2eRoot);
  const path = resolve(candidate);
  return path === join(root, "hosting") && path.startsWith(root + sep);
}

export function assertCleanViteOutput(directory) {
  const actual = readdirSync(directory).sort();
  if (JSON.stringify(actual) !== JSON.stringify(BUILD_ENTRIES)) {
    throw new Error(`hosting stage refused unexpected Vite output: ${actual.join(",")}`);
  }
}

export function candidateFirebaseConfig() {
  return {
    hosting: {
      public: "public",
      rewrites: [{ source: "/admin", destination: "/admin/index.html" }],
      headers: [
        {
          source: "**/*.html",
          headers: [{ key: "Cache-Control", value: "no-cache, max-age=0, must-revalidate" }],
        },
      ],
    },
  };
}

export function assembleHostingStage({ repoRoot, e2eRoot, mockupOut, adminOut }) {
  const hostingRoot = join(resolve(e2eRoot), "hosting");
  if (!isHostingStagePath(hostingRoot, e2eRoot)) {
    throw new Error("hosting stage must be the guarded E2E temp child");
  }
  if (existsSync(hostingRoot)) throw new Error("hosting stage already exists");
  assertCleanViteOutput(mockupOut);
  assertCleanViteOutput(adminOut);

  const publicRoot = join(hostingRoot, "public");
  mkdirSync(publicRoot, { recursive: true });
  cpSync(join(mockupOut, "index.html"), join(publicRoot, "index.html"));
  cpSync(join(mockupOut, "assets"), join(publicRoot, "assets"), { recursive: true });
  mkdirSync(join(publicRoot, "admin"), { recursive: true });
  cpSync(join(adminOut, "index.html"), join(publicRoot, "admin", "index.html"));
  cpSync(join(adminOut, "assets"), join(publicRoot, "admin", "assets"), { recursive: true });

  for (const file of LEGACY_FILES) {
    const source = join(resolve(repoRoot), file);
    if (!existsSync(source) || basename(source) !== file) {
      throw new Error(`missing required legacy file: ${file}`);
    }
    cpSync(source, join(publicRoot, file));
  }
  writeFileSync(
    join(hostingRoot, "firebase.rebuild.candidate.json"),
    `${JSON.stringify(candidateFirebaseConfig(), null, 2)}\n`,
    "utf8",
  );
  return { hostingRoot, publicRoot };
}
