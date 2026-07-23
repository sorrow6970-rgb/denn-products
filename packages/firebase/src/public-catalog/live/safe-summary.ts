// Safe aggregation for the LIVE public-catalog read validation (spec 014).
// Turns a reader result / browser probe into ONLY non-sensitive aggregates. It must never
// carry raw JSON, names, ids, unknown paths/values, image URLs, dataUrl/storagePath, tokens,
// or the full endpoint URL. Counts, codes, statuses, byte/elapsed numbers, and existence
// booleans only. Non-finite / negative / non-integer counts and undefined required fields
// are rejected (safe error, no raw value in the message).

import type { CatalogIssue } from "@denn/shared";
import type { PublicCatalogLoadResult } from "../types";

/** The only endpoint identifier that may be stored — never the full URL. */
export const LIVE_ENDPOINT_ID = "published/state.json" as const;

export interface SafeNodeSummary {
  readonly kind: "node";
  readonly runAtUtc: string;
  readonly runAtKst: string;
  readonly endpointId: typeof LIVE_ENDPOINT_ID;
  readonly requests: number;
  readonly outcome: "success" | "failure";
  readonly code: string;
  readonly httpStatus?: number;
  readonly contentTypePresent?: boolean;
  readonly byteLength?: number;
  readonly elapsedMs?: number;
  readonly sourceSchema?: "legacy-v0" | "catalog-v1";
  readonly collectionCounts?: Record<string, number>;
  readonly warningCount?: number;
  readonly issueCodeCounts?: Record<string, number>;
  readonly hasPublishedAt?: boolean;
}

export interface NodeSummaryMeta {
  readonly runAtUtc: string;
  readonly runAtKst: string;
  readonly requests: number;
  readonly byteLength?: number;
  readonly elapsedMs?: number;
  readonly httpStatus?: number;
  readonly contentTypePresent?: boolean;
}

export interface BrowserProbe {
  readonly outcome: "success" | "failure";
  readonly code: string;
  readonly corsBlocked?: boolean;
  readonly httpStatus?: number;
  readonly responseType?: string;
  readonly contentTypePresent?: boolean;
  readonly byteLength?: number;
  readonly elapsedMs?: number;
  readonly jsonParseOk?: boolean;
}

export interface SafeBrowserSummary extends BrowserProbe {
  readonly kind: "browser";
  readonly runAtUtc: string;
  readonly runAtKst: string;
  readonly endpointId: typeof LIVE_ENDPOINT_ID;
  readonly requests: number;
}

class UnsafeSummaryError extends Error {}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new UnsafeSummaryError(`missing:${field}`);
  return value;
}
function safeCount(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || !Number.isInteger(value))
    throw new UnsafeSummaryError(`unsafe-count:${field}`);
  return value;
}
function safeElapsed(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new UnsafeSummaryError(`unsafe-elapsed:${field}`);
  return value;
}
function sanitizeCounts(counts: Record<string, number>, field: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(counts)) out[key] = safeCount(counts[key], `${field}.${key}`);
  return out;
}
/** Count issues by their stable code ONLY — issue paths may embed real ids/indexes. */
function countByCode(issues: readonly CatalogIssue[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const issue of issues) out[issue.code] = (out[issue.code] ?? 0) + 1;
  return out;
}
function has(obj: object, key: string): boolean {
  return Object.hasOwn(obj, key);
}

/** Build the safe Node summary from a reader result plus measured, non-sensitive metadata. */
export function buildNodeSummary(
  result: PublicCatalogLoadResult,
  meta: NodeSummaryMeta,
): SafeNodeSummary {
  const summary: SafeNodeSummary = {
    kind: "node",
    runAtUtc: requireNonEmptyString(meta.runAtUtc, "runAtUtc"),
    runAtKst: requireNonEmptyString(meta.runAtKst, "runAtKst"),
    endpointId: LIVE_ENDPOINT_ID,
    requests: safeCount(meta.requests, "requests"),
    outcome: result.ok ? "success" : "failure",
    code: result.ok ? "OK" : result.error.code,
    ...(meta.httpStatus !== undefined
      ? { httpStatus: safeCount(meta.httpStatus, "httpStatus") }
      : {}),
    ...(meta.contentTypePresent !== undefined
      ? { contentTypePresent: meta.contentTypePresent === true }
      : {}),
    ...(meta.byteLength !== undefined
      ? { byteLength: safeCount(meta.byteLength, "byteLength") }
      : {}),
    ...(meta.elapsedMs !== undefined
      ? { elapsedMs: safeElapsed(meta.elapsedMs, "elapsedMs") }
      : {}),
    ...(result.ok
      ? {
          sourceSchema: result.report.sourceVersion,
          collectionCounts: sanitizeCounts(result.report.counts, "counts"),
          warningCount: safeCount(result.report.warnings.length, "warningCount"),
          issueCodeCounts: countByCode(result.report.warnings),
          hasPublishedAt: has(result.document.data, "__publishedAt"),
        }
      : {
          warningCount: 0,
          issueCodeCounts: countByCode(result.error.catalogIssues ?? []),
          ...(result.error.httpStatus !== undefined
            ? { httpStatus: safeCount(result.error.httpStatus, "httpStatus") }
            : {}),
        }),
  };
  return summary;
}

/** Validate/shape the browser probe (already primitive-only) into a safe browser summary. */
export function buildBrowserSummary(
  probe: BrowserProbe,
  meta: { runAtUtc: string; runAtKst: string; requests: number },
): SafeBrowserSummary {
  return {
    kind: "browser",
    runAtUtc: requireNonEmptyString(meta.runAtUtc, "runAtUtc"),
    runAtKst: requireNonEmptyString(meta.runAtKst, "runAtKst"),
    endpointId: LIVE_ENDPOINT_ID,
    requests: safeCount(meta.requests, "requests"),
    outcome: probe.outcome === "success" ? "success" : "failure",
    code: requireNonEmptyString(probe.code, "code"),
    ...(probe.corsBlocked !== undefined ? { corsBlocked: probe.corsBlocked === true } : {}),
    ...(probe.httpStatus !== undefined
      ? { httpStatus: safeCount(probe.httpStatus, "httpStatus") }
      : {}),
    ...(probe.responseType !== undefined
      ? { responseType: requireNonEmptyString(probe.responseType, "responseType") }
      : {}),
    ...(probe.contentTypePresent !== undefined
      ? { contentTypePresent: probe.contentTypePresent === true }
      : {}),
    ...(probe.byteLength !== undefined
      ? { byteLength: safeCount(probe.byteLength, "byteLength") }
      : {}),
    ...(probe.elapsedMs !== undefined
      ? { elapsedMs: safeElapsed(probe.elapsedMs, "elapsedMs") }
      : {}),
    ...(probe.jsonParseOk !== undefined ? { jsonParseOk: probe.jsonParseOk === true } : {}),
  };
}
