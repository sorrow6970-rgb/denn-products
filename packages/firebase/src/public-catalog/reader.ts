// Read-only public catalog adapter (spec 013). Fixed Storage object, injectable transport,
// timeout + per-caller cancellation, in-flight dedup, 5 MiB UTF-8 cap, safe error contract.
// No Firebase SDK, no import-time network, no retry / cache / stale fallback.

import { readLegacyCatalog } from "@denn/shared";
import type { CatalogDocumentV1, CatalogIssue, CatalogReadReport } from "@denn/shared";
import { buildPublicCatalogUrl, PUBLIC_CATALOG_LOCATION } from "./location";
import type {
  FetchLike,
  PublicCatalogError,
  PublicCatalogErrorCategory,
  PublicCatalogErrorCode,
  PublicCatalogLoadRequest,
  PublicCatalogLoadResult,
  PublicCatalogReader,
  PublicCatalogReaderOptions,
} from "./types";

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MiB

/** Correlation-agnostic result of the shared fetch (mapped per-caller with its correlationId). */
type SharedOutcome =
  | { kind: "success"; document: CatalogDocumentV1; report: CatalogReadReport }
  | { kind: "http"; status: number }
  | { kind: "network" }
  | { kind: "timeout" }
  | { kind: "too-large" }
  | { kind: "invalid-json" }
  | { kind: "invalid-catalog"; issues: readonly CatalogIssue[] }
  | { kind: "unexpected" };

const isFinitePositive = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

function fail(
  category: PublicCatalogErrorCategory,
  code: PublicCatalogErrorCode,
  retryable: boolean,
  correlationId: string,
  extra?: { httpStatus?: number; catalogIssues?: readonly CatalogIssue[] },
): PublicCatalogLoadResult {
  const error: PublicCatalogError = { category, code, retryable, correlationId, ...extra };
  return { ok: false, error };
}

function mapHttp(status: number, correlationId: string): PublicCatalogLoadResult {
  if (status === 404)
    return fail("NETWORK", "PUBLIC_CATALOG_NOT_FOUND", false, correlationId, {
      httpStatus: status,
    });
  if (status === 401 || status === 403)
    return fail("AUTH", "PUBLIC_CATALOG_FORBIDDEN", false, correlationId, { httpStatus: status });
  if (status === 429)
    return fail("NETWORK", "PUBLIC_CATALOG_RATE_LIMITED", true, correlationId, {
      httpStatus: status,
    });
  if (status >= 500 && status <= 599)
    return fail("NETWORK", "PUBLIC_CATALOG_SERVER_ERROR", true, correlationId, {
      httpStatus: status,
    });
  // Other non-2xx: retryable=false (an unclassified 4xx is not safe to auto-retry).
  return fail("NETWORK", "PUBLIC_CATALOG_HTTP_ERROR", false, correlationId, { httpStatus: status });
}

function mapOutcome(outcome: SharedOutcome, correlationId: string): PublicCatalogLoadResult {
  switch (outcome.kind) {
    case "success":
      return {
        ok: true,
        source: "network",
        correlationId,
        document: outcome.document,
        report: outcome.report,
      };
    case "http":
      return mapHttp(outcome.status, correlationId);
    case "network":
      return fail("NETWORK", "NETWORK_UNAVAILABLE", true, correlationId);
    case "timeout":
      return fail("NETWORK", "NETWORK_TIMEOUT", true, correlationId);
    case "too-large":
      return fail("VALIDATION", "RESPONSE_TOO_LARGE", false, correlationId);
    case "invalid-json":
      return fail("VALIDATION", "INVALID_JSON", false, correlationId);
    case "invalid-catalog":
      return fail("VALIDATION", "INVALID_CATALOG", false, correlationId, {
        catalogIssues: outcome.issues,
      });
    default:
      return fail("UNKNOWN", "UNEXPECTED_PUBLIC_CATALOG_ERROR", false, correlationId);
  }
}

/** Resolve the transport once per load, without touching the network at import time. */
function resolveFetch(injected: FetchLike | undefined): FetchLike | null {
  if (injected) return injected;
  const g = (globalThis as { fetch?: unknown }).fetch;
  if (typeof g !== "function") return null;
  return (url, init) => (g as FetchLike)(url, init);
}

export function createPublicCatalogReader(
  options: PublicCatalogReaderOptions = {},
): PublicCatalogReader {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const url = buildPublicCatalogUrl(options.location ?? PUBLIC_CATALOG_LOCATION);

  // One shared in-flight fetch is reused by all concurrent callers; cleared on settle.
  let inFlight: Promise<SharedOutcome> | null = null;

  async function runFetch(transport: FetchLike): Promise<SharedOutcome> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      let response: Awaited<ReturnType<FetchLike>>;
      try {
        response = await transport(url, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
      } catch {
        return timedOut ? { kind: "timeout" } : { kind: "network" };
      }

      if (!response.ok) return { kind: "http", status: response.status };

      // Pre-check Content-Length before consuming the body, when present and valid.
      const cl = response.headers.get("content-length");
      if (cl != null && cl !== "") {
        const declared = Number(cl);
        if (Number.isFinite(declared) && declared > maxBytes) return { kind: "too-large" };
      }

      let text: string;
      try {
        text = await response.text();
      } catch {
        return timedOut ? { kind: "timeout" } : { kind: "network" };
      }

      // Enforce the cap on actual UTF-8 byte length (not string.length).
      if (new TextEncoder().encode(text).length > maxBytes) return { kind: "too-large" };

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return { kind: "invalid-json" };
      }

      const read = readLegacyCatalog(json);
      if (!read.ok) return { kind: "invalid-catalog", issues: read.errors };
      return { kind: "success", document: read.document, report: read.report };
    } catch {
      return { kind: "unexpected" };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Await the shared outcome while letting THIS caller's signal fail only this caller. */
  function finalizeForCaller(
    shared: Promise<SharedOutcome>,
    correlationId: string,
    signal: AbortSignal | undefined,
  ): Promise<PublicCatalogLoadResult> {
    if (!signal) return shared.then((o) => mapOutcome(o, correlationId));
    return new Promise<PublicCatalogLoadResult>((resolve) => {
      let settled = false;
      const onAbort = (): void => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(fail("NETWORK", "REQUEST_ABORTED", false, correlationId));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      shared.then(
        (outcome) => {
          if (settled) return;
          settled = true;
          signal.removeEventListener("abort", onAbort);
          resolve(mapOutcome(outcome, correlationId));
        },
        () => {
          if (settled) return;
          settled = true;
          signal.removeEventListener("abort", onAbort);
          resolve(fail("UNKNOWN", "UNEXPECTED_PUBLIC_CATALOG_ERROR", false, correlationId));
        },
      );
    });
  }

  return {
    async load(request: PublicCatalogLoadRequest): Promise<PublicCatalogLoadResult> {
      const correlationId = typeof request?.correlationId === "string" ? request.correlationId : "";
      if (correlationId.length === 0) return fail("VALIDATION", "INVALID_REQUEST", false, "");
      if (!isFinitePositive(timeoutMs) || !isFinitePositive(maxBytes))
        return fail("VALIDATION", "INVALID_REQUEST", false, correlationId);

      const transport = resolveFetch(options.fetch);
      if (!transport) return fail("VALIDATION", "INVALID_REQUEST", false, correlationId);

      if (request.signal?.aborted) return fail("NETWORK", "REQUEST_ABORTED", false, correlationId);

      let shared = inFlight;
      if (!shared) {
        shared = runFetch(transport);
        inFlight = shared;
        // Clear in-flight once settled so the next load starts a fresh fetch.
        void shared.finally(() => {
          if (inFlight === shared) inFlight = null;
        });
      }
      return finalizeForCaller(shared, correlationId, request.signal);
    },
  };
}
