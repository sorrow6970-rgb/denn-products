// The injectable SDK boundary for the write path (spec 037 §5.1).
//
// Everything above this interface is pure logic that unit tests drive with a synthetic fake — no
// Firebase SDK, no network, no import-time side effect.

import type { AdminStateHead } from "./types";

export interface AdminWriteUploadRequest {
  readonly objectPath: string;
  readonly json: string;
  readonly contentType: string;
}

export interface AdminWriteReadRequest {
  readonly objectPath: string;
  readonly maxDownloadSizeBytes: number;
}

export interface AdminWriteClaimRequest {
  readonly recId: string;
  readonly claimedBase: number;
}

export interface AdminWriteFacade {
  /**
   * Mints the per-save operation id.
   *
   * It lives on the platform boundary rather than inside the port so a test can prove it is called
   * exactly once per save — including across transaction callback re-runs (§7.5 F-1).
   */
  randomOperationId(): string;

  /** Creates the write-once REC before Storage is touched (G-4 structure A). */
  createObjectClaim(request: AdminWriteClaimRequest): Promise<void>;

  /**
   * Creates the immutable object. MUST NOT overwrite: the create-only rule
   * (`resource == null`) is what makes a repeated SDK-level retry harmless.
   */
  uploadJsonObject(request: AdminWriteUploadRequest): Promise<void>;

  /** Reads the object the head points at. Read-only; used by `loadBaseline`. */
  readObjectBytes(request: AdminWriteReadRequest): Promise<Uint8Array>;

  /**
   * Reads the head document once, outside any transaction.
   *
   * Returns `null` when the document does not exist — that is the logical revision 0 state, not an
   * error. The raw data is returned unvalidated on purpose; validation belongs to the port.
   */
  getHead(): Promise<unknown | null>;

  /**
   * Runs the head compare-and-set.
   *
   * The app calls this exactly once, but the SDK MAY execute `compute` several times (spec 037
   * §5.5). `compute` therefore has to be pure: it receives the head as currently observed and
   * returns the head to write, or throws to abort. The adapter performs the get and the set; no
   * upload, no id minting, no logging and no local state change happens inside it.
   */
  runHeadTransaction(compute: (current: unknown | null) => AdminStateHead): Promise<void>;
}
