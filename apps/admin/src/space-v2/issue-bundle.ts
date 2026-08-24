// Local-only space V2 issue bundle orchestrator (spec 072).
//
// Joins the two boundaries that already passed review — the spec 071 identity pair (Founder HH-1=A)
// and the spec 068 snapshot-safe local issue preparation — into ONE local-only flow:
//
//   top-level snapshot -> identity pair (UUID #1 assetId, UUID #2 token)
//                      -> preparation (SHA #1/#2/#3, encrypt #1)
//                      -> success handle: token + three fresh copies
//
// The identity pair is generated FIRST, so an identity failure costs no hashing and no encryption
// at all. When the preparation then refuses, the two UUID values are simply dropped: nothing was
// uploaded and no Firestore document was written, so there is no Storage orphan to reconcile and
// there is no reason to ask the source for a replacement id. There is no retry anywhere.
//
// This wrapper deliberately re-implements NOTHING that spec 068 already owns — the catalog,
// selection and transform checks, the PNG copy, the password rule and the SHA/crypto method
// snapshots all stay there. Only the top-level snapshot belongs to this boundary.
//
// This module is NOT wired into `App.tsx`, any route or an app barrel. It uploads nothing, creates
// no Firestore document, issues no URL, and touches no Firebase adapter, network, DOM, Canvas,
// clock or global randomness.

import type {
  FrameReplayEvidenceV1,
  SpaceCryptoPort,
  SpaceDocumentV2,
  SpaceSha256Port,
} from "@denn/spaces";
import { createSpaceV2IssueIdentityPair } from "./issue-identity-pair";
import {
  prepareSpaceV2LocalIssueCandidate,
  type SpaceV2LocalIssuePreparationInput,
} from "./issue-preparation";
import type { SpaceV2IssueTokenCandidate, SpaceV2IssueUuidPort } from "./issue-token-candidate";

/**
 * Everything the preparation needs except the proof `assetId`: that one value is no longer the
 * caller's to supply, because this boundary generates it together with the token.
 */
export type SpaceV2LocalIssueBundleInput = Omit<SpaceV2LocalIssuePreparationInput, "assetId">;

/**
 * Which step refused. A failure carries nothing else — no child error code, no UUID value or
 * fragment, no token, password, object path, digest, bytes, ciphertext, UID/email, message or
 * stack — and never describes a retry, merge or fallback, because this boundary performs none.
 */
export type SpaceV2LocalIssueBundleErrorCode =
  // the top-level input shape is unusable; nothing was generated, hashed or encrypted.
  | "SPACE_V2_BUNDLE_INVALID_INPUT"
  // the identity pair could not be produced (spec 071); the preparation never started.
  | "SPACE_V2_BUNDLE_IDENTITY_FAILED"
  // the local issue preparation refused (spec 068); the two generated values are dropped.
  | "SPACE_V2_BUNDLE_PREPARATION_FAILED";

/**
 * What a later upload/create adapter would receive: the public link token, plus the same three
 * fresh-copy methods the preparation handle offers. The proof `assetId` is not a separate field —
 * it is already inside the descriptor's object path — and there is no password, plaintext scene,
 * catalog, selection, UID/email, timestamp or URL here.
 */
export interface PreparedSpaceV2LocalIssueBundle {
  readonly token: SpaceV2IssueTokenCandidate;
  copyProofDescriptor(): FrameReplayEvidenceV1["proofAsset"];
  copyUploadBytes(): Uint8Array;
  copyDocument(): SpaceDocumentV2;
}

export type SpaceV2LocalIssueBundleResult =
  | { readonly ok: true; readonly value: PreparedSpaceV2LocalIssueBundle }
  | { readonly ok: false; readonly code: SpaceV2LocalIssueBundleErrorCode };

/** The preparation input keys minus `assetId`, which this boundary owns. */
const INPUT_KEYS = [
  "catalog",
  "selection",
  "frameOrientation",
  "logicalWidth",
  "frameColor",
  "transform",
  "pngBytes",
  "password",
] as const;

/**
 * Exact-key detached snapshot of the TOP LEVEL only: every property is read ONCE into a plain
 * object, so a hostile getter cannot be observed twice with different values before the identity
 * pair is spent. An extra, missing, non-enumerable or symbol key is a rejection, never a repair.
 * The nested shapes stay the preparation's business.
 */
function topLevelSnapshot(input: unknown): Record<string, unknown> | null {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.length !== INPUT_KEYS.length || ownKeys.some((key) => typeof key !== "string")) {
    return null;
  }
  for (const key of ownKeys) {
    if (!Reflect.getOwnPropertyDescriptor(input, key)?.enumerable) return null;
  }
  const keySet = new Set(ownKeys as string[]);
  if (INPUT_KEYS.some((key) => !keySet.has(key))) return null;

  const snapshot: Record<string, unknown> = {};
  const source = input as Record<string, unknown>;
  for (const key of INPUT_KEYS) snapshot[key] = source[key];
  return snapshot;
}

const fail = (
  code: SpaceV2LocalIssueBundleErrorCode,
): { readonly ok: false; readonly code: typeof code } => ({ ok: false, code });

/**
 * Prepare one local V2 issue bundle: an independent token, the proof descriptor, the exact PNG
 * bytes it describes, and the encrypted document that replays them.
 *
 * On the success path the UUID source runs exactly twice — asset id first, token second — the
 * SHA-256 port exactly three times and the crypto port encrypts exactly once, in that order. An
 * identity failure stops before any hashing; a preparation failure stops without asking for a new
 * id. Nothing here uploads, creates or reconciles anything.
 *
 * Never throws: a hostile, revoked or malformed input becomes a typed failure.
 */
export async function prepareSpaceV2LocalIssueBundle(
  input: SpaceV2LocalIssueBundleInput,
  uuid: SpaceV2IssueUuidPort,
  crypto: SpaceCryptoPort,
  sha256: SpaceSha256Port,
): Promise<SpaceV2LocalIssueBundleResult> {
  let snapshot: Record<string, unknown>;
  try {
    const taken = topLevelSnapshot(input);
    if (taken === null) return fail("SPACE_V2_BUNDLE_INVALID_INPUT");
    snapshot = taken;
  } catch {
    return fail("SPACE_V2_BUNDLE_INVALID_INPUT");
  }

  // Synchronous, and before any hashing: a refused pair leaves the SHA and crypto ports untouched.
  // The child's own code stays inside spec 071 — only the pair-level meaning leaves this boundary.
  const identity = createSpaceV2IssueIdentityPair(uuid);
  if (!identity.ok) return fail("SPACE_V2_BUNDLE_IDENTITY_FAILED");

  // Started before this function's first await, so the spec 068 boundary binds its own detached
  // snapshot — catalog, selection, transform and the PNG bytes — while the caller is still blocked.
  const pending = prepareSpaceV2LocalIssueCandidate(
    {
      ...snapshot,
      assetId: identity.value.assetId,
    } as unknown as SpaceV2LocalIssuePreparationInput,
    crypto,
    sha256,
  );

  const prepared = await pending;
  // No second identity, no retry, no fallback: the generated pair is dropped with the failure.
  if (!prepared.ok) return fail("SPACE_V2_BUNDLE_PREPARATION_FAILED");

  const candidate = prepared.value;
  return {
    ok: true,
    value: {
      token: identity.value.token,
      // Each call delegates to the preparation handle, which hands back a fresh detached value.
      copyProofDescriptor: () => candidate.copyProofDescriptor(),
      copyUploadBytes: () => candidate.copyUploadBytes(),
      copyDocument: () => candidate.copyDocument(),
    },
  };
}
