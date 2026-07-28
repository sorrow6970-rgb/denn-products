// Guard contract for the E2E staging cleanup (spec 022 re-verification round 2). The orchestrator
// removes exactly the per-run `mkdtemp` directory it created; this pins that the guard refuses
// anything else — a repo path, the temp root itself, a parent, or a nested path.

import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isDisposableStagingPath, STAGING_PREFIX } from "./e2e-run.mjs";

const TEMP = resolve(tmpdir());

describe("isDisposableStagingPath", () => {
  it("accepts a per-run staging directory directly under the OS temp root", () => {
    expect(isDisposableStagingPath(join(TEMP, `${STAGING_PREFIX}ab12cd`), TEMP)).toBe(true);
  });

  it("refuses the temp root, a parent, a nested path and a foreign name", () => {
    expect(isDisposableStagingPath(TEMP, TEMP)).toBe(false);
    expect(isDisposableStagingPath(resolve(TEMP, ".."), TEMP)).toBe(false);
    expect(isDisposableStagingPath(join(TEMP, `${STAGING_PREFIX}ab`, "mockup"), TEMP)).toBe(false);
    expect(isDisposableStagingPath(join(TEMP, "something-else"), TEMP)).toBe(false);
  });

  it("refuses any repository path", () => {
    const repo = resolve(process.cwd());
    expect(isDisposableStagingPath(repo, TEMP)).toBe(false);
    expect(isDisposableStagingPath(join(repo, "apps", "mockup", "dist"), TEMP)).toBe(false);
    expect(isDisposableStagingPath(join(repo, `${STAGING_PREFIX}x`), TEMP)).toBe(false);
  });

  it("refuses empty or non-string input", () => {
    for (const value of ["", undefined, null, 42, {}]) {
      expect(isDisposableStagingPath(value, TEMP)).toBe(false);
      expect(isDisposableStagingPath(join(TEMP, `${STAGING_PREFIX}a`), value)).toBe(false);
    }
  });
});
