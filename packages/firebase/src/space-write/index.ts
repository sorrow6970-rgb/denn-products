// Public local-only space V2 persistence contract (spec 074).
//
// There is deliberately no Firebase SDK adapter, delete API, retry API, URL formatter or UI
// composition here. The root `@denn/firebase` barrel must not re-export this subpath.

export {
  SPACE_V2_ASSET_CONTENT_TYPE,
  SPACE_V2_ASSET_MAX_BYTES,
  SPACE_V2_ASSET_PATH_PATTERN,
  SPACE_V2_ASSET_PREFIX,
  SPACE_V2_ISSUE_CORRELATION_ID_PATTERN,
  SPACE_V2_UUID_V4_PATTERN,
} from "./constants";
export {
  classifySpaceV2DocumentError,
  mapSpaceV2UploadError,
  spaceV2IssueError,
  type SpaceV2DocumentFailure,
} from "./errors";
export type {
  SpaceV2AssetUploadReceipt,
  SpaceV2AssetUploadRequest,
  SpaceV2DocumentCreateRequest,
  SpaceV2IssueWriteFacade,
  SpaceV2ServerDocumentSnapshot,
} from "./facade";
export type {
  SafeSpaceV2IssueError,
  SpaceV2IssueAuthPort,
  SpaceV2IssueErrorCategory,
  SpaceV2IssueErrorCode,
  SpaceV2IssueOperatorState,
  SpaceV2IssueRequest,
  SpaceV2IssueResult,
  SpaceV2IssueValue,
  SpaceV2IssueWritePort,
  SpaceV2PreparedIssueBundle,
} from "./types";
export { createSpaceV2IssueWritePort } from "./write-port";
export type { SpaceV2IssueWritePortOptions } from "./write-port";
