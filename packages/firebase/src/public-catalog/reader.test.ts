import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPublicCatalogUrl,
  createPublicCatalogReader,
  DEFAULT_MAX_BYTES,
  DEFAULT_TIMEOUT_MS,
  type FetchLike,
  type FetchLikeResponse,
} from "../index";

const EXPECTED_URL =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/published%2Fstate.json?alt=media";

const LEGACY = JSON.stringify({ models: [{ id: "m", name: "M" }] });
const WARN = JSON.stringify({ models: [{ id: "m", name: "M" }], experimentalFlag: true });
const BAD_CATALOG = JSON.stringify({ models: "invalid" });

function response(opts: {
  ok?: boolean;
  status?: number;
  headers?: Record<string, string>;
  text?: string;
  onText?: () => void;
}): FetchLikeResponse {
  const headers = opts.headers ?? {};
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    headers: { get: (n) => headers[n.toLowerCase()] ?? null },
    text: async () => {
      opts.onText?.();
      return opts.text ?? "";
    },
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("buildPublicCatalogUrl + constants", () => {
  it("is the deterministic media URL with %2F-encoded object path", () => {
    expect(buildPublicCatalogUrl()).toBe(EXPECTED_URL);
    expect(buildPublicCatalogUrl()).not.toMatch(/cb=|[?&]t=|Date/);
  });
  it("exposes the documented defaults", () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(10_000);
    expect(DEFAULT_MAX_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("transport contract", () => {
  it("issues a GET no-store request to the fixed URL with no body/header", async () => {
    const seen: { url?: string; init?: Record<string, unknown> } = {};
    const fetch: FetchLike = async (url, init) => {
      seen.url = url;
      seen.init = init as unknown as Record<string, unknown>;
      return response({ text: LEGACY });
    };
    await createPublicCatalogReader({ fetch }).load({ correlationId: "c" });
    expect(seen.url).toBe(EXPECTED_URL);
    expect(seen.init?.method).toBe("GET");
    expect(seen.init?.cache).toBe("no-store");
    expect(Object.keys(seen.init ?? {}).sort()).toEqual(["cache", "method", "signal"]);
  });

  it("never calls global fetch when a transport is injected", async () => {
    const orig = (globalThis as { fetch?: unknown }).fetch;
    const spy = vi.fn(() => {
      throw new Error("global fetch must not be called");
    });
    (globalThis as { fetch?: unknown }).fetch = spy;
    try {
      const fetch: FetchLike = async () => response({ text: LEGACY });
      const res = await createPublicCatalogReader({ fetch }).load({ correlationId: "c" });
      expect(res.ok).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      (globalThis as { fetch?: unknown }).fetch = orig;
    }
  });
});

describe("success", () => {
  it("returns a Catalog V1 document + report for legacy JSON", async () => {
    const fetch: FetchLike = async () => response({ text: LEGACY });
    const res = await createPublicCatalogReader({ fetch }).load({ correlationId: "c1" });
    expect(res).toMatchObject({ ok: true, source: "network", correlationId: "c1" });
    if (res.ok) {
      expect(res.document.schemaVersion).toBe(1);
      expect(res.report.counts.models).toBe(1);
    }
  });

  it("passes through catalog warnings without hiding them", async () => {
    const fetch: FetchLike = async () => response({ text: WARN });
    const res = await createPublicCatalogReader({ fetch }).load({ correlationId: "c" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.report.warnings.map((w) => w.code)).toContain("UNKNOWN_FIELD");
  });
});

describe("HTTP mapping", () => {
  const cases: Array<[number, string, string, boolean]> = [
    [404, "PUBLIC_CATALOG_NOT_FOUND", "NETWORK", false],
    [401, "PUBLIC_CATALOG_FORBIDDEN", "AUTH", false],
    [403, "PUBLIC_CATALOG_FORBIDDEN", "AUTH", false],
    [429, "PUBLIC_CATALOG_RATE_LIMITED", "NETWORK", true],
    [500, "PUBLIC_CATALOG_SERVER_ERROR", "NETWORK", true],
    [503, "PUBLIC_CATALOG_SERVER_ERROR", "NETWORK", true],
    [418, "PUBLIC_CATALOG_HTTP_ERROR", "NETWORK", false],
  ];
  for (const [status, code, category, retryable] of cases) {
    it(`maps HTTP ${status} → ${code}`, async () => {
      const fetch: FetchLike = async () => response({ ok: false, status });
      const res = await createPublicCatalogReader({ fetch }).load({ correlationId: "c" });
      expect(res).toEqual({
        ok: false,
        error: { category, code, retryable, correlationId: "c", httpStatus: status },
      });
    });
  }
});

describe("network / timeout / abort", () => {
  it("maps a fetch rejection to NETWORK_UNAVAILABLE (retryable)", async () => {
    const fetch: FetchLike = async () => {
      throw new Error("offline");
    };
    const res = await createPublicCatalogReader({ fetch }).load({ correlationId: "c" });
    expect(res).toMatchObject({
      ok: false,
      error: { code: "NETWORK_UNAVAILABLE", retryable: true },
    });
  });

  it("times out via the internal controller and clears the timer", async () => {
    vi.useFakeTimers();
    const fetch: FetchLike = (_url, init) =>
      new Promise((_res, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    const p = createPublicCatalogReader({ fetch, timeoutMs: 1000 }).load({ correlationId: "c" });
    await vi.advanceTimersByTimeAsync(1000);
    const res = await p;
    expect(res).toMatchObject({ ok: false, error: { code: "NETWORK_TIMEOUT", retryable: true } });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns REQUEST_ABORTED for a pre-aborted caller without fetching", async () => {
    let calls = 0;
    const fetch: FetchLike = async () => {
      calls++;
      return response({ text: LEGACY });
    };
    const ac = new AbortController();
    ac.abort();
    const res = await createPublicCatalogReader({ fetch }).load({
      correlationId: "c",
      signal: ac.signal,
    });
    expect(res).toMatchObject({
      ok: false,
      error: { code: "REQUEST_ABORTED", correlationId: "c" },
    });
    expect(calls).toBe(0);
  });

  it("cleans up the caller abort listener on normal completion", async () => {
    const ac = new AbortController();
    const remove = vi.spyOn(ac.signal, "removeEventListener");
    const fetch: FetchLike = async () => response({ text: LEGACY });
    await createPublicCatalogReader({ fetch }).load({ correlationId: "c", signal: ac.signal });
    expect(remove).toHaveBeenCalled();
  });
});

describe("timeout is enforced regardless of transport cooperation", () => {
  it("times out even if the transport ignores the signal and stays pending", async () => {
    vi.useFakeTimers();
    const fetch: FetchLike = () => new Promise<FetchLikeResponse>(() => {}); // never settles
    const p = createPublicCatalogReader({ fetch, timeoutMs: 1000 }).load({ correlationId: "c" });
    await vi.advanceTimersByTimeAsync(1000);
    const res = await p;
    expect(res).toMatchObject({ ok: false, error: { code: "NETWORK_TIMEOUT" } });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("times out even if response.text() ignores the signal and stays pending", async () => {
    vi.useFakeTimers();
    const fetch: FetchLike = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: () => new Promise<string>(() => {}), // never settles
    });
    const p = createPublicCatalogReader({ fetch, timeoutMs: 1000 }).load({ correlationId: "c" });
    await vi.advanceTimersByTimeAsync(1000);
    const res = await p;
    expect(res).toMatchObject({ ok: false, error: { code: "NETWORK_TIMEOUT" } });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not let a late transport success overwrite the timeout result", async () => {
    vi.useFakeTimers();
    const d = deferred<FetchLikeResponse>();
    const fetch: FetchLike = () => d.promise; // ignores signal
    const p = createPublicCatalogReader({ fetch, timeoutMs: 1000 }).load({ correlationId: "c" });
    await vi.advanceTimersByTimeAsync(1000);
    const res = await p;
    expect(res).toMatchObject({ ok: false, error: { code: "NETWORK_TIMEOUT" } });
    // late success arrives → must not change the already-settled result
    d.resolve(response({ text: LEGACY }));
    await vi.advanceTimersByTimeAsync(0);
    expect(res.ok).toBe(false);
  });

  it("clears in-flight on timeout so the next load starts a new fetch", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetch: FetchLike = () => {
      calls++;
      return new Promise<FetchLikeResponse>(() => {});
    };
    const reader = createPublicCatalogReader({ fetch, timeoutMs: 1000 });
    const p1 = reader.load({ correlationId: "c1" });
    await vi.advanceTimersByTimeAsync(1000);
    await p1;
    expect(calls).toBe(1);
    const p2 = reader.load({ correlationId: "c2" });
    await vi.advanceTimersByTimeAsync(1000);
    await p2;
    expect(calls).toBe(2);
  });

  it("produces no unhandled rejection when the transport rejects late", async () => {
    vi.useFakeTimers();
    const rejections: unknown[] = [];
    const onUnhandled = (r: unknown): void => {
      rejections.push(r);
    };
    process.on("unhandledRejection", onUnhandled);
    try {
      let rejectFn: ((e: unknown) => void) | undefined;
      const fetch: FetchLike = () =>
        new Promise<FetchLikeResponse>((_res, rej) => {
          rejectFn = rej;
        });
      const p = createPublicCatalogReader({ fetch, timeoutMs: 1000 }).load({ correlationId: "c" });
      await vi.advanceTimersByTimeAsync(1000);
      const res = await p;
      expect(res).toMatchObject({ ok: false, error: { code: "NETWORK_TIMEOUT" } });
      rejectFn?.(new Error("late reject"));
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
      expect(rejections).toEqual([]);
    } finally {
      process.removeListener("unhandledRejection", onUnhandled);
    }
  });
});

describe("in-flight dedup + per-caller cancellation (caller isolation)", () => {
  it("aborting one caller does not fail the other; underlying fetch continues (1 fetch)", async () => {
    let calls = 0;
    const d = deferred<FetchLikeResponse>();
    const fetch: FetchLike = () => {
      calls++;
      return d.promise;
    };
    const reader = createPublicCatalogReader({ fetch });
    const ac = new AbortController();
    const p1 = reader.load({ correlationId: "c1", signal: ac.signal });
    const p2 = reader.load({ correlationId: "c2" });

    ac.abort();
    const r1 = await p1;
    expect(r1).toMatchObject({
      ok: false,
      error: { code: "REQUEST_ABORTED", correlationId: "c1" },
    });

    d.resolve(response({ text: LEGACY }));
    const r2 = await p2;
    expect(r2.ok).toBe(true);
    expect(calls).toBe(1);
    // late success does not overwrite the already-aborted caller
    expect(r1.ok).toBe(false);
  });

  it("merges concurrent loads into one fetch, then a new fetch after settle", async () => {
    let calls = 0;
    const fetch: FetchLike = async () => {
      calls++;
      return response({ text: LEGACY });
    };
    const reader = createPublicCatalogReader({ fetch });
    const [a, b] = await Promise.all([
      reader.load({ correlationId: "a" }),
      reader.load({ correlationId: "b" }),
    ]);
    expect(a.ok && b.ok).toBe(true);
    expect(calls).toBe(1);
    const c = await reader.load({ correlationId: "c" });
    expect(c.ok).toBe(true);
    expect(calls).toBe(2);
  });
});

describe("response size", () => {
  it("rejects on Content-Length before consuming the body", async () => {
    let textConsumed = false;
    const fetch: FetchLike = async () =>
      response({
        headers: { "content-length": String(20) },
        text: "xxxxxxxxxxxxxxxxxxxx",
        onText: () => {
          textConsumed = true;
        },
      });
    const res = await createPublicCatalogReader({ fetch, maxBytes: 10 }).load({
      correlationId: "c",
    });
    expect(res).toMatchObject({ ok: false, error: { code: "RESPONSE_TOO_LARGE" } });
    expect(textConsumed).toBe(false);
  });

  it("rejects on actual UTF-8 byte length (not string.length)", async () => {
    const body = "가".repeat(5); // 5 chars, 15 UTF-8 bytes
    const fetch: FetchLike = async () => response({ text: body });
    const res = await createPublicCatalogReader({ fetch, maxBytes: 10 }).load({
      correlationId: "c",
    });
    expect(body.length).toBeLessThan(10);
    expect(res).toMatchObject({ ok: false, error: { code: "RESPONSE_TOO_LARGE" } });
  });
});

describe("JSON / catalog validation", () => {
  it("maps invalid JSON to INVALID_JSON", async () => {
    const fetch: FetchLike = async () => response({ text: "{not json" });
    const res = await createPublicCatalogReader({ fetch }).load({ correlationId: "c" });
    expect(res).toMatchObject({
      ok: false,
      error: { code: "INVALID_JSON", category: "VALIDATION" },
    });
  });

  it("maps a spec-012 fatal to INVALID_CATALOG with issue code/path only", async () => {
    const fetch: FetchLike = async () => response({ text: BAD_CATALOG });
    const res = await createPublicCatalogReader({ fetch }).load({ correlationId: "c" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_CATALOG");
      expect(res.error.catalogIssues?.[0]).toEqual({
        code: "COLLECTION_NOT_ARRAY",
        path: "models",
      });
    }
  });
});

describe("validation of request/config", () => {
  it("rejects empty and whitespace-only correlationId before any fetch", async () => {
    for (const id of ["", "   ", "\t\n"]) {
      let calls = 0;
      const fetch: FetchLike = async () => {
        calls++;
        return response({ text: LEGACY });
      };
      const res = await createPublicCatalogReader({ fetch }).load({ correlationId: id });
      expect(res).toMatchObject({
        ok: false,
        error: { code: "INVALID_REQUEST", correlationId: id },
      });
      expect(calls).toBe(0);
    }
  });

  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    it(`rejects invalid timeoutMs=${bad}`, async () => {
      const fetch: FetchLike = async () => response({ text: LEGACY });
      const res = await createPublicCatalogReader({ fetch, timeoutMs: bad }).load({
        correlationId: "c",
      });
      expect(res).toMatchObject({ ok: false, error: { code: "INVALID_REQUEST" } });
    });
  }

  it("rejects invalid maxBytes", async () => {
    const fetch: FetchLike = async () => response({ text: LEGACY });
    const res = await createPublicCatalogReader({ fetch, maxBytes: 0 }).load({
      correlationId: "c",
    });
    expect(res).toMatchObject({ ok: false, error: { code: "INVALID_REQUEST" } });
  });
});

describe("no sensitive data in errors", () => {
  it("omits body / full URL / base64 from error envelopes", async () => {
    const secretBody = 'data:image/png;base64,SECRETSECRET {"tok":"abc"}';
    const fetch: FetchLike = async () => response({ text: secretBody });
    const res = await createPublicCatalogReader({ fetch }).load({ correlationId: "c" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      const serialized = JSON.stringify(res.error);
      expect(serialized).not.toContain("SECRET");
      expect(serialized).not.toContain("firebasestorage.googleapis.com");
      expect(serialized).not.toContain("base64");
      expect(Object.keys(res.error).sort()).toEqual([
        "category",
        "code",
        "correlationId",
        "retryable",
      ]);
    }
  });
});
