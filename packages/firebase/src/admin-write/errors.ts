// Safe error mapping for the write path (spec 037 §5.4).
//
// A raw SDK error never leaves this module: it is translated into a contract code and the raw
// message / email / uid / token / bytes / path are dropped.
//
// TWO surfaces, deliberately not merged:
//   - save         -> SafeAdminWriteError (the eight WRITE_* codes)
//   - loadBaseline -> SafeAdminReadError (spec 036) + SafeAdminBaselineInvalidError

import type { CatalogIssue } from "@denn/shared";
import type {
  AdminReadErrorCategory,
  AdminReadErrorCode,
  SafeAdminReadError,
} from "../admin-read/types";
import type {
  AdminWriteErrorCategory,
  AdminWriteErrorCode,
  SafeAdminBaselineInvalidError,
  SafeAdminWriteError,
} from "./types";

/**
 * §5.4 (A) canonical table. category + retryable are properties OF the code, so they cannot drift
 * per call site.
 *
 * Note which ones are NOT retryable: a conflict, and every "outcome unknown" state. Retrying those
 * automatically is exactly how a duplicate object or a lost update happens — they require a reload
 * and an explicit human retry.
 */
const WRITE_CODE_META: Record<
  AdminWriteErrorCode,
  { category: AdminWriteErrorCategory; retryable: boolean }
> = {
  WRITE_CONFLICT: { category: "VALIDATION", retryable: false },
  WRITE_AUTH_REQUIRED: { category: "AUTH", retryable: true },
  WRITE_FORBIDDEN: { category: "AUTH", retryable: false },
  WRITE_INVALID_INPUT: { category: "VALIDATION", retryable: false },
  WRITE_UPLOAD_FAILED: { category: "NETWORK", retryable: true },
  WRITE_UPLOAD_OUTCOME_UNKNOWN: { category: "NETWORK", retryable: false },
  WRITE_HEAD_FAILED: { category: "VALIDATION", retryable: false },
  WRITE_COMMIT_OUTCOME_UNKNOWN: { category: "UNKNOWN", retryable: false },
};

export function writeError(code: AdminWriteErrorCode, correlationId: string): SafeAdminWriteError {
  const meta = WRITE_CODE_META[code];
  return { category: meta.category, code, retryable: meta.retryable, correlationId };
}

/**
 * The subset of spec 036 read codes `loadBaseline` can emit, with the SAME category/retryable
 * values spec 036 assigns them.
 *
 * This is an error envelope, not a re-implementation of any validation rule: the catalog rules stay
 * in `readLegacyCatalog`, and the legacy object read stays in the spec 036 port. `admin-read` is
 * not modified, and its internal `safeError` factory is not part of its public surface.
 */
const READ_CODE_META: Partial<
  Record<AdminReadErrorCode, { category: AdminReadErrorCategory; retryable: boolean }>
> = {
  INVALID_REQUEST: { category: "VALIDATION", retryable: false },
  AUTH_NOT_READY: { category: "AUTH", retryable: true },
  AUTH_REQUIRED: { category: "AUTH", retryable: false },
  ANONYMOUS_NOT_ALLOWED: { category: "AUTH", retryable: false },
  ADMIN_STATE_NOT_FOUND: { category: "VALIDATION", retryable: false },
  ADMIN_STATE_FORBIDDEN: { category: "AUTH", retryable: false },
  RESPONSE_TOO_LARGE: { category: "VALIDATION", retryable: false },
  INVALID_JSON: { category: "VALIDATION", retryable: false },
  INVALID_CATALOG: { category: "VALIDATION", retryable: false },
  NETWORK_UNAVAILABLE: { category: "NETWORK", retryable: true },
  NETWORK_TIMEOUT: { category: "NETWORK", retryable: true },
  UNEXPECTED_ADMIN_READ_ERROR: { category: "UNKNOWN", retryable: false },
};

export function readError(
  code: keyof typeof READ_CODE_META,
  correlationId: string,
  issues?: readonly CatalogIssue[],
): SafeAdminReadError {
  const meta = READ_CODE_META[code] ?? { category: "UNKNOWN" as const, retryable: false };
  const base: SafeAdminReadError = {
    category: meta.category,
    code: code as AdminReadErrorCode,
    retryable: meta.retryable,
    correlationId,
  };
  return issues === undefined ? base : { ...base, issues };
}

/** The head document itself violated the contract — not the object it points at. */
export function baselineInvalidError(correlationId: string): SafeAdminBaselineInvalidError {
  return {
    category: "VALIDATION",
    code: "REBUILD_BASELINE_INVALID",
    retryable: false,
    correlationId,
  };
}

/** Reads `error.code` without trusting the shape. A hostile getter is caught, not propagated. */
function rawCode(error: unknown): string {
  try {
    if (typeof error !== "object" || error === null) return "";
    const value = (error as { code?: unknown }).code;
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

/**
 * Storage upload error -> contract code.
 *
 * Only codes that mean "the server certainly did not store this" become WRITE_UPLOAD_FAILED.
 * EVERYTHING ELSE, including anything unmapped, becomes WRITE_UPLOAD_OUTCOME_UNKNOWN — claiming a
 * definite failure we cannot prove would invite a retry that creates a second object.
 */
export function mapUploadError(error: unknown): AdminWriteErrorCode {
  switch (rawCode(error)) {
    case "storage/unauthenticated":
      return "WRITE_AUTH_REQUIRED";
    case "storage/unauthorized":
      // create-only: this is also what an attempt to overwrite an existing object looks like
      return "WRITE_FORBIDDEN";
    case "storage/quota-exceeded":
    case "storage/invalid-argument":
    case "storage/invalid-checksum":
    case "storage/invalid-format":
    case "storage/cannot-slice-blob":
    case "storage/bucket-not-found":
    case "storage/project-not-found":
    case "storage/no-default-bucket":
      return "WRITE_UPLOAD_FAILED";
    default:
      return "WRITE_UPLOAD_OUTCOME_UNKNOWN";
  }
}

/**
 * Firestore transaction outcome classification.
 *
 * `definite` means the transaction provably did not commit, so no reconciliation is needed.
 * `indeterminate` means we cannot tell — a local timeout does NOT cancel the SDK transaction, so
 * the original attempt may still land on the server afterwards (§6.6).
 */
export type TransactionFailure =
  | { readonly kind: "definite"; readonly code: AdminWriteErrorCode }
  | { readonly kind: "indeterminate" };

export function classifyTransactionError(error: unknown): TransactionFailure {
  switch (rawCode(error)) {
    case "permission-denied":
      return { kind: "definite", code: "WRITE_FORBIDDEN" };
    case "unauthenticated":
      return { kind: "definite", code: "WRITE_AUTH_REQUIRED" };
    case "invalid-argument":
    case "failed-precondition":
    case "out-of-range":
    case "aborted":
      // `aborted` here means contention exhausted the SDK's attempts; nothing was committed
      return { kind: "definite", code: "WRITE_HEAD_FAILED" };
    default:
      // deadline-exceeded, unavailable, cancelled, internal, unknown, and anything unmapped
      return { kind: "indeterminate" };
  }
}

/** Storage/Firestore read error -> spec 036 read code, for the baseline path. */
export function mapBaselineReadError(error: unknown): keyof typeof READ_CODE_META {
  switch (rawCode(error)) {
    case "storage/object-not-found":
      return "ADMIN_STATE_NOT_FOUND";
    case "storage/unauthorized":
    case "permission-denied":
      return "ADMIN_STATE_FORBIDDEN";
    case "storage/unauthenticated":
    case "unauthenticated":
      return "AUTH_REQUIRED";
    case "storage/download-size-exceeded":
      return "RESPONSE_TOO_LARGE";
    case "storage/retry-limit-exceeded":
    case "unavailable":
      return "NETWORK_UNAVAILABLE";
    case "deadline-exceeded":
      return "NETWORK_TIMEOUT";
    default:
      return "UNEXPECTED_ADMIN_READ_ERROR";
  }
}
