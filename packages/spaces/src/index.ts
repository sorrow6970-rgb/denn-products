// @denn/spaces — space token / schema-version identifier types only.
// NO PBKDF2 / AES-GCM implementation. Does NOT claim compatibility with existing ?space links.
// Encryption + link compatibility are implemented/verified in a later spec.

export type SpaceToken = string & { readonly __spaceBrand: "space-token" };

/** The only currently-defined space scene identifier (기존 근거: space-scene-v1).
 *  근거 없는 v2 계약을 스캐폴드에서 선행 생성하지 않는다. */
export const SPACE_SCENE_VERSION = "space-scene-v1" as const;

export type SpaceSchemaVersion = typeof SPACE_SCENE_VERSION;

export interface SpaceRef {
  readonly token: SpaceToken;
  readonly version: SpaceSchemaVersion;
}

export const SPACES_NOT_IMPLEMENTED =
  "space encryption + link compatibility are implemented in a later spec" as const;
