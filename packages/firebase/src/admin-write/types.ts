// Public contract types for the rebuild admin-state write path (spec 037 §5.6).
//
// The two operations use DIFFERENT error surfaces on purpose (§5.4):
//   - `save`         -> SafeAdminWriteError, the eight WRITE_* codes
//   - `loadBaseline` -> spec 036's SafeAdminReadError, plus exactly one baseline-only code
// Reporting a read failure as an "upload" error would state something untrue about the API.

import type { CatalogDocumentV1, Result } from "@denn/shared";
import type { SafeAdminReadError } from "../admin-read/types";

/**
 * Logical state revision. `0` means "no head yet" (spec 037 §4.3).
 *
 * Runtime validity is narrower than `number` (§5.7): a request's `expectedBase` must be a
 * non-negative safe integer, and a persisted head revision must be a safe integer >= 1 whose
 * increment is still safe.
 */
export type AdminStateRevision = number;

// ── save-only error surface ────────────────────────────────────────────────────────────────────

export type AdminWriteErrorCategory = "VALIDATION" | "AUTH" | "NETWORK" | "UNKNOWN";

/** The eight codes of the §5.4 (A) canonical table. Nothing outside this union exists. */
export type AdminWriteErrorCode =
  | "WRITE_CONFLICT"
  | "WRITE_AUTH_REQUIRED"
  | "WRITE_FORBIDDEN"
  | "WRITE_INVALID_INPUT"
  | "WRITE_UPLOAD_FAILED"
  | "WRITE_UPLOAD_OUTCOME_UNKNOWN"
  | "WRITE_HEAD_FAILED"
  | "WRITE_COMMIT_OUTCOME_UNKNOWN";

/**
 * The only error envelope `save` produces.
 *
 * Beyond `correlationId` it carries NO identifying data: no raw SDK message, email, uid, token,
 * object bytes, `objectPath` or `operationId`. `objectPath` reaches a caller through
 * `AdminStateSaveValue` on success only.
 */
export interface SafeAdminWriteError {
  readonly category: AdminWriteErrorCategory;
  readonly code: AdminWriteErrorCode;
  readonly retryable: boolean;
  readonly correlationId: string;
}

// ── loadBaseline-only error surface ────────────────────────────────────────────────────────────

/**
 * A violation of the head document ITSELF (allowed keys / revision / objectPath / schemaVersion).
 * The single baseline-only code added by this spec.
 *
 * A missing referenced object, or invalid JSON/catalog inside it, keeps its existing spec 036 read
 * error instead — the two are different failures and are not merged.
 */
export interface SafeAdminBaselineInvalidError {
  readonly category: "VALIDATION";
  readonly code: "REBUILD_BASELINE_INVALID";
  readonly retryable: false;
  readonly correlationId: string;
}

/** Discriminated by `code`: `REBUILD_BASELINE_INVALID` is in no spec 036 code union. */
export type SafeAdminBaselineError = SafeAdminReadError | SafeAdminBaselineInvalidError;

// ── values ─────────────────────────────────────────────────────────────────────────────────────

export interface AdminStateBaselineValue {
  readonly catalog: CatalogDocumentV1;
  readonly revision: AdminStateRevision;
  readonly source: "legacy" | "rebuild";
}

export interface AdminStateSaveRequest {
  readonly correlationId: string;
  readonly expectedBase: AdminStateRevision;
  readonly catalog: CatalogDocumentV1;
}

export interface AdminStateSaveValue {
  readonly revision: AdminStateRevision;
  readonly objectPath: string;
}

export type AdminStateBaselineResult = Result<AdminStateBaselineValue, SafeAdminBaselineError>;
export type AdminStateSaveResult = Result<AdminStateSaveValue, SafeAdminWriteError>;

// ── port ───────────────────────────────────────────────────────────────────────────────────────

export interface AdminStateWritePort {
  /**
   * Reads the baseline a save will be based on.
   *
   * No head -> legacy `admin/state.json` at revision 0. A head -> ONLY the object it points at;
   * if that object is missing or invalid this fails closed rather than falling back to legacy,
   * because showing stale data as current is how an operator overwrites someone else's work.
   */
  loadBaseline(request: { readonly correlationId: string }): Promise<AdminStateBaselineResult>;

  /**
   * Uploads an immutable object, then advances the head by exactly one inside a transaction —
   * only when the head still matches `expectedBase`.
   *
   * `operationId` is minted inside the port per call and is deliberately absent from this type:
   * a caller cannot choose the object path.
   */
  save(request: AdminStateSaveRequest): Promise<AdminStateSaveResult>;
}

/** A head document as persisted. Validated before use; never trusted as read. */
export interface AdminStateHead {
  readonly schemaVersion: number;
  readonly revision: AdminStateRevision;
  readonly objectPath: string;
}
