import {
  createPublicCatalogReader,
  type FetchLike,
  type FetchLikeResponse,
  type PublicCatalogReader,
} from "@denn/firebase";
import { describe, expect, it } from "vitest";
import { PublicCatalogController } from "./controller";

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Flush pending microtasks until `done()` or a bound — no timers, no fixed sleep. */
async function flushUntil(done: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !done(); i++) await Promise.resolve();
}

const LEGACY = JSON.stringify({ models: [{ id: "m1", name: "M" }] });

// StrictMode lifecycle (mount → cleanup → mount) integrated with the REAL spec-013 reader.
// Playwright uses a production build, so it cannot exercise the StrictMode effect double-invoke;
// this framework-free test does, and proves the reader's in-flight dedup keeps the underlying
// fetch to exactly one while the first caller is aborted and the second caller completes.
describe("StrictMode + real reader in-flight merge", () => {
  it("start → detach → start shares one underlying fetch and ends ready", async () => {
    let underlyingFetches = 0;
    const bodyGate = deferred<string>();

    // Controlled fake transport: one underlying call, response body held open until we resolve.
    const transport: FetchLike = async () => {
      underlyingFetches++;
      const response: FetchLikeResponse = {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: () => bodyGate.promise,
      };
      return response;
    };

    // The REAL reader owns the in-flight dedup. A thin wrapper only observes per-caller
    // signals/results; it delegates every load to the real reader.
    const realReader = createPublicCatalogReader({ fetch: transport });
    const signals: Array<AbortSignal | undefined> = [];
    const callerCodes: Array<{ id: string; code: string }> = [];
    const reader: PublicCatalogReader = {
      load: (request) => {
        signals.push(request.signal);
        const p = realReader.load(request);
        void p.then((r) =>
          callerCodes.push({ id: request.correlationId, code: r.ok ? "OK" : r.error.code }),
        );
        return p;
      },
    };

    const controller = new PublicCatalogController(reader);

    // Exact StrictMode call order, all while the first shared fetch is still pending.
    controller.start(); // mount 1  → caller "mockup-catalog-1", creates the shared fetch
    controller.detach(); // strictmode cleanup → aborts caller 1's signal only
    controller.start(); // mount 2  → caller "mockup-catalog-2", joins the pending shared fetch

    // Underlying fetch created exactly once; first caller aborted, second caller live.
    expect(underlyingFetches).toBe(1);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    // Release the shared response — both callers settle off the single fetch.
    bodyGate.resolve(LEGACY);
    await flushUntil(() => controller.getState().status === "ready");

    // Still exactly one underlying fetch; stale/aborted caller 1 did not overwrite ready.
    expect(underlyingFetches).toBe(1);
    expect(callerCodes.find((c) => c.id === "mockup-catalog-1")?.code).toBe("REQUEST_ABORTED");
    expect(callerCodes.find((c) => c.id === "mockup-catalog-2")?.code).toBe("OK");
    expect(controller.getState().status).toBe("ready");
  });
});
