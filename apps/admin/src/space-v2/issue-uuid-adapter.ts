// Local-only Web Crypto UUID adapter for space V2 issue tokens (spec 070).
//
// Names the UUID source for the spec 069 token candidate: the standard `Crypto.randomUUID()`
// capability, and nothing else. There is no `getRandomValues`, no `Math.random`, no timestamp, no
// hand-assembled UUID and no external UUID package.
//
// The adapter is deliberately thin. It does NOT validate the produced value, map errors, count
// calls per operation, retry or repair — the spec 069 candidate owns all of that, and duplicating
// it here would create two places for the same rule to drift. A source that throws or returns
// something unusable is simply passed through to that boundary.
//
// This module is NOT wired into `App.tsx`, any route or an app barrel. It decides nothing about how
// a token relates to a proof `assetId`, does not assemble an issue bundle, and performs no upload,
// Firestore create, URL issuance, network, DOM or Canvas work.
//
// SCOPE LIMIT, stated plainly: choosing Web Crypto as the source is not a proof of randomness
// quality or collision freedom, and no unit test here claims to measure either.

import type { SpaceV2IssueUuidPort } from "./issue-token-candidate";

export type SpaceV2IssueUuidAdapterErrorCode = "SPACE_V2_UUID_SOURCE_UNAVAILABLE";

export type SpaceV2IssueUuidAdapterResult =
  | { readonly ok: true; readonly value: SpaceV2IssueUuidPort }
  | { readonly ok: false; readonly code: SpaceV2IssueUuidAdapterErrorCode };

const fail = (): { readonly ok: false; readonly code: SpaceV2IssueUuidAdapterErrorCode } => ({
  ok: false,
  code: "SPACE_V2_UUID_SOURCE_UNAVAILABLE",
});

/**
 * Bind one UUID port to a `Crypto.randomUUID` capability.
 *
 * Omitting `source` uses `globalThis.crypto`; an explicitly supplied source is used as given and
 * never silently replaced by the global one. Either way the method is read exactly once, here, and
 * must be callable — a missing, null, primitive, non-function, throwing-getter or revoked source
 * fails closed. The returned port calls that one snapshot with the original source as receiver, so
 * a real `Crypto` instance keeps its internal state and a method-style source still works.
 *
 * The factory never throws; the port it returns intentionally does not catch what the source does.
 */
export function createSpaceV2IssueUuidPort(
  source?: Pick<Crypto, "randomUUID">,
): SpaceV2IssueUuidAdapterResult {
  let resolvedSource: unknown;
  let method: unknown;
  try {
    // `undefined` means "not supplied". An explicit null or primitive is a caller decision and is
    // rejected rather than falling back to the global source.
    resolvedSource =
      source === undefined ? (globalThis as { readonly crypto?: unknown }).crypto : source;
    method = (resolvedSource as { readonly randomUUID?: unknown } | null | undefined)?.randomUUID;
  } catch {
    return fail();
  }
  if (typeof method !== "function") return fail();

  const generate = method as (this: unknown) => string;
  return {
    ok: true,
    value: { randomUUID: () => generate.call(resolvedSource) },
  };
}
