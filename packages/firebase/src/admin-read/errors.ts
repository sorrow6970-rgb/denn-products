// Safe error mapping (spec 036 §5.3). A raw SDK code never leaves this module: it is translated
// into one of the 15 contract codes, and the raw message / email / uid / token are dropped.

import type { CatalogIssue } from "@denn/shared";
import type {
  AdminReadErrorCategory,
  AdminReadErrorCode,
  OperatorAuthErrorCode,
  SafeAdminReadError,
} from "./types";

/** category + retryable are properties OF the code, so they cannot drift per call site. */
const CODE_META: Record<
  AdminReadErrorCode,
  { category: AdminReadErrorCategory; retryable: boolean }
> = {
  INVALID_REQUEST: { category: "VALIDATION", retryable: false },
  AUTH_NOT_READY: { category: "AUTH", retryable: true },
  AUTH_REQUIRED: { category: "AUTH", retryable: false },
  ANONYMOUS_NOT_ALLOWED: { category: "AUTH", retryable: false },
  AUTH_PERSISTENCE_FAILED: { category: "AUTH", retryable: true },
  INVALID_CREDENTIAL: { category: "AUTH", retryable: false },
  AUTH_RATE_LIMITED: { category: "AUTH", retryable: true },
  NETWORK_UNAVAILABLE: { category: "NETWORK", retryable: true },
  NETWORK_TIMEOUT: { category: "NETWORK", retryable: true },
  ADMIN_STATE_NOT_FOUND: { category: "VALIDATION", retryable: false },
  ADMIN_STATE_FORBIDDEN: { category: "AUTH", retryable: false },
  RESPONSE_TOO_LARGE: { category: "VALIDATION", retryable: false },
  INVALID_JSON: { category: "VALIDATION", retryable: false },
  INVALID_CATALOG: { category: "VALIDATION", retryable: false },
  UNEXPECTED_ADMIN_READ_ERROR: { category: "UNKNOWN", retryable: false },
};

export function safeError(
  code: AdminReadErrorCode,
  correlationId: string,
  issues?: readonly CatalogIssue[],
): SafeAdminReadError {
  const meta = CODE_META[code];
  const base: SafeAdminReadError = {
    category: meta.category,
    code,
    retryable: meta.retryable,
    correlationId,
  };
  return issues === undefined ? base : { ...base, issues };
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
 * Auth SDK code -> contract code.
 *
 * Every invalid-credential variant collapses into ONE code on purpose: telling `user-not-found`
 * apart from `wrong-password` would let the sign-in form reveal whether an account exists
 * (decisions/2026-07-21-security-and-privacy.md §1).
 */
export function mapAuthError(error: unknown): OperatorAuthErrorCode {
  switch (rawCode(error)) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
    case "auth/user-disabled":
      return "INVALID_CREDENTIAL";
    case "auth/too-many-requests":
      return "AUTH_RATE_LIMITED";
    case "auth/network-request-failed":
      return "NETWORK_UNAVAILABLE";
    default:
      return "UNEXPECTED_ADMIN_READ_ERROR";
  }
}

/** Storage SDK code -> contract code. Anything unmapped folds into the UNKNOWN bucket. */
export function mapStorageError(error: unknown): AdminReadErrorCode {
  switch (rawCode(error)) {
    case "storage/object-not-found":
      return "ADMIN_STATE_NOT_FOUND";
    case "storage/unauthorized":
      return "ADMIN_STATE_FORBIDDEN";
    case "storage/download-size-exceeded":
      return "RESPONSE_TOO_LARGE";
    case "storage/retry-limit-exceeded":
      return "NETWORK_UNAVAILABLE";
    default:
      return "UNEXPECTED_ADMIN_READ_ERROR";
  }
}
