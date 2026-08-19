export type { SpaceDocumentSnapshot, SpaceReadFirebaseFacade } from "./facade";
export { createSpaceDocumentReadPort, SPACE_DOCUMENT_READ_TIMEOUT_MS } from "./read-port";
export { createFirebaseSpaceReadFacade, SPACE_FIREBASE_APP_NAME } from "./sdk-facade";
export type { SpaceReadFirebaseConfig } from "./sdk-facade";
export { isValidSpaceToken } from "./token";
export type {
  SafeSpaceDocumentReadError,
  SpaceDocumentReadErrorCode,
  SpaceDocumentReadPort,
  SpaceDocumentReadResult,
} from "./types";
