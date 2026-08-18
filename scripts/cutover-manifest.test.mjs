import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateCutoverManifest } from "./cutover-manifest.mjs";

const valid = () => JSON.parse(readFileSync("cutover.local.candidate.json", "utf8"));

describe("cutover manifest", () => {
  it("accepts the checked-in local-only candidate", () => {
    expect(validateCutoverManifest(valid())).toBe(true);
  });

  it.each([
    ["non-demo project", (value) => (value.projectId = "denn-products")],
    ["production enabled", (value) => (value.gates.productionEnabled = true)],
    ["actual write", (value) => (value.gates.actualWriteApproved = true)],
    ["legacy close", (value) => (value.gates.legacyCloseApproved = true)],
    ["deploy command", (value) => value.deployCommands.push("firebase deploy")],
    ["more saves", (value) => (value.canary.intentionalSaves = 2)],
    ["more objects", (value) => (value.canary.maxNewObjects = 2)],
    ["wrong byte cap", (value) => (value.canary.maxObjectBytesExclusive = 20 * 1024 * 1024 + 1)],
    ["real-looking uid", (value) => (value.syntheticOperatorUid = "actual-uid")],
    ["operational rules", (value) => (value.rules.storage = "storage.rules")],
  ])("rejects %s", (_name, mutate) => {
    const value = valid();
    mutate(value);
    expect(validateCutoverManifest(value)).toBe(false);
  });

  it("fails closed for hostile input", () => {
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error("nope");
        },
      },
    );
    expect(validateCutoverManifest(hostile)).toBe(false);
    expect(validateCutoverManifest(null)).toBe(false);
  });
});
