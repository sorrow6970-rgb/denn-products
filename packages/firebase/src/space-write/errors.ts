import type {
  SafeSpaceV2IssueError,
  SpaceV2IssueErrorCategory,
  SpaceV2IssueErrorCode,
} from "./types";

const CODE_META: Record<
  SpaceV2IssueErrorCode,
  { readonly category: SpaceV2IssueErrorCategory; readonly retryable: boolean }
> = {
  SPACE_V2_ISSUE_INVALID_INPUT: { category: "VALIDATION", retryable: false },
  SPACE_V2_ISSUE_AUTH_REQUIRED: { category: "AUTH", retryable: true },
  SPACE_V2_ISSUE_FORBIDDEN: { category: "AUTH", retryable: false },
  SPACE_V2_ISSUE_UPLOAD_FAILED: { category: "NETWORK", retryable: true },
  SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN: { category: "NETWORK", retryable: false },
  SPACE_V2_ISSUE_DOCUMENT_FAILED: { category: "VALIDATION", retryable: false },
  SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN: { category: "UNKNOWN", retryable: false },
  SPACE_V2_ISSUE_ASSET_MISMATCH: { category: "VALIDATION", retryable: false },
};

export function spaceV2IssueError(
  code: SpaceV2IssueErrorCode,
  correlationId: string,
): SafeSpaceV2IssueError {
  const meta = CODE_META[code];
  return { category: meta.category, code, retryable: meta.retryable, correlationId };
}

function rawCode(error: unknown): string {
  try {
    if (error === null || typeof error !== "object") return "";
    const code = (error as { readonly code?: unknown }).code;
    return typeof code === "string" ? code : "";
  } catch {
    return "";
  }
}

export function mapSpaceV2UploadError(error: unknown): SpaceV2IssueErrorCode {
  switch (rawCode(error)) {
    case "storage/unauthenticated":
      return "SPACE_V2_ISSUE_AUTH_REQUIRED";
    case "storage/unauthorized":
      return "SPACE_V2_ISSUE_FORBIDDEN";
    case "storage/quota-exceeded":
    case "storage/invalid-argument":
    case "storage/invalid-checksum":
    case "storage/invalid-format":
    case "storage/cannot-slice-blob":
    case "storage/bucket-not-found":
    case "storage/project-not-found":
    case "storage/no-default-bucket":
      return "SPACE_V2_ISSUE_UPLOAD_FAILED";
    default:
      return "SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN";
  }
}

export type SpaceV2DocumentFailure =
  | { readonly kind: "definite"; readonly code: SpaceV2IssueErrorCode }
  | { readonly kind: "indeterminate" };

export function classifySpaceV2DocumentError(error: unknown): SpaceV2DocumentFailure {
  switch (rawCode(error)) {
    case "permission-denied":
    case "firestore/permission-denied":
      return { kind: "definite", code: "SPACE_V2_ISSUE_FORBIDDEN" };
    case "unauthenticated":
    case "firestore/unauthenticated":
      return { kind: "definite", code: "SPACE_V2_ISSUE_AUTH_REQUIRED" };
    case "invalid-argument":
    case "firestore/invalid-argument":
    case "failed-precondition":
    case "firestore/failed-precondition":
    case "already-exists":
    case "firestore/already-exists":
      return { kind: "definite", code: "SPACE_V2_ISSUE_DOCUMENT_FAILED" };
    default:
      return { kind: "indeterminate" };
  }
}
