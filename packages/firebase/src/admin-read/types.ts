// Public contract types for the operator auth + private admin-state read (spec 036).
//
// NOTHING here exposes a Firebase `User`, credential, token or a raw SDK error. The only error
// surface is `SafeAdminReadError`, which carries a fixed code plus a caller-supplied correlationId.

import type { CatalogDocumentV1, CatalogIssue, CatalogReadReport, Result } from "@denn/shared";

/**
 * Codes reachable from the AUTH stage. Deliberately a subset of `AdminReadErrorCode`: the auth
 * observer state must not be able to carry a catalog/storage code (spec 036 §4.1).
 */
export type OperatorAuthErrorCode =
  | "INVALID_REQUEST"
  | "AUTH_PERSISTENCE_FAILED"
  | "INVALID_CREDENTIAL"
  | "AUTH_RATE_LIMITED"
  | "NETWORK_UNAVAILABLE"
  | "NETWORK_TIMEOUT"
  | "ANONYMOUS_NOT_ALLOWED"
  | "UNEXPECTED_ADMIN_READ_ERROR";

/** Every code this spec can emit — 15 in total. Nothing outside this union leaves the port. */
export type AdminReadErrorCode =
  | OperatorAuthErrorCode
  | "AUTH_NOT_READY"
  | "AUTH_REQUIRED"
  | "ADMIN_STATE_NOT_FOUND"
  | "ADMIN_STATE_FORBIDDEN"
  | "RESPONSE_TOO_LARGE"
  | "INVALID_JSON"
  | "INVALID_CATALOG";

export type AdminReadErrorCategory = "VALIDATION" | "AUTH" | "NETWORK" | "UNKNOWN";

/**
 * The only error envelope. `issues` is populated for INVALID_CATALOG only and carries the spec-012
 * `{code, path}` pairs — never the offending values, the raw JSON, base64, a token or an address.
 */
export interface SafeAdminReadError {
  readonly category: AdminReadErrorCategory;
  readonly code: AdminReadErrorCode;
  readonly retryable: boolean;
  readonly correlationId: string;
  readonly issues?: readonly CatalogIssue[];
}

/**
 * Auth state as observed by `onAuthStateChanged`. `error` is restricted to auth-stage codes, so a
 * catalog/storage failure is structurally unable to masquerade as an auth state.
 */
export type OperatorAuthState =
  | { readonly status: "initializing" }
  | { readonly status: "signed-out" }
  | { readonly status: "authenticated" }
  | { readonly status: "error"; readonly code: OperatorAuthErrorCode };

/**
 * A completed sign-in / sign-out carries NO state: the observer is the single authority for
 * authenticated / signed-out (spec 036 §4.3). There is deliberately no value here to overwrite it
 * with, and the caller must not assume any ordering between this promise and the observer.
 */
export interface OperatorAuthActionValue {
  readonly correlationId: string;
}

export type OperatorAuthActionResult = Result<OperatorAuthActionValue, SafeAdminReadError>;

/** A successful read. The validated document is kept in memory; raw bytes/JSON are not retained. */
export interface AdminStateLoadValue {
  readonly document: CatalogDocumentV1;
  readonly report: CatalogReadReport;
  /** Safe numeric metadata about the payload — a size, never its content. */
  readonly byteLength: number;
  readonly correlationId: string;
}

export type AdminStateLoadResult = Result<AdminStateLoadValue, SafeAdminReadError>;

export interface OperatorAuthPort {
  /** Registers a listener and returns its unsubscribe. The observer is the state authority. */
  subscribe(listener: (state: OperatorAuthState) => void): () => void;
  currentOperator(): OperatorAuthState;
  signInWithEmailPassword(
    email: string,
    password: string,
    request: { readonly correlationId: string },
  ): Promise<OperatorAuthActionResult>;
  signOut(request: { readonly correlationId: string }): Promise<OperatorAuthActionResult>;
}

export interface AdminStateReadPort {
  /** The object path is a module constant — there is deliberately no path/bucket/URL parameter. */
  load(request: { readonly correlationId: string }): Promise<AdminStateLoadResult>;
}
