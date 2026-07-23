// OPT-IN live validation (spec 014) — EXCLUDED from the default Vitest gate (*.live.test.ts).
// Runs ONE real GET to the fixed public published/state.json through the existing adapter and
// reports ONLY safe aggregates. Without DENN_LIVE_PUBLIC_CATALOG_READ=1 it fails BEFORE any
// request (never a fake success/skip). No raw text/JSON/document values are ever printed.

import { describe, expect, it } from "vitest";
import { buildPublicCatalogUrl } from "../location";
import { createPublicCatalogReader } from "../reader";
import type { FetchLike } from "../types";
import { buildNodeSummary } from "./safe-summary";

const OPT_IN = process.env.DENN_LIVE_PUBLIC_CATALOG_READ === "1";

function kstIso(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "+09:00");
}

describe("LIVE Node public catalog read (opt-in)", () => {
  it("reads the real published/state.json once and reports only safe aggregates", async () => {
    if (!OPT_IN) {
      throw new Error("live opt-in required: set DENN_LIVE_PUBLIC_CATALOG_READ=1");
    }

    let requests = 0;
    let byteLength: number | undefined;
    let httpStatus: number | undefined;
    let contentTypePresent: boolean | undefined;

    // Measuring transport: a real GET (url is fixed by the adapter), capturing only safe metadata.
    const transport: FetchLike = async (url, init) => {
      requests++;
      const resp = await fetch(url, init);
      httpStatus = resp.status;
      contentTypePresent = resp.headers.get("content-type") !== null;
      return {
        ok: resp.ok,
        status: resp.status,
        headers: { get: (name) => resp.headers.get(name) },
        text: async () => {
          const body = await resp.text();
          byteLength = new TextEncoder().encode(body).length;
          return body; // consumed only by the adapter; never printed
        },
      };
    };

    const started = performance.now();
    const result = await createPublicCatalogReader({ fetch: transport }).load({
      correlationId: "spec-014-node-live",
    });
    const elapsedMs = Math.round(performance.now() - started);

    const now = new Date();
    const summary = buildNodeSummary(result, {
      runAtUtc: now.toISOString(),
      runAtKst: kstIso(now),
      requests,
      byteLength,
      elapsedMs,
      httpStatus,
      contentTypePresent,
    });

    // Safe summary only — this is the sole output surface for the live read.
    // process.stdout.write is not console-intercepted, so the aggregate is always visible.
    process.stdout.write(`SPEC014_NODE_SUMMARY ${JSON.stringify(summary)}\n`);
    // Fixed endpoint + exactly one GET; body was consumed by the adapter, never surfaced.
    expect(buildPublicCatalogUrl()).toContain("published%2Fstate.json");
    expect(requests).toBe(1);
    expect(summary.outcome).toBe("success");
    expect(summary.code).toBe("OK");
  });
});
