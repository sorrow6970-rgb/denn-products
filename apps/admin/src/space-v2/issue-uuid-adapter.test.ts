// Unit contract for the local Web Crypto UUID adapter (spec 070 §5). Synthetic sources plus ONE
// call to the real local `globalThis.crypto.randomUUID()` — no network, no Firebase, no UI.
//
// NOT covered here, on purpose: randomness quality, entropy and collision freedom. Nothing is
// sampled repeatedly to estimate a distribution; the integration test asserts a single value passes
// the spec 069 format boundary, and that is the whole claim.

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createSpaceV2IssueTokenCandidate } from "./issue-token-candidate";
import { createSpaceV2IssueUuidPort } from "./issue-uuid-adapter";

// --- fixtures ----------------------------------------------------------------

const TOKEN = "0f9c1b2a-4d3e-4f5a-9b6c-7d8e9f0a1b2c";
const UNAVAILABLE = { ok: false, code: "SPACE_V2_UUID_SOURCE_UNAVAILABLE" } as const;

const syntheticSource = (value: string = TOKEN) => {
  const randomUUID = vi.fn(() => value);
  return { randomUUID } as unknown as Pick<Crypto, "randomUUID"> & {
    randomUUID: typeof randomUUID;
  };
};

// --- source binding ----------------------------------------------------------

describe("createSpaceV2IssueUuidPort — source binding", () => {
  it("reads the source method once and calls it only when the port is used", () => {
    let reads = 0;
    const randomUUID = vi.fn(() => TOKEN);
    const source = {
      get randomUUID() {
        reads += 1;
        return randomUUID;
      },
    };

    const port = createSpaceV2IssueUuidPort(source as unknown as Pick<Crypto, "randomUUID">);

    expect(port.ok).toBe(true);
    if (!port.ok) return;
    expect(reads).toBe(1);
    expect(randomUUID).not.toHaveBeenCalled();

    expect(port.value.randomUUID()).toBe(TOKEN);
    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(reads).toBe(1);
  });

  it("keeps the original receiver, so a method-style source works", () => {
    class MethodStyleSource {
      calls = 0;
      readonly token = TOKEN;
      randomUUID(): string {
        this.calls += 1;
        return this.token;
      }
    }
    const source = new MethodStyleSource();

    // `Crypto["randomUUID"]` is typed as a UUID template literal, so a plain `string` method needs
    // the cast; the adapter only ever asks whether it is callable.
    const port = createSpaceV2IssueUuidPort(source as unknown as Pick<Crypto, "randomUUID">);

    expect(port.ok).toBe(true);
    if (!port.ok) return;
    expect(port.value.randomUUID()).toBe(TOKEN);
    expect(source.calls).toBe(1);
  });

  it("cannot be swapped by a drifting getter after the snapshot", () => {
    let reads = 0;
    const source = {
      get randomUUID() {
        reads += 1;
        return reads === 1
          ? () => TOKEN
          : () => {
              throw new Error("swapped");
            };
      },
    };

    const port = createSpaceV2IssueUuidPort(source as unknown as Pick<Crypto, "randomUUID">);
    expect(port.ok).toBe(true);
    if (!port.ok) return;

    expect(port.value.randomUUID()).toBe(TOKEN);
    expect(port.value.randomUUID()).toBe(TOKEN);
    expect(reads).toBe(1);
  });

  it("uses globalThis.crypto when no source is supplied", () => {
    const globalSpy = vi.spyOn(globalThis.crypto, "randomUUID");

    try {
      const port = createSpaceV2IssueUuidPort();
      expect(port.ok).toBe(true);
      if (!port.ok) return;
      expect(globalSpy).not.toHaveBeenCalled();

      const value = port.value.randomUUID();
      expect(globalSpy).toHaveBeenCalledTimes(1);
      expect(typeof value).toBe("string");
    } finally {
      globalSpy.mockRestore();
    }
  });

  it("does not fall back to the global source when an explicit one is supplied", () => {
    const globalSpy = vi.spyOn(globalThis.crypto, "randomUUID");
    const source = syntheticSource();

    try {
      const port = createSpaceV2IssueUuidPort(source);
      expect(port.ok).toBe(true);
      if (!port.ok) return;
      expect(port.value.randomUUID()).toBe(TOKEN);
    } finally {
      globalSpy.mockRestore();
    }

    expect(globalSpy).not.toHaveBeenCalled();
    expect(source.randomUUID).toHaveBeenCalledTimes(1);
  });
});

// --- unavailable sources -----------------------------------------------------

describe("createSpaceV2IssueUuidPort — unavailable sources", () => {
  const malformed = (): [string, unknown][] => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    return [
      ["null", null],
      ["a primitive", "crypto"],
      ["a number", 7],
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

  it.each(malformed())("refuses %s without reaching the global source", (_label, source) => {
    const globalSpy = vi.spyOn(globalThis.crypto, "randomUUID");
    const randomValuesSpy = vi.spyOn(globalThis.crypto, "getRandomValues");
    const randomSpy = vi.spyOn(Math, "random");

    try {
      const result = createSpaceV2IssueUuidPort(source as unknown as Pick<Crypto, "randomUUID">);
      expect(result).toEqual(UNAVAILABLE);
    } finally {
      globalSpy.mockRestore();
      randomValuesSpy.mockRestore();
      randomSpy.mockRestore();
    }

    expect(globalSpy).not.toHaveBeenCalled();
    expect(randomValuesSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
  });

  it("returns nothing but a code on failure", () => {
    const result = createSpaceV2IssueUuidPort(null as unknown as Pick<Crypto, "randomUUID">);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result).sort()).toEqual(["code", "ok"]);
    expect(JSON.stringify(result)).not.toMatch(/Error|stack|crypto\./i);
  });
});

// --- token candidate integration ---------------------------------------------

describe("createSpaceV2IssueUuidPort — spec 069 integration", () => {
  it("feeds a synthetic lowercase UUID v4 straight through the candidate", () => {
    const source = syntheticSource();
    const port = createSpaceV2IssueUuidPort(source);
    expect(port.ok).toBe(true);
    if (!port.ok) return;

    expect(createSpaceV2IssueTokenCandidate(port.value)).toEqual({ ok: true, value: TOKEN });
    expect(source.randomUUID).toHaveBeenCalledTimes(1);
  });

  it("leaves a throwing source to the candidate's generation failure", () => {
    const randomUUID = vi.fn(() => {
      throw new Error("source down");
    });
    const port = createSpaceV2IssueUuidPort({ randomUUID } as unknown as Pick<
      Crypto,
      "randomUUID"
    >);
    expect(port.ok).toBe(true);
    if (!port.ok) return;

    expect(createSpaceV2IssueTokenCandidate(port.value)).toEqual({
      ok: false,
      code: "SPACE_V2_TOKEN_GENERATION_FAILED",
    });
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["an upper-case UUID", TOKEN.toUpperCase()],
    ["a v1 UUID", "0f9c1b2a-4d3e-1f5a-9b6c-7d8e9f0a1b2c"],
    ["an empty string", ""],
  ])("leaves %s to the candidate's output check", (_label, value) => {
    const source = syntheticSource(value);
    const port = createSpaceV2IssueUuidPort(source);
    expect(port.ok).toBe(true);
    if (!port.ok) return;

    expect(createSpaceV2IssueTokenCandidate(port.value)).toEqual({
      ok: false,
      code: "SPACE_V2_TOKEN_INVALID_OUTPUT",
    });
    expect(source.randomUUID).toHaveBeenCalledTimes(1);
  });

  it("passes one real local Web Crypto value through the strict format check", () => {
    // ONE value, once. This asserts the source and the format agree — not entropy, not collisions.
    const port = createSpaceV2IssueUuidPort();
    expect(port.ok).toBe(true);
    if (!port.ok) return;

    const result = createSpaceV2IssueTokenCandidate(port.value);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

// --- boundary ----------------------------------------------------------------

describe("createSpaceV2IssueUuidPort — boundary", () => {
  it("touches no network, byte randomness, DOM, Canvas, clock or console", () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const randomValuesSpy = vi.spyOn(globalThis.crypto, "getRandomValues");
    const subtleSpy = vi.spyOn(globalThis.crypto.subtle, "digest");
    const randomSpy = vi.spyOn(Math, "random");
    const nowSpy = vi.spyOn(Date, "now");
    const logSpy = vi.spyOn(console, "log");
    const errorSpy = vi.spyOn(console, "error");

    try {
      const source = syntheticSource();
      const port = createSpaceV2IssueUuidPort(source);
      expect(port.ok).toBe(true);
      if (port.ok) expect(port.value.randomUUID()).toBe(TOKEN);
      expect(createSpaceV2IssueUuidPort({} as Pick<Crypto, "randomUUID">)).toEqual(UNAVAILABLE);
    } finally {
      globalThis.fetch = originalFetch;
      randomValuesSpy.mockRestore();
      subtleSpy.mockRestore();
      randomSpy.mockRestore();
      nowSpy.mockRestore();
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }

    expect(fetchSpy).not.toHaveBeenCalled();
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

    expect(app).not.toContain("issue-uuid-adapter");
    expect(app).not.toContain("createSpaceV2IssueUuidPort");
  });
});
