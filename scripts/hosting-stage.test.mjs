import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assembleHostingStage,
  assertCleanViteOutput,
  candidateFirebaseConfig,
  isHostingStagePath,
  LEGACY_FILES,
} from "./hosting-stage.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "denn-hosting-unit-"));
  const repo = join(root, "repo");
  const e2e = join(root, "denn-e2e-test");
  const mockup = join(e2e, "mockup");
  const admin = join(e2e, "admin");
  for (const dir of [repo, e2e, mockup, admin]) mkdirSync(dir, { recursive: true });
  for (const [dir, name] of [
    [mockup, "mockup"],
    [admin, "admin"],
  ]) {
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "index.html"), name);
    writeFileSync(join(dir, "assets", `${name}.js`), name);
  }
  for (const file of LEGACY_FILES) writeFileSync(join(repo, file), file);
  return { root, repo, e2e, mockup, admin };
}

describe("hosting stage path and output guards", () => {
  it("allows exactly the hosting child of the supplied E2E root", () => {
    expect(isHostingStagePath("C:/temp/run/hosting", "C:/temp/run")).toBe(true);
    expect(isHostingStagePath("C:/temp/run", "C:/temp/run")).toBe(false);
    expect(isHostingStagePath("C:/temp/run/hosting/x", "C:/temp/run")).toBe(false);
    expect(isHostingStagePath("C:/repo/hosting", "C:/temp/run")).toBe(false);
  });

  it("refuses any top-level Vite output beyond index.html and assets", () => {
    const f = fixture();
    try {
      expect(() => assertCleanViteOutput(f.mockup)).not.toThrow();
      writeFileSync(join(f.mockup, "fixture.html"), "no");
      expect(() => assertCleanViteOutput(f.mockup)).toThrow(/unexpected Vite output/);
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });
});

describe("hosting stage assembly", () => {
  it("copies only both builds and the two required legacy files", () => {
    const f = fixture();
    try {
      const out = assembleHostingStage({
        repoRoot: f.repo,
        e2eRoot: f.e2e,
        mockupOut: f.mockup,
        adminOut: f.admin,
      });
      expect(readFileSync(join(out.publicRoot, "index.html"), "utf8")).toBe("mockup");
      expect(readFileSync(join(out.publicRoot, "admin", "index.html"), "utf8")).toBe("admin");
      for (const file of LEGACY_FILES) {
        expect(readFileSync(join(out.publicRoot, file), "utf8")).toBe(file);
      }
      expect(candidateFirebaseConfig().hosting.public).toBe("public");
      expect(candidateFirebaseConfig().hosting.rewrites).toEqual([
        { source: "/admin", destination: "/admin/index.html" },
      ]);
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });
});
