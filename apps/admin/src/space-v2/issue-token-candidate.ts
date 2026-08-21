// Local-only space V2 issue token candidate (spec 069).
//
// Founder GG-1=A approved "a fresh lowercase UUID token per issue operation". This module pins the
// generation RESULT boundary for one such token, before Firebase and any UI exist. It does not
// decide how a token relates to a proof `assetId`, does not combine with the spec 068 preparation
// handle, and performs no upload, Firestore create, URL issuance, storage or DOM write.
//
// The UUID port is a required injection: there is no `crypto.randomUUID`, `getRandomValues` or
// `Math.random` fallback here. The port's method is read once and called at most once — a rejected
// result is never regenerated, retried or repaired.
//
// SCOPE LIMIT, stated plainly: matching the UUID v4 shape proves the FORMAT only. It says nothing
// about the randomness quality of the injected source or about collision freedom; the trust in the
// real generator belongs to a later adapter contract.

/** The one capability this boundary needs. Supplying it is the caller's job. */
export interface SpaceV2IssueUuidPort {
  randomUUID(): string;
}

/** A string that has passed the checks below — never assume this shape without going through them. */
export type SpaceV2IssueTokenCandidate = string & {
  readonly __spaceV2IssueTokenCandidate: unique symbol;
};

/**
 * Failure meanings. A failure carries nothing else: no candidate value, token, UID/email, SDK
 * message or stack, and it never describes a retry — this boundary performs none.
 */
export type SpaceV2IssueTokenCandidateErrorCode =
  // the injected port is missing, or its method is not callable.
  | "SPACE_V2_TOKEN_INVALID_PORT"
  // the port's method threw.
  | "SPACE_V2_TOKEN_GENERATION_FAILED"
  // the port returned something other than a lowercase UUID v4 string.
  | "SPACE_V2_TOKEN_INVALID_OUTPUT";

export type SpaceV2IssueTokenCandidateResult =
  | { readonly ok: true; readonly value: SpaceV2IssueTokenCandidate }
  | { readonly ok: false; readonly code: SpaceV2IssueTokenCandidateErrorCode };

/** Lowercase RFC 4122 UUID v4: version nibble `4`, variant nibble `8`, `9`, `a` or `b`. */
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const fail = (
  code: SpaceV2IssueTokenCandidateErrorCode,
): { readonly ok: false; readonly code: typeof code } => ({ ok: false, code });

/**
 * Take one token candidate from the injected port and accept it only if it already is a lowercase
 * UUID v4.
 *
 * The method is read exactly once, so a drifting getter cannot swap the implementation between the
 * read and the call, and it is invoked with the original port as receiver, so a method-style port
 * still works. An unusable value is rejected as-is: nothing is trimmed, lower-cased, defaulted or
 * requested again.
 *
 * Never throws.
 */
export function createSpaceV2IssueTokenCandidate(
  uuid: SpaceV2IssueUuidPort,
): SpaceV2IssueTokenCandidateResult {
  let method: unknown;
  try {
    method = (uuid as { readonly randomUUID?: unknown } | null | undefined)?.randomUUID;
  } catch {
    return fail("SPACE_V2_TOKEN_INVALID_PORT");
  }
  if (typeof method !== "function") return fail("SPACE_V2_TOKEN_INVALID_PORT");

  let candidate: unknown;
  try {
    candidate = (method as (this: unknown) => unknown).call(uuid);
  } catch {
    return fail("SPACE_V2_TOKEN_GENERATION_FAILED");
  }

  if (typeof candidate !== "string" || !TOKEN.test(candidate)) {
    return fail("SPACE_V2_TOKEN_INVALID_OUTPUT");
  }
  return { ok: true, value: candidate as SpaceV2IssueTokenCandidate };
}
