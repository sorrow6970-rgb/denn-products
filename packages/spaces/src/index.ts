// @denn/spaces — legacy crypto envelope plus token / schema-version identifiers.
// Firestore and ?space link/scene application are not implemented here.

export type SpaceToken = string & { readonly __spaceBrand: "space-token" };

/** Legacy V1 scene identifier. V2 uses separately named exports so this value and SpaceRef stay
 * backward-compatible. */
export const SPACE_SCENE_VERSION = "space-scene-v1" as const;

export type SpaceSchemaVersion = typeof SPACE_SCENE_VERSION;

export interface SpaceRef {
  readonly token: SpaceToken;
  readonly version: SpaceSchemaVersion;
}

export const SPACES_NOT_IMPLEMENTED =
  "space Firestore + link compatibility are implemented in a later spec" as const;

export {
  createSpaceCrypto,
  LEGACY_SPACE_CRYPTO,
  type SpaceCryptoErrorCode,
  type SpaceCryptoPort,
  type SpaceCryptoResult,
  type SpaceEncryptedEnvelope,
} from "./crypto";
export {
  readSpaceDocument,
  readSpaceScene,
  SPACE_DOCUMENT_VERSION,
  type SpaceDocumentV1,
  type SpaceImageTransform,
  type SpacePoint,
  type SpaceReadErrorCode,
  type SpaceReadResult,
  type SpaceSceneV1,
} from "./read";
export {
  createSpaceOpenPort,
  type OpenedSpaceV1,
  type SpaceOpenErrorCode,
  type SpaceOpenPort,
  type SpaceOpenResult,
} from "./open";
export {
  createSpaceV2OpenPort,
  type OpenedSpaceV2,
  type SpaceV2OpenErrorCode,
  type SpaceV2OpenPort,
  type SpaceV2OpenResult,
} from "./open-v2";
export {
  createFrameReplayEvidenceDigestV1,
  encodeFrameReplayEvidenceV1,
  FRAME_EVIDENCE_ENCODING_V1,
  FRAME_REPLAY_CONTRACT_V1,
  readSpaceDocumentV2,
  readSpaceSceneV2,
  SPACE_DOCUMENT_V2_VERSION,
  SPACE_SCENE_V2_VERSION,
  verifyFrameReplayEvidenceDigestV1,
  type EncodedFrameReplayEvidenceV1,
  type FrameOrientationV1,
  type FrameReplayEvidenceDigestV1,
  type FrameReplayEvidenceV1,
  type SpaceDocumentV2,
  type SpaceSceneV2,
  type SpaceSha256Port,
  type SpaceV2ErrorCode,
  type SpaceV2Result,
} from "./v2";
