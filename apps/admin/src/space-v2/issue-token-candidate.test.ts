// Unit contract for the local space V2 issue token candidate (spec 069 §5). Synthetic UUID strings
// only — no real token, no network, no Firebase, no UI, and no global randomness: every generator is
// injected.
//
// NOT covered here, on purpose: the randomness quality of a real generator and collision freedom.
// Matching the UUID v4 shape is a FORMAT check; the trust in the real source belongs to a later
// adapter contract.

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  createSpaceV2IssueTokenCandidate,
  type SpaceV2IssueUuidPort,
} from "./issue-token-candidate";

// --- fixtures ----------------------------------------------------------------

const TOKEN = "0f9c1b2a-4d3e-4f5a-9b6c-7d8e9f0a1b2c";

/** Records every call so "at most once" and "never" stay assertable. */
const recordingPort = (value: unknown = TOKEN) => {
  const randomUUID = vi.fn(() => value);
  return { randomUUID } as unknown as SpaceV2IssueUuidPort & { randomUUID: typeof randomUUID };
};

// --- success -----------------------------------------------------------------

describe("createSpaceV2IssueTokenCandidate — success", () => {
  it("returns the port's lowercase UUID v4 unchanged, after exactly one call", () => {
    const uuid = recordingPort();

    const result = createSpaceV2IssueTokenCandidate(uuid);

    expect(result).toEqual({ ok: true, value: TOKEN });
    expect(uuid.randomUUID).toHaveBeenCalledTimes(1);
    expect(uuid.randomUUID).toHaveBeenCalledWith();
  });

  it.each([["8"], ["9"], ["a"], ["b"]])("accepts the variant nibble %s", (variant) => {
    const value = `0f9c1b2a-4d3e-4f5a-${variant}b6c-7d8e9f0a1b2c`;

    expect(createSpaceV2IssueTokenCandidate(recordingPort(value))).toEqual({
      ok: true,
      value,
    });
  });

  it("returns a plain string with no attached metadata", () => {
    const result = createSpaceV2IssueTokenCandidate(recordingPort());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.value).toBe("string");
    expect(Object.keys(result).sort()).toEqual(["ok", "value"]);
  });
});

// --- rejected output ---------------------------------------------------------

describe("createSpaceV2IssueTokenCandidate — rejected output", () => {
  it.each([
    ["an upper-case UUID", TOKEN.toUpperCase()],
    ["a mixed-case UUID", "0F9C1B2A-4d3e-4f5a-9b6c-7d8e9f0a1b2c"],
    ["a v1 UUID", "0f9c1b2a-4d3e-1f5a-9b6c-7d8e9f0a1b2c"],
    ["a v3 UUID", "0f9c1b2a-4d3e-3f5a-9b6c-7d8e9f0a1b2c"],
    ["a v5 UUID", "0f9c1b2a-4d3e-5f5a-9b6c-7d8e9f0a1b2c"],
    ["a c variant", "0f9c1b2a-4d3e-4f5a-cb6c-7d8e9f0a1b2c"],
    ["an f variant", "0f9c1b2a-4d3e-4f5a-fb6c-7d8e9f0a1b2c"],
    ["a leading space", ` ${TOKEN}`],
    ["a trailing newline", `${TOKEN}\n`],
    ["a slash", `${TOKEN}/`],
    ["a path-like value", `spaces/${TOKEN}`],
    ["a png suffix", `${TOKEN}.png`],
    ["a truncated UUID", TOKEN.slice(0, 35)],
    ["an undashed UUID", TOKEN.replaceAll("-", "")],
    ["an empty string", ""],
  ])("rejects %s without repairing or regenerating it", (_label, value) => {
    const uuid = recordingPort(value);

    const result = createSpaceV2IssueTokenCandidate(uuid);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_TOKEN_INVALID_OUTPUT" });
    expect(uuid.randomUUID).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a Promise", Promise.resolve(TOKEN)],
    ["an object", { token: TOKEN }],
    ["a String object", new String(TOKEN)],
    ["a number", 42],
    ["null", null],
    ["undefined", undefined],
    ["an array of one string", [TOKEN]],
  ])("rejects %s as a non-string result", (_label, value) => {
    // Built inline rather than through the helper: a default parameter would swallow `undefined`.
    const randomUUID = vi.fn(() => value);

    const result = createSpaceV2IssueTokenCandidate({
      randomUUID,
    } as unknown as SpaceV2IssueUuidPort);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_TOKEN_INVALID_OUTPUT" });
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });
});

// --- ports -------------------------------------------------------------------

describe("createSpaceV2IssueTokenCandidate — ports", () => {
  const malformed = (): [string, unknown][] => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    return [
      ["undefined", undefined],
      ["null", null],
      ["a primitive", "port"],
      ["an object without the method", {}],
      ["a non-function method", { randomUUID: TOKEN }],
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

  it.each(malformed())("refuses %s, touching no global randomness", (_label, uuid) => {
    const uuidSpy = vi.spyOn(globalThis.crypto, "randomUUID");
    const randomValuesSpy = vi.spyOn(globalThis.crypto, "getRandomValues");
    const randomSpy = vi.spyOn(Math, "random");

    try {
      const result = createSpaceV2IssueTokenCandidate(uuid as unknown as SpaceV2IssueUuidPort);
      expect(result).toEqual({ ok: false, code: "SPACE_V2_TOKEN_INVALID_PORT" });
    } finally {
      uuidSpy.mockRestore();
      randomValuesSpy.mockRestore();
      randomSpy.mockRestore();
    }

    expect(uuidSpy).not.toHaveBeenCalled();
    expect(randomValuesSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
  });

  it("maps a throwing method to a generation failure, with no second attempt", () => {
    const randomUUID = vi.fn(() => {
      throw new Error(`uid=operator-1 token=${TOKEN}`);
    });

    const result = createSpaceV2IssueTokenCandidate({ randomUUID } as SpaceV2IssueUuidPort);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_TOKEN_GENERATION_FAILED" });
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it("reads the method once, so a drifting getter cannot swap it", () => {
    let reads = 0;
    const uuid = {
      get randomUUID() {
        reads += 1;
        return reads === 1
          ? () => TOKEN
          : () => {
              throw new Error("swapped");
            };
      },
    };

    const result = createSpaceV2IssueTokenCandidate(uuid as unknown as SpaceV2IssueUuidPort);

    expect(result).toEqual({ ok: true, value: TOKEN });
    expect(reads).toBe(1);
  });

  it("keeps a method-style port working by preserving its receiver", () => {
    class MethodStylePort {
      calls = 0;
      readonly token = TOKEN;
      randomUUID(): string {
        this.calls += 1;
        return this.token;
      }
    }
    const uuid = new MethodStylePort();

    const result = createSpaceV2IssueTokenCandidate(uuid);

    expect(result).toEqual({ ok: true, value: TOKEN });
    expect(uuid.calls).toBe(1);
  });
});

// --- boundary ----------------------------------------------------------------

describe("createSpaceV2IssueTokenCandidate — boundary", () => {
  it("never leaks the candidate, a message or a stack on failure", () => {
    const failures = [
      createSpaceV2IssueTokenCandidate(undefined as unknown as SpaceV2IssueUuidPort),
      createSpaceV2IssueTokenCandidate({
        randomUUID: () => {
          throw new Error(`token=${TOKEN} uid=operator-1@example.invalid`);
        },
      } as SpaceV2IssueUuidPort),
      createSpaceV2IssueTokenCandidate(recordingPort(TOKEN.toUpperCase())),
    ];

    for (const result of failures) {
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(Object.keys(result).sort()).toEqual(["code", "ok"]);
      expect(result.code).toMatch(/^SPACE_V2_TOKEN_[A-Z_]+$/);
      expect(JSON.stringify(result)).not.toMatch(
        new RegExp(`${TOKEN}|0f9c1b2a|operator-1|@|Error|stack|retry`, "i"),
      );
    }
  });

  it("touches no network, global randomness, DOM, Canvas, clock or console", () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const uuidSpy = vi.spyOn(globalThis.crypto, "randomUUID");
    const randomValuesSpy = vi.spyOn(globalThis.crypto, "getRandomValues");
    const subtleSpy = vi.spyOn(globalThis.crypto.subtle, "digest");
    const randomSpy = vi.spyOn(Math, "random");
    const nowSpy = vi.spyOn(Date, "now");
    const logSpy = vi.spyOn(console, "log");
    const errorSpy = vi.spyOn(console, "error");

    try {
      expect(createSpaceV2IssueTokenCandidate(recordingPort()).ok).toBe(true);
      expect(
        createSpaceV2IssueTokenCandidate({
          randomUUID: () => {
            throw new Error("boom");
          },
        } as SpaceV2IssueUuidPort).ok,
      ).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
      uuidSpy.mockRestore();
      randomValuesSpy.mockRestore();
      subtleSpy.mockRestore();
      randomSpy.mockRestore();
      nowSpy.mockRestore();
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(uuidSpy).not.toHaveBeenCalled();
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

    expect(app).not.toContain("issue-token-candidate");
    expect(app).not.toContain("createSpaceV2IssueTokenCandidate");
  });
});
