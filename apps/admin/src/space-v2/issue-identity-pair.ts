// Local-only space V2 issue identity pair (spec 071, Founder HH-1=A).
//
// One issue operation needs TWO independent lowercase UUID v4 values: the proof `assetId` and the
// public link token. They are generated separately — asset id first, token second — and are never
// collapsed into a single value.
//
// The lowercase UUID v4 rule itself is NOT re-implemented here: both values go through the spec 069
// candidate, so that boundary stays the single source of truth for the format. Only pair-level
// codes leave this module; a child's error code never does.
//
// This module is NOT wired into `App.tsx`, any route or an app barrel. It does not combine with the
// spec 068 preparation flow, and performs no upload, Firestore create, URL issuance, network, DOM
// or Canvas work. There is no automatic retry: a failure or a collision stops the operation.
//
// SCOPE LIMIT, stated plainly: two values matching the UUID v4 shape and differing from each other
// is not proof of randomness quality or collision freedom. That trust belongs to the injected
// source's own contract.

import {
  createSpaceV2IssueTokenCandidate,
  type SpaceV2IssueTokenCandidate,
  type SpaceV2IssueUuidPort,
} from "./issue-token-candidate";

/** A checked proof asset id. Branded apart from the token so the two cannot be swapped by mistake. */
export type SpaceV2ProofAssetIdCandidate = string & {
  readonly __spaceV2ProofAssetIdCandidate: unique symbol;
};

export interface SpaceV2IssueIdentityPair {
  readonly assetId: SpaceV2ProofAssetIdCandidate;
  readonly token: SpaceV2IssueTokenCandidate;
}

/**
 * Which step refused. A failure carries nothing else — no candidate value, no UUID fragment, no
 * child error code, no UID/email, no message or stack — and never describes a retry.
 */
export type SpaceV2IssueIdentityPairErrorCode =
  // the injected port is missing or its method is not callable; the source was never called.
  | "SPACE_V2_IDENTITY_INVALID_PORT"
  // the first value was not a usable asset id; the token was never requested.
  | "SPACE_V2_IDENTITY_ASSET_ID_FAILED"
  // the second value was not a usable token.
  | "SPACE_V2_IDENTITY_TOKEN_FAILED"
  // both values came back identical, which cannot be an issue identity pair.
  | "SPACE_V2_IDENTITY_COLLISION";

export type SpaceV2IssueIdentityPairResult =
  | { readonly ok: true; readonly value: SpaceV2IssueIdentityPair }
  | { readonly ok: false; readonly code: SpaceV2IssueIdentityPairErrorCode };

const fail = (
  code: SpaceV2IssueIdentityPairErrorCode,
): { readonly ok: false; readonly code: typeof code } => ({ ok: false, code });

/**
 * Take exactly two values from the injected UUID source and return them as an issue identity pair.
 *
 * The source method is read once, before the first call, and is invoked through an always-defined
 * adapter that preserves the original receiver — so a drifting method getter cannot swap the
 * implementation between the two calls, and a method-style source still works. A failed first value
 * means the source is called only once; a failed second value or an identical pair stops at two.
 * There is never a third call, a repair or a retry.
 *
 * Never throws.
 */
export function createSpaceV2IssueIdentityPair(
  uuid: SpaceV2IssueUuidPort,
): SpaceV2IssueIdentityPairResult {
  let method: unknown;
  try {
    method = (uuid as { readonly randomUUID?: unknown } | null | undefined)?.randomUUID;
  } catch {
    return fail("SPACE_V2_IDENTITY_INVALID_PORT");
  }
  if (typeof method !== "function") return fail("SPACE_V2_IDENTITY_INVALID_PORT");

  const generate = method as (this: unknown) => string;
  const port: SpaceV2IssueUuidPort = { randomUUID: () => generate.call(uuid) };

  const assetId = createSpaceV2IssueTokenCandidate(port);
  if (!assetId.ok) return fail("SPACE_V2_IDENTITY_ASSET_ID_FAILED");

  const token = createSpaceV2IssueTokenCandidate(port);
  if (!token.ok) return fail("SPACE_V2_IDENTITY_TOKEN_FAILED");

  // Two identical values are not an identity pair. Failing closed keeps the decision with the
  // caller instead of quietly asking the source again.
  if (assetId.value === token.value) return fail("SPACE_V2_IDENTITY_COLLISION");

  return {
    ok: true,
    value: {
      assetId: assetId.value as unknown as SpaceV2ProofAssetIdCandidate,
      token: token.value,
    },
  };
}
