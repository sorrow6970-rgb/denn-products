// Public surface of the operator auth + private admin-state read (spec 036).
//
// Reachable ONLY through the "@denn/firebase/admin-read" subpath. The root barrel
// (`packages/firebase/src/index.ts`) must never re-export this — the customer app imports the root
// barrel, and one re-export would pull the Firebase SDK into the customer bundle.
//
// There is no write / upload / delete / getDownloadURL / publish API here, by construction.

export { createOperatorAuthPort } from "./auth-port";
export {
  ADMIN_STATE_MAX_BYTES,
  ADMIN_STATE_OBJECT_PATH,
  ADMIN_STATE_READ_TIMEOUT_MS,
} from "./constants";
export type { AdminFacadeUser, AdminFirebaseFacade, AdminReadObjectRequest } from "./facade";
export { createAdminStateReadPort } from "./read-port";
export type { AdminStateReadPortOptions } from "./read-port";
export { createFirebaseAdminFacade } from "./sdk-facade";
export type { AdminFirebaseConfig } from "./sdk-facade";
export type {
  AdminReadErrorCategory,
  AdminReadErrorCode,
  AdminStateLoadResult,
  AdminStateLoadValue,
  AdminStateReadPort,
  OperatorAuthActionResult,
  OperatorAuthActionValue,
  OperatorAuthErrorCode,
  OperatorAuthPort,
  OperatorAuthState,
  SafeAdminReadError,
} from "./types";
