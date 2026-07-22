// @denn/spaces — space token / schema-version identifier types only.
// NO PBKDF2 / AES-GCM implementation. Does NOT claim compatibility with existing ?space links.
// Encryption + link compatibility are implemented/verified in a later spec.

export type SpaceToken = string & { readonly __spaceBrand: "space-token" };

export type SpaceSchemaVersion = 1 | 2;

export interface SpaceRef {
  readonly token: SpaceToken;
  readonly version: SpaceSchemaVersion;
}

export const SPACES_NOT_IMPLEMENTED =
  "space encryption + link compatibility are implemented in a later spec" as const;
