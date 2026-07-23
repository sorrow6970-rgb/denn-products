// Public catalog reader contract types (spec 013).

import type { CatalogDocumentV1, CatalogIssue, CatalogReadReport } from "@denn/shared";
import type { PublicCatalogLocation } from "./location";

/** Minimal response shape so tests can inject a fake without a full DOM `Response`. */
export interface FetchLikeResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  text(): Promise<string>;
}

/** GET-only transport. Import time must NOT touch the network; production reads globalThis.fetch lazily. */
export type FetchLike = (
  url: string,
  init: { method: "GET"; cache: "no-store"; signal: AbortSignal },
) => Promise<FetchLikeResponse>;

export type PublicCatalogErrorCategory = "VALIDATION" | "AUTH" | "NETWORK" | "UNKNOWN";

export type PublicCatalogErrorCode =
  | "INVALID_REQUEST"
  | "REQUEST_ABORTED"
  | "NETWORK_TIMEOUT"
  | "NETWORK_UNAVAILABLE"
  | "PUBLIC_CATALOG_NOT_FOUND"
  | "PUBLIC_CATALOG_FORBIDDEN"
  | "PUBLIC_CATALOG_RATE_LIMITED"
  | "PUBLIC_CATALOG_SERVER_ERROR"
  | "PUBLIC_CATALOG_HTTP_ERROR"
  | "RESPONSE_TOO_LARGE"
  | "INVALID_JSON"
  | "INVALID_CATALOG"
  | "UNEXPECTED_PUBLIC_CATALOG_ERROR";

/**
 * Safe error envelope. Carries only category/code/retryable/correlationId plus minimal safe
 * metadata (HTTP status; catalog issues = spec-012 {code, path} only). NEVER the response
 * body, base64, tokens, or the full URL.
 */
export interface PublicCatalogError {
  readonly category: PublicCatalogErrorCategory;
  readonly code: PublicCatalogErrorCode;
  readonly retryable: boolean;
  readonly correlationId: string;
  readonly httpStatus?: number;
  readonly catalogIssues?: readonly CatalogIssue[];
}

export type PublicCatalogLoadResult =
  | {
      readonly ok: true;
      readonly source: "network";
      readonly correlationId: string;
      readonly document: CatalogDocumentV1;
      readonly report: CatalogReadReport;
    }
  | { readonly ok: false; readonly error: PublicCatalogError };

export interface PublicCatalogLoadRequest {
  /** Non-sensitive opaque id supplied by the caller. Empty → INVALID_REQUEST before any request. */
  readonly correlationId: string;
  /** Optional caller cancellation. Aborting fails only this caller (the shared fetch continues). */
  readonly signal?: AbortSignal;
}

export interface PublicCatalogReaderOptions {
  /** Injected transport. Omit only in production, where globalThis.fetch is used lazily. */
  readonly fetch?: FetchLike;
  /** Default 10_000ms. Must be finite > 0. */
  readonly timeoutMs?: number;
  /** Default 5 MiB. Must be finite > 0. */
  readonly maxBytes?: number;
  readonly location?: PublicCatalogLocation;
}

export interface PublicCatalogReader {
  load(request: PublicCatalogLoadRequest): Promise<PublicCatalogLoadResult>;
}
