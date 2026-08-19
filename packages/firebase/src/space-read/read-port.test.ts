import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpaceReadFirebaseFacade } from "./facade";
import { createSpaceDocumentReadPort, createSpaceDocumentReadPortWithTimeout } from "./read-port";
import { isValidSpaceToken } from "./token";

function facade(readDocument: SpaceReadFirebaseFacade["readDocument"]): SpaceReadFirebaseFacade {
  return { readDocument: vi.fn(readDocument) };
}

afterEach(() => vi.useRealTimers());

describe("space token", () => {
  it.each(["0123456789abcdef01234567", "legacy custom token", "한글😀", "a".repeat(1_500)])(
    "accepts a compatible Firestore document id",
    (token) => expect(isValidSpaceToken(token)).toBe(true),
  );

  it.each([null, "", ".", "..", "a/b", "__reserved__", "\ud800", "\udc00", "가".repeat(501)])(
    "rejects an invalid Firestore document id",
    (token) => expect(isValidSpaceToken(token)).toBe(false),
  );
});

describe("space document read port", () => {
  it("returns one raw document for the fixed spaces collection facade", async () => {
    const sdk = facade(async () => ({
      exists: true,
      data: { schema: "space-v1", secret: "cipher" },
    }));
    await expect(
      createSpaceDocumentReadPort(sdk).load({ token: "legacy-token", correlationId: "request_1" }),
    ).resolves.toEqual({
      ok: true,
      value: { document: { schema: "space-v1", secret: "cipher" }, correlationId: "request_1" },
    });
    expect(sdk.readDocument).toHaveBeenCalledOnce();
    expect(sdk.readDocument).toHaveBeenCalledWith("legacy-token");
  });

  it.each([
    [{ token: "a/b", correlationId: "request_1" }],
    [{ token: "valid", correlationId: "bad id" }],
    [{ token: null, correlationId: "request_1" }],
  ])("rejects invalid requests before the facade", async (request) => {
    const sdk = facade(async () => ({ exists: true, data: {} }));
    const result = await createSpaceDocumentReadPort(sdk).load(request);
    expect(result).toEqual({
      ok: false,
      error: { code: "SPACE_READ_INVALID_REQUEST", retryable: false, correlationId: "" },
    });
    expect(sdk.readDocument).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(String(request.token));
  });

  it("distinguishes document absence without exposing the token", async () => {
    const sdk = facade(async () => ({ exists: false }));
    const result = await createSpaceDocumentReadPort(sdk).load({
      token: "private-link-token",
      correlationId: "request_2",
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "SPACE_READ_NOT_FOUND", retryable: false, correlationId: "request_2" },
    });
    expect(JSON.stringify(result)).not.toContain("private-link-token");
  });

  it.each([
    ["permission-denied", "SPACE_READ_FORBIDDEN", false],
    ["resource-exhausted", "SPACE_READ_RATE_LIMITED", true],
    ["unavailable", "SPACE_READ_NETWORK_UNAVAILABLE", true],
    ["deadline-exceeded", "SPACE_READ_TIMEOUT", true],
    ["unknown", "SPACE_READ_UNEXPECTED", false],
  ])("maps %s to a safe error", async (raw, code, retryable) => {
    const sdk = facade(async () => Promise.reject({ code: raw, message: "raw-secret" }));
    const result = await createSpaceDocumentReadPort(sdk).load({
      token: "token",
      correlationId: "req",
    });
    expect(result).toEqual({ ok: false, error: { code, retryable, correlationId: "req" } });
    expect(JSON.stringify(result)).not.toContain("raw-secret");
  });

  it("times out and discards a late result", async () => {
    vi.useFakeTimers();
    let resolve!: (value: { exists: true; data: unknown }) => void;
    const sdk = facade(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = createSpaceDocumentReadPortWithTimeout(sdk, 5).load({
      token: "token",
      correlationId: "req",
    });
    await vi.advanceTimersByTimeAsync(5);
    await expect(pending).resolves.toEqual({
      ok: false,
      error: { code: "SPACE_READ_TIMEOUT", retryable: true, correlationId: "req" },
    });
    resolve({ exists: true, data: { raw: "late-secret" } });
    await Promise.resolve();
    await expect(pending).resolves.not.toContain("late-secret");
  });

  it("fails closed for a hostile SDK error", async () => {
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error("raw-secret");
        },
      },
    );
    const sdk = facade(async () => Promise.reject(hostile));
    await expect(
      createSpaceDocumentReadPort(sdk).load({ token: "token", correlationId: "req" }),
    ).resolves.toEqual({
      ok: false,
      error: { code: "SPACE_READ_UNEXPECTED", retryable: false, correlationId: "req" },
    });
  });
});
