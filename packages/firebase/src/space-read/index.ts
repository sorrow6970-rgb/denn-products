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

// --- space V2 proof reader (spec 079, Founder MM-2=A) ---
// Appended rather than interleaved: the V1 lines above stay byte-identical, so the customer
// bundle's module order is untouched.
export type { SpaceV2ProofObjectMetadata, SpaceV2ProofReadFirebaseFacade } from "./proof-facade";
export {
  createSpaceV2ProofBytesReader,
  SPACE_V2_PROOF_READ_MAX_BYTES,
  SPACE_V2_PROOF_READ_TIMEOUT_MS,
} from "./proof-reader";
export type {
  SafeSpaceV2ProofReadError,
  SpaceV2ProofBytesReader,
  SpaceV2ProofReadErrorCode,
} from "./proof-reader";
export { createFirebaseSpaceV2ProofReadFacade } from "./proof-sdk-facade";
export type {
  SpaceV2ProofReadEmulatorHosts,
  SpaceV2ProofReadFacadeOptions,
} from "./proof-sdk-facade";
