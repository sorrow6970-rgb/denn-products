import type { PublicCatalogLoadResult, PublicCatalogReader } from "@denn/firebase";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicCatalogController } from "./controller";

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const okResult = (warnings: number): PublicCatalogLoadResult =>
  ({
    ok: true,
    source: "network",
    correlationId: "x",
    document: { schemaVersion: 1, migratedFrom: "legacy-v0", data: {} },
    report: {
      sourceVersion: "legacy-v0",
      defaultsApplied: [],
      warnings: Array.from({ length: warnings }, () => ({ code: "UNKNOWN_FIELD", path: "p" })),
      unknownPaths: [],
      extensions: {},
      counts: {},
      imageReferences: { dataUrl: 0, storagePath: 0, dual: 0 },
    },
  }) as unknown as PublicCatalogLoadResult;

const errResult = (code: string, retryable: boolean): PublicCatalogLoadResult =>
  ({
    ok: false,
    error: {
      category: "NETWORK",
      code,
      retryable,
      correlationId: "x",
      catalogIssues: [{ code: "DUPLICATE_ID", path: "frameSizes[secret].id" }],
    },
  }) as unknown as PublicCatalogLoadResult;

/** Reader whose queued results resolve one per load() call. */
function queuedReader(results: Array<Promise<PublicCatalogLoadResult>>): {
  reader: PublicCatalogReader;
  calls: () => number;
  signals: AbortSignal[];
} {
  let i = 0;
  const signals: AbortSignal[] = [];
  const reader: PublicCatalogReader = {
    load: ({ signal }) => {
      if (signal) signals.push(signal);
      const p = results[i] ?? Promise.resolve(okResult(0));
      i++;
      return p;
    },
  };
  return { reader, calls: () => i, signals };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PublicCatalogController", () => {
  it("goes idle → loading → ready and passes warningCount", async () => {
    const d = deferred<PublicCatalogLoadResult>();
    const c = new PublicCatalogController(queuedReader([d.promise]).reader);
    expect(c.getState()).toEqual({ status: "idle" });
    c.start();
    expect(c.getState().status).toBe("loading");
    d.resolve(okResult(3));
    await Promise.resolve();
    const s = c.getState();
    expect(s.status).toBe("ready");
    if (s.status === "ready") expect(s.warningCount).toBe(3);
  });

  it("keeps only code/retryable on error and discards catalogIssues/path", async () => {
    const c = new PublicCatalogController(
      queuedReader([Promise.resolve(errResult("INVALID_CATALOG", false))]).reader,
    );
    c.start();
    await Promise.resolve();
    const s = c.getState();
    expect(s.status).toBe("error");
    if (s.status === "error") {
      expect(s.code).toBe("INVALID_CATALOG");
      expect(s.retryable).toBe(false);
      expect(JSON.stringify(s)).not.toContain("secret");
      expect(JSON.stringify(s)).not.toContain("catalogIssues");
    }
  });

  it("retryable error → manual retry → ready", async () => {
    const d2 = deferred<PublicCatalogLoadResult>();
    const q = queuedReader([Promise.resolve(errResult("NETWORK_TIMEOUT", true)), d2.promise]);
    const c = new PublicCatalogController(q.reader);
    c.start();
    await Promise.resolve();
    expect(c.getState().status).toBe("error");
    c.retry();
    expect(c.getState().status).toBe("loading");
    d2.resolve(okResult(0));
    await Promise.resolve();
    expect(c.getState().status).toBe("ready");
    expect(q.calls()).toBe(2);
  });

  it("does not retry a non-retryable error", () => {
    const q = queuedReader([Promise.resolve(errResult("INVALID_CATALOG", false))]);
    const c = new PublicCatalogController(q.reader);
    c.start();
    return Promise.resolve().then(() => {
      c.retry();
      expect(c.getState().status).toBe("error");
      expect(q.calls()).toBe(1);
    });
  });

  it("ignores duplicate retry clicks (one extra load)", async () => {
    const q = queuedReader([
      Promise.resolve(errResult("NETWORK_TIMEOUT", true)),
      new Promise<PublicCatalogLoadResult>(() => {}),
    ]);
    const c = new PublicCatalogController(q.reader);
    c.start();
    await Promise.resolve();
    c.retry();
    c.retry();
    c.retry();
    expect(q.calls()).toBe(2);
  });

  it("ignores a stale result when a newer load supersedes it", async () => {
    const d1 = deferred<PublicCatalogLoadResult>();
    const d2 = deferred<PublicCatalogLoadResult>();
    const c = new PublicCatalogController(queuedReader([d1.promise, d2.promise]).reader);
    c.start(); // gen 1
    c.start(); // gen 2 supersedes
    d1.resolve(errResult("PUBLIC_CATALOG_SERVER_ERROR", true)); // stale
    d2.resolve(okResult(0));
    await Promise.resolve();
    await Promise.resolve();
    expect(c.getState().status).toBe("ready");
  });

  it("applies no state after detach (unmount) and aborts the current caller", async () => {
    const d = deferred<PublicCatalogLoadResult>();
    const q = queuedReader([d.promise]);
    const c = new PublicCatalogController(q.reader);
    let notified = 0;
    c.subscribe(() => {
      notified++;
    });
    c.start();
    const notifiedAfterStart = notified;
    c.detach();
    expect(q.signals[0]?.aborted).toBe(true);
    d.resolve(okResult(0));
    await Promise.resolve();
    expect(c.getState().status).toBe("loading"); // unchanged
    expect(notified).toBe(notifiedAfterStart);
  });

  it("does not treat our own REQUEST_ABORTED as a fatal error", async () => {
    const c = new PublicCatalogController(
      queuedReader([Promise.resolve(errResult("REQUEST_ABORTED", false))]).reader,
    );
    c.start();
    await Promise.resolve();
    expect(c.getState().status).toBe("loading");
  });

  it("never calls console", async () => {
    const spies = [
      vi.spyOn(console, "log").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
    ];
    const c = new PublicCatalogController(
      queuedReader([Promise.resolve(errResult("NETWORK_TIMEOUT", true))]).reader,
    );
    c.start();
    await Promise.resolve();
    c.retry();
    await Promise.resolve();
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
});
