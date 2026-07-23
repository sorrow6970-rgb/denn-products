// OPT-IN live browser CORS validation (spec 014) — separate Playwright config, NOT the default
// e2e gate. Runs ONE real GET to the fixed public URL from the local mockup origin and returns
// ONLY safe primitives (status, response type, byte count, elapsed, parse-ok). No body / parsed
// JSON / headers / full URL leave the page. Without opt-in it fails before any request.

import { expect, test } from "@playwright/test";
import { buildPublicCatalogUrl } from "../../packages/firebase/src/public-catalog/location";
import { buildBrowserSummary } from "../../packages/firebase/src/public-catalog/live/safe-summary";
import { MOCKUP_PORT } from "../../playwright.config";

const OPT_IN = process.env.DENN_LIVE_PUBLIC_CATALOG_READ === "1";
const MAX_BYTES = 5 * 1024 * 1024;

function kstIso(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "+09:00");
}

test("LIVE browser CORS read (opt-in) — one GET, safe fields only", async ({ page }) => {
  if (!OPT_IN) {
    throw new Error("live opt-in required: set DENN_LIVE_PUBLIC_CATALOG_READ=1");
  }
  const url = buildPublicCatalogUrl();
  await page.goto(`http://localhost:${MOCKUP_PORT}/`, { waitUntil: "domcontentloaded" });

  // Runs in the page origin → a real cross-origin CORS fetch. Returns primitives only.
  const probe = await page.evaluate(async (u) => {
    const t0 = performance.now();
    try {
      const resp = await fetch(u, { method: "GET", cache: "no-store" });
      const status = resp.status;
      const responseType = resp.type;
      const contentTypePresent = resp.headers.get("content-type") !== null;
      const text = await resp.text();
      const byteLength = new TextEncoder().encode(text).length;
      let jsonParseOk = false;
      try {
        JSON.parse(text);
        jsonParseOk = true;
      } catch {
        jsonParseOk = false;
      }
      const elapsedMs = Math.round(performance.now() - t0);
      return {
        outcome: resp.ok && byteLength > 0 && jsonParseOk ? "success" : "failure",
        code: resp.ok ? "OK" : `HTTP_${status}`,
        corsBlocked: false,
        httpStatus: status,
        responseType,
        contentTypePresent,
        byteLength,
        elapsedMs,
        jsonParseOk,
      };
    } catch {
      return {
        outcome: "failure" as const,
        code: "CORS_OR_NETWORK_BLOCKED",
        corsBlocked: true,
        elapsedMs: Math.round(performance.now() - t0),
      };
    }
  }, url);

  const now = new Date();
  const summary = buildBrowserSummary(probe, {
    runAtUtc: now.toISOString(),
    runAtKst: kstIso(now),
    requests: 1,
  });
  process.stdout.write(`SPEC014_BROWSER_SUMMARY ${JSON.stringify(summary)}\n`);

  expect(summary.corsBlocked ?? false).toBe(false);
  expect(summary.outcome).toBe("success");
  expect(summary.jsonParseOk ?? false).toBe(true);
  expect(summary.byteLength ?? 0).toBeGreaterThan(0);
  expect(summary.byteLength ?? 0).toBeLessThanOrEqual(MAX_BYTES);
});
