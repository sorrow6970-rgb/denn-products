// Unit contract for the local space V2 issue identity pair (spec 071 §5, Founder HH-1=A). Synthetic
// UUID sequences only — no real token, no network, no Firebase, no UI, and no global randomness.
//
// NOT covered here, on purpose: randomness quality and collision freedom. Two values that match the
// UUID v4 shape and differ from each other prove neither.

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createSpaceV2IssueIdentityPair } from "./issue-identity-pair";
import type { SpaceV2IssueUuidPort } from "./issue-token-candidate";

// --- fixtures ----------------------------------------------------------------

const ASSET_ID = "0f9c1b2a-4d3e-4f5a-9b6c-7d8e9f0a1b2c";
const TOKEN = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

/** Hands out the given values in order; running past the end is an explicit test failure. */
const sequenceSource = (...values: unknown[]) => {
  const randomUUID = vi.fn(() => {
    if (randomUUID.mock.calls.length > values.length) {
      throw new Error("source called more times than the test allows");
    }
    return values[randomUUID.mock.calls.length - 1];
  });
  return { randomUUID } as unknown as SpaceV2IssueUuidPort & { randomUUID: typeof randomUUID };
};

// --- success -----------------------------------------------------------------

describe("createSpaceV2IssueIdentityPair — success", () => {
  it("takes the asset id first and the token second, in exactly two calls", () => {
    const uuid = sequenceSource(ASSET_ID, TOKEN);

    const result = createSpaceV2IssueIdentityPair(uuid);

    expect(result).toEqual({ ok: true, value: { assetId: ASSET_ID, token: TOKEN } });
    expect(uuid.randomUUID).toHaveBeenCalledTimes(2);
  });

  it("returns a plain pair with exactly the two keys", () => {
    const result = createSpaceV2IssueIdentityPair(sequenceSource(ASSET_ID, TOKEN));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.value).sort()).toEqual(["assetId", "token"]);
    expect(result.value.assetId).not.toBe(result.value.token);
  });

  it("preserves the receiver, so a method-style source keeps its own state", () => {
    class MethodStyleSource {
      calls = 0;
      readonly values = [ASSET_ID, TOKEN];
      randomUUID(): string {
        this.calls += 1;
        return this.values[this.calls - 1] as string;
      }
    }
    const source = new MethodStyleSource();

    const result = createSpaceV2IssueIdentityPair(source);

    // Both calls reached the instance, so `this.calls` and `this.values` worked throughout.
    expect(source.calls).toBe(2);
    expect(result).toEqual({ ok: true, value: { assetId: ASSET_ID, token: TOKEN } });
  });

  it("reads the source method once even though it runs twice", () => {
    let reads = 0;
    const values = [ASSET_ID, TOKEN];
    let index = 0;
    const uuid = {
      get randomUUID() {
        reads += 1;
        return () => values[index++] as string;
      },
    };

    const result = createSpaceV2IssueIdentityPair(uuid as unknown as SpaceV2IssueUuidPort);

    expect(reads).toBe(1);
    expect(index).toBe(2);
    expect(result).toEqual({ ok: true, value: { assetId: ASSET_ID, token: TOKEN } });
  });

  it("uses only the first snapshot when the method getter drifts", () => {
    let reads = 0;
    const values = [ASSET_ID, TOKEN];
    let index = 0;
    const uuid = {
      get randomUUID() {
        reads += 1;
        return reads === 1
          ? () => values[index++] as string
          : () => {
              throw new Error("swapped");
            };
      },
    };

    const result = createSpaceV2IssueIdentityPair(uuid as unknown as SpaceV2IssueUuidPort);

    expect(result).toEqual({ ok: true, value: { assetId: ASSET_ID, token: TOKEN } });
    expect(reads).toBe(1);
  });
});

// --- rejected port -----------------------------------------------------------

describe("createSpaceV2IssueIdentityPair — rejected port", () => {
  const malformed = (): [string, unknown][] => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    return [
      ["undefined", undefined],
      ["null", null],
      ["a primitive", "port"],
      ["an object without the method", {}],
      ["a non-function method", { randomUUID: ASSET_ID }],
      [
        "a throwing method getter",
        {
          get randomUUID(): unknown {
            throw new Error("revoked");
          },
        },
      ],
      ["a revoked proxy", revocable.proxy],
    ];
  };

  it.each(malformed())("refuses %s, calling no source and no global randomness", (_label, uuid) => {
    const globalUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID");
    const randomValuesSpy = vi.spyOn(globalThis.crypto, "getRandomValues");
    const randomSpy = vi.spyOn(Math, "random");

    try {
      const result = createSpaceV2IssueIdentityPair(uuid as unknown as SpaceV2IssueUuidPort);
      expect(result).toEqual({ ok: false, code: "SPACE_V2_IDENTITY_INVALID_PORT" });
    } finally {
      globalUuidSpy.mockRestore();
      randomValuesSpy.mockRestore();
      randomSpy.mockRestore();
    }

    expect(globalUuidSpy).not.toHaveBeenCalled();
    expect(randomValuesSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
  });
});

// --- first value -------------------------------------------------------------

describe("createSpaceV2IssueIdentityPair — asset id step", () => {
  it("stops after one call when the source throws on the first value", () => {
    const randomUUID = vi.fn(() => {
      throw new Error(`uid=operator-1 token=${TOKEN}`);
    });

    const result = createSpaceV2IssueIdentityPair({
      randomUUID,
    } as unknown as SpaceV2IssueUuidPort);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_IDENTITY_ASSET_ID_FAILED" });
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["an upper-case UUID", ASSET_ID.toUpperCase()],
    ["a v1 UUID", "0f9c1b2a-4d3e-1f5a-9b6c-7d8e9f0a1b2c"],
    ["a bad variant", "0f9c1b2a-4d3e-4f5a-cb6c-7d8e9f0a1b2c"],
    ["an empty string", ""],
    ["a non-string", 42],
  ])("stops after one call when the first value is %s", (_label, first) => {
    const uuid = sequenceSource(first, TOKEN);

    const result = createSpaceV2IssueIdentityPair(uuid);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_IDENTITY_ASSET_ID_FAILED" });
    expect(uuid.randomUUID).toHaveBeenCalledTimes(1);
  });
});

// --- second value ------------------------------------------------------------

describe("createSpaceV2IssueIdentityPair — token step", () => {
  it("stops after two calls when the source throws on the second value", () => {
    let calls = 0;
    const randomUUID = vi.fn(() => {
      calls += 1;
      if (calls === 1) return ASSET_ID;
      throw new Error("source down");
    });

    const result = createSpaceV2IssueIdentityPair({
      randomUUID,
    } as unknown as SpaceV2IssueUuidPort);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_IDENTITY_TOKEN_FAILED" });
    expect(randomUUID).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["an upper-case UUID", TOKEN.toUpperCase()],
    ["a v5 UUID", "1a2b3c4d-5e6f-5a7b-8c9d-0e1f2a3b4c5d"],
    ["a path-like value", `spaces/${TOKEN}`],
    ["an empty string", ""],
    ["a non-string", null],
  ])("stops after two calls when the second value is %s", (_label, second) => {
    const uuid = sequenceSource(ASSET_ID, second);

    const result = createSpaceV2IssueIdentityPair(uuid);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_IDENTITY_TOKEN_FAILED" });
    expect(uuid.randomUUID).toHaveBeenCalledTimes(2);
  });
});

// --- collision ---------------------------------------------------------------

describe("createSpaceV2IssueIdentityPair — collision", () => {
  it("refuses two identical values instead of asking a third time", () => {
    const uuid = sequenceSource(ASSET_ID, ASSET_ID);

    const result = createSpaceV2IssueIdentityPair(uuid);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_IDENTITY_COLLISION" });
    expect(uuid.randomUUID).toHaveBeenCalledTimes(2);
  });

  it("does not treat a differing pair as a collision", () => {
    const uuid = sequenceSource(ASSET_ID, TOKEN);

    expect(createSpaceV2IssueIdentityPair(uuid).ok).toBe(true);
    expect(uuid.randomUUID).toHaveBeenCalledTimes(2);
  });
});

// --- boundary ----------------------------------------------------------------

describe("createSpaceV2IssueIdentityPair — boundary", () => {
  it("never leaks a child code, a candidate value or a message on failure", () => {
    const failures = [
      createSpaceV2IssueIdentityPair(undefined as unknown as SpaceV2IssueUuidPort),
      createSpaceV2IssueIdentityPair(sequenceSource(ASSET_ID.toUpperCase(), TOKEN)),
      createSpaceV2IssueIdentityPair(sequenceSource(ASSET_ID, TOKEN.toUpperCase())),
      createSpaceV2IssueIdentityPair(sequenceSource(ASSET_ID, ASSET_ID)),
      createSpaceV2IssueIdentityPair({
        randomUUID: () => {
          throw new Error(`token=${TOKEN} uid=operator-1@example.invalid`);
        },
      } as unknown as SpaceV2IssueUuidPort),
    ];

    for (const result of failures) {
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(Object.keys(result).sort()).toEqual(["code", "ok"]);
      expect(result.code).toMatch(/^SPACE_V2_IDENTITY_[A-Z_]+$/);
      expect(JSON.stringify(result)).not.toMatch(
        new RegExp(
          `${ASSET_ID}|${TOKEN}|0f9c1b2a|1a2b3c4d|SPACE_V2_TOKEN|operator-1|@|Error|retry`,
          "i",
        ),
      );
    }
  });

  it("touches no network, global randomness, DOM, Canvas, clock or console", () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const globalUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID");
    const randomValuesSpy = vi.spyOn(globalThis.crypto, "getRandomValues");
    const subtleSpy = vi.spyOn(globalThis.crypto.subtle, "digest");
    const randomSpy = vi.spyOn(Math, "random");
    const nowSpy = vi.spyOn(Date, "now");
    const logSpy = vi.spyOn(console, "log");
    const errorSpy = vi.spyOn(console, "error");

    try {
      expect(createSpaceV2IssueIdentityPair(sequenceSource(ASSET_ID, TOKEN)).ok).toBe(true);
      expect(createSpaceV2IssueIdentityPair(sequenceSource(ASSET_ID, ASSET_ID)).ok).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
      globalUuidSpy.mockRestore();
      randomValuesSpy.mockRestore();
      subtleSpy.mockRestore();
      randomSpy.mockRestore();
      nowSpy.mockRestore();
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(globalUuidSpy).not.toHaveBeenCalled();
    expect(randomValuesSpy).not.toHaveBeenCalled();
    expect(subtleSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
    expect(nowSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect("document" in globalThis).toBe(false);
    expect("HTMLCanvasElement" in globalThis).toBe(false);
  });

  it("stays out of the admin UI: App.tsx never imports or calls it", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

    expect(app).not.toContain("issue-identity-pair");
    expect(app).not.toContain("createSpaceV2IssueIdentityPair");
  });
});
