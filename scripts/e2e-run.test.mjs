// Guard contract for the E2E staging cleanup (spec 022 re-verification round 2). The orchestrator
// removes exactly the per-run `mkdtemp` directory it created; this pins that the guard refuses
// anything else — a repo path, the temp root itself, a parent, or a nested path.

import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isDisposableStagingPath, selectPlaywrightArgs, STAGING_PREFIX } from "./e2e-run.mjs";

const TEMP = resolve(tmpdir());

describe("spec110 explicit E2E selection", () => {
  it.each(["firefox", "webkit", "chromium"])("spec128 isolates pair paint %s", (engine) => {
    const selector = `--pair-paint-${engine}-only`;
    expect(selectPlaywrightArgs([selector])).toEqual([
      "test",
      "--config",
      "tests/preparation-pair-paint.config.ts",
      `--project=${engine}`,
      "--workers=1",
    ]);
    expect(() => selectPlaywrightArgs([selector, "--timeout=60000"])).toThrow(
      "Unsupported E2E selector",
    );
    expect(() => selectPlaywrightArgs([selector, "--background-lifecycle-only"])).toThrow(
      "Unsupported E2E selector",
    );
  });
  it.each(["firefox", "webkit", "chromium"])("spec126 isolates absence paint %s", (engine) => {
    const selector = `--absence-paint-${engine}-only`;
    expect(selectPlaywrightArgs([selector])).toEqual([
      "test",
      "--config",
      "tests/background-absence-paint.config.ts",
      `--project=${engine}`,
      "--workers=1",
    ]);
    expect(() => selectPlaywrightArgs([selector, "--timeout=60000"])).toThrow(
      "Unsupported E2E selector",
    );
    expect(() => selectPlaywrightArgs([selector, "--background-lifecycle-only"])).toThrow(
      "Unsupported E2E selector",
    );
  });
  it.each(["firefox", "webkit", "chromium"])(
    "spec124 isolates absence preparation %s",
    (engine) => {
      const selector = `--absence-preparation-${engine}-only`;
      expect(selectPlaywrightArgs([selector])).toEqual([
        "test",
        "--config",
        "tests/background-absence-preparation.config.ts",
        `--project=${engine}`,
        "--workers=1",
      ]);
      expect(() => selectPlaywrightArgs([selector, "--timeout=60000"])).toThrow(
        "Unsupported E2E selector",
      );
      expect(() => selectPlaywrightArgs([selector, "--background-lifecycle-only"])).toThrow(
        "Unsupported E2E selector",
      );
    },
  );
  it.each(["firefox", "webkit", "chromium"])("spec122 isolates absence decode %s", (engine) => {
    const selector = `--absence-decode-${engine}-only`;
    expect(selectPlaywrightArgs([selector])).toEqual([
      "test",
      "--config",
      "tests/background-absence-decode.config.ts",
      `--project=${engine}`,
      "--workers=1",
    ]);
    expect(() => selectPlaywrightArgs([selector, "--timeout=60000"])).toThrow(
      "Unsupported E2E selector",
    );
    expect(() => selectPlaywrightArgs([selector, "--background-lifecycle-only"])).toThrow(
      "Unsupported E2E selector",
    );
  });
  it.each(["firefox", "webkit", "chromium"])("spec120 isolates absence owner %s", (engine) => {
    const selector = `--background-absence-${engine}-only`;
    expect(selectPlaywrightArgs([selector])).toEqual([
      "test",
      "--config",
      "tests/background-absence-owner.config.ts",
      `--project=${engine}`,
      "--workers=1",
    ]);
    expect(() => selectPlaywrightArgs([selector, "--timeout=60000"])).toThrow(
      "Unsupported E2E selector",
    );
  });
  it.each(["firefox", "webkit", "chromium"])("spec117 isolates capability %s", (engine) => {
    const selector = `--background-capability-${engine}-only`;
    expect(selectPlaywrightArgs([selector])).toEqual([
      "test",
      "--config",
      "tests/background-png-capability.config.ts",
      `--project=${engine}`,
      "--workers=1",
    ]);
    expect(() => selectPlaywrightArgs([selector, "--timeout=60000"])).toThrow(
      "Unsupported E2E selector",
    );
  });
  it.each(["firefox", "webkit", "chromium"])("spec116 isolates %s with one worker", (engine) => {
    const selector = `--background-${engine}-only`;
    expect(selectPlaywrightArgs([selector])).toEqual([
      "test",
      "--config",
      "tests/background-cross-engine.config.ts",
      `--project=${engine}`,
      "--workers=1",
    ]);
    expect(() => selectPlaywrightArgs([selector, "--timeout=60000"])).toThrow(
      "Unsupported E2E selector",
    );
    expect(() => selectPlaywrightArgs([selector, "--project=other"])).toThrow(
      "Unsupported E2E selector",
    );
  });
  it("spec116 selects only the isolated cross-engine configuration", () => {
    expect(selectPlaywrightArgs(["--background-cross-engine-only"])).toEqual([
      "test",
      "--config",
      "tests/background-cross-engine.config.ts",
    ]);
    expect(() =>
      selectPlaywrightArgs(["--background-cross-engine-only", "--background-lifecycle-only"]),
    ).toThrow("Unsupported E2E selector");
    expect(() =>
      selectPlaywrightArgs(["--background-cross-engine-only", "--project=chromium"]),
    ).toThrow("Unsupported E2E selector");
  });
  it("spec115 selects only native lifecycle and ownership regressions", () => {
    expect(selectPlaywrightArgs(["--background-lifecycle-only"])).toEqual([
      "test",
      "tests/e2e/background-native-lifecycle.spec.ts",
      "tests/e2e/room-background-file.spec.ts",
      "tests/e2e/room-background-evidence.spec.ts",
    ]);
    expect(() =>
      selectPlaywrightArgs(["--background-lifecycle-only", "--native-orientation-only"]),
    ).toThrow("Unsupported E2E selector");
  });
  it("spec111 selects fixed native pixel probe only", () => {
    expect(selectPlaywrightArgs(["--native-orientation-only"])).toEqual([
      "test",
      "tests/e2e/native-orientation-pixel.spec.ts",
    ]);
    expect(() =>
      selectPlaywrightArgs(["--native-orientation-only", "--background-evidence-only"]),
    ).toThrow("Unsupported E2E selector");
  });
  it("preserves default full suite", () => {
    expect(selectPlaywrightArgs([])).toEqual(["test"]);
  });
  it("selects only fixed evidence and legacy ownership checks", () => {
    expect(selectPlaywrightArgs(["--background-evidence-only"])).toEqual([
      "test",
      "tests/e2e/room-background-file.spec.ts",
      "tests/e2e/room-background-evidence.spec.ts",
    ]);
  });
  it.each([
    null,
    {},
    "--background-evidence-only",
    ["other"],
    ["--background-evidence-only", "extra"],
    ["--background-evidence-only", "--background-evidence-only"],
    ["; echo invalid"],
    ["tests/e2e/mockup-browse.spec.ts"],
  ])("rejects unapproved selector %#", (args) => {
    expect(() => selectPlaywrightArgs(args)).toThrow("Unsupported E2E selector");
  });
});

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
