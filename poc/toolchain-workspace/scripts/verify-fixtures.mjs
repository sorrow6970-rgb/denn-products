// spec 009 fixture verifier: proves each quality gate actually FAILS on a bad input.
// It writes a temporary fixture, runs the matching gate, asserts a non-zero exit,
// then removes the fixture so the repo never holds a permanently-failing file.
// Exit 0 only if all three gates correctly rejected their fixture.
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const binDir = join(root, "node_modules", ".bin");
const env = { ...process.env, PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}` };
const appSrc = join(root, "apps", "probe", "src");

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: root, env, shell: true, encoding: "utf8" });
}

const cases = [
  {
    name: "lint (unused import → biome lint --error-on-warnings)",
    file: join(appSrc, "__fx_lint.ts"),
    content: 'import { addPoints } from "@probe/shared-probe";\nexport const unused = 1;\n',
    gate: () => run("biome", ["lint", "--error-on-warnings", "apps/probe/src/__fx_lint.ts"]),
  },
  {
    name: "format (bad spacing → biome format)",
    file: join(appSrc, "__fx_fmt.ts"),
    content: "export const bad     =    {x:1,y:2}\n",
    gate: () => run("biome", ["format", "apps/probe/src/__fx_fmt.ts"]),
  },
  {
    name: "type (type error → tsc --noEmit)",
    file: join(appSrc, "__fx_type.ts"),
    content:
      'import { addPoints } from "@probe/shared-probe";\nconst wrong: number = addPoints({ x: 1, y: 2 }, { x: 3, y: 4 });\nexport { wrong };\n',
    gate: () => run("tsc", ["--noEmit", "-p", "apps/probe/tsconfig.json"]),
  },
];

mkdirSync(appSrc, { recursive: true });
let allOk = true;
for (const c of cases) {
  try {
    writeFileSync(c.file, c.content);
    const res = c.gate();
    const failed = res.status !== 0;
    console.log(`${failed ? "PASS" : "FAIL"} — ${c.name}: gate exit=${res.status} (expected non-zero)`);
    if (!failed) allOk = false;
  } finally {
    rmSync(c.file, { force: true });
  }
}

console.log(allOk ? "\nALL FIXTURES CORRECTLY REJECTED" : "\nA GATE DID NOT REJECT ITS FIXTURE");
process.exit(allOk ? 0 : 1);
