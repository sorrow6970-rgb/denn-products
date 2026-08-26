import type { Result } from "@denn/shared";
import type { FrameReplayEvidenceV1, SpaceDocumentV2 } from "@denn/spaces";

export type SpaceV2IssueErrorCategory = "VALIDATION" | "AUTH" | "NETWORK" | "UNKNOWN";

export type SpaceV2IssueErrorCode =
  | "SPACE_V2_ISSUE_INVALID_INPUT"
  | "SPACE_V2_ISSUE_AUTH_REQUIRED"
  | "SPACE_V2_ISSUE_FORBIDDEN"
  | "SPACE_V2_ISSUE_UPLOAD_FAILED"
  | "SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN"
  | "SPACE_V2_ISSUE_DOCUMENT_FAILED"
  | "SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN"
  | "SPACE_V2_ISSUE_ASSET_MISMATCH";

/** Identifying persistence values are deliberately absent from every failure. */
export interface SafeSpaceV2IssueError {
  readonly category: SpaceV2IssueErrorCategory;
  readonly code: SpaceV2IssueErrorCode;
  readonly retryable: boolean;
  readonly correlationId: string;
}

/** Structural surface supplied by the spec 072 local issue bundle. */
export interface SpaceV2PreparedIssueBundle {
  readonly token: string;
  copyProofDescriptor(): FrameReplayEvidenceV1["proofAsset"];
  copyUploadBytes(): Uint8Array;
  copyDocument(): SpaceDocumentV2;
}

export interface SpaceV2IssueRequest {
  readonly correlationId: string;
  readonly bundle: SpaceV2PreparedIssueBundle;
}

/** Success carries no URL; later composition may format one only after this result exists. */
export interface SpaceV2IssueValue {
  readonly token: string;
  readonly objectPath: string;
}

export type SpaceV2IssueResult = Result<SpaceV2IssueValue, SafeSpaceV2IssueError>;

export type SpaceV2IssueOperatorState =
  | { readonly status: "initializing" }
  | { readonly status: "signed-out" }
  | { readonly status: "authenticated" }
  | { readonly status: "error" };

export interface SpaceV2IssueAuthPort {
  currentOperator(): SpaceV2IssueOperatorState;
}

export interface SpaceV2IssueWritePort {
  /** Upload once, then create once. No delete, retry, merge, publish or URL API exists here. */
  issue(request: SpaceV2IssueRequest): Promise<SpaceV2IssueResult>;
}
