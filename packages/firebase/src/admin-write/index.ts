// Public surface of the rebuild admin-state write path (spec 037).
//
// Reachable ONLY through the "@denn/firebase/admin-write" subpath. The root barrel
// (`packages/firebase/src/index.ts`) must never re-export this — the customer app imports the root
// barrel, and one re-export would pull the Firebase SDK into the customer bundle.
//
// There is no publish API, no legacy-write API and no delete API here, by construction.

export {
  HEAD_COLLECTION_ID,
  HEAD_DOCUMENT_ID,
  HEAD_DOCUMENT_PATH,
  HEAD_SCHEMA_VERSION,
  NO_HEAD_REVISION,
  REBUILD_OBJECT_CONTENT_TYPE,
  REBUILD_OBJECT_MAX_BYTES,
  REBUILD_OBJECT_PATH_PATTERN,
  REBUILD_OBJECT_PREFIX,
} from "./constants";
export type {
  AdminWriteFacade,
  AdminWriteReadRequest,
  AdminWriteUploadRequest,
} from "./facade";
export { createFirebaseAdminWriteFacade } from "./sdk-facade";
export type {
  AdminWriteEmulatorHosts,
  AdminWriteFacadeOptions,
  AdminWriteFirebaseConfig,
} from "./sdk-facade";
export type {
  AdminStateBaselineResult,
  AdminStateBaselineValue,
  AdminStateHead,
  AdminStateRevision,
  AdminStateSaveRequest,
  AdminStateSaveResult,
  AdminStateSaveValue,
  AdminStateWritePort,
  AdminWriteErrorCategory,
  AdminWriteErrorCode,
  SafeAdminBaselineError,
  SafeAdminBaselineInvalidError,
  SafeAdminWriteError,
} from "./types";
export { createAdminStateWritePort } from "./write-port";
export type { AdminStateWritePortOptions } from "./write-port";
