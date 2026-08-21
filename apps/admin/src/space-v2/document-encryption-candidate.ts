// Local-only space V2 document encryption candidate (spec 067).
//
// Takes the strict `SpaceSceneV2` candidate from spec 065, encrypts it ONCE through the existing
// `@denn/spaces` crypto port, and wraps the envelope in the Founder GG-1=A outer document
// `{ schema: "space-v2", enc }`.
//
// This module is NOT wired into `App.tsx`, any route or an app barrel. It generates no token, UUID
// or random value, uploads nothing, creates no Firestore document, touches no Firebase adapter, no
// network, no DOM/Canvas and no clock. Both the crypto port and the SHA-256 port are injected.
//
// The PBKDF2 120,000 / SHA-256 / AES-GCM-256 / 16-byte salt / 12-byte IV contract is NOT
// re-implemented here — it stays in `@denn/spaces`. The password contract is the existing one:
// a non-empty string, with no trimming, normalization, length or character policy added.

import {
  readSpaceDocumentV2,
  readSpaceSceneV2,
  SPACE_DOCUMENT_V2_VERSION,
  type SpaceCryptoPort,
  type SpaceDocumentV2,
  type SpaceSceneV2,
  type SpaceSha256Port,
  verifyFrameReplayEvidenceDigestV1,
} from "@denn/spaces";

/**
 * Failure meanings. A failure carries nothing else: no scene, proof path, digest, password, token,
 * UID/email, envelope or ciphertext, no SDK or thrown message, and no retry advice — this boundary
 * never retries, merges or falls back.
 */
export type SpaceV2DocumentEncryptionCandidateErrorCode =
  // the input shape, the password or the scene is unusable.
  | "SPACE_V2_DOCUMENT_INVALID_INPUT"
  // the scene parses, but its evidence and its digest do not actually agree.
  | "SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED"
  // the crypto port reported a failure, threw or rejected.
  | "SPACE_V2_DOCUMENT_ENCRYPT_FAILED"
  // the crypto port reported success, but the envelope or the outer document is not valid.
  | "SPACE_V2_DOCUMENT_INVALID_OUTPUT";

export interface SpaceV2DocumentEncryptionCandidateInput {
  readonly scene: SpaceSceneV2;
  readonly password: string;
}

export type SpaceV2DocumentEncryptionCandidateResult =
  | { readonly ok: true; readonly value: SpaceDocumentV2 }
  | { readonly ok: false; readonly code: SpaceV2DocumentEncryptionCandidateErrorCode };

const INPUT_KEYS = ["scene", "password"] as const;

/** Exact-key check: an extra, missing, non-enumerable or symbol key is a rejection, not a repair. */
function hasExactKeys(input: unknown, expectedKeys: readonly string[]): boolean {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return false;
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.length !== expectedKeys.length) return false;
  for (const key of ownKeys) {
    if (typeof key !== "string") return false;
    if (!expectedKeys.includes(key)) return false;
    if (!Reflect.getOwnPropertyDescriptor(input, key)?.enumerable) return false;
  }
  return true;
}

const fail = (
  code: SpaceV2DocumentEncryptionCandidateErrorCode,
): { readonly ok: false; readonly code: typeof code } => ({ ok: false, code });

/**
 * Assemble one encrypted `SpaceDocumentV2` candidate from a strict scene and a password.
 *
 * `readSpaceSceneV2` only checks that the digest has the right SHAPE, so it is not proof that the
 * digest belongs to the evidence. The evidence is therefore re-verified against its digest through
 * the injected SHA-256 port BEFORE anything is encrypted; a mismatch or a failing port stops the
 * call with zero crypto invocations. What gets encrypted is the reader's detached scene, never the
 * caller's object, and the resulting outer document is re-read through `readSpaceDocumentV2`, so
 * the returned value is detached from both the input and the crypto result.
 *
 * Both ports are genuinely required: their methods are read once, before the first await, and must
 * be callable. A missing or malformed SHA port fails instead of letting the verifier fall back to
 * its default global Web Crypto port, so this module never reaches a global crypto of its own.
 *
 * On the success path the SHA-256 port runs exactly once and `encryptJson` exactly once. There is
 * no decrypt call and no retry.
 *
 * Never throws: a hostile, revoked or malformed input becomes a typed failure.
 */
export async function createSpaceV2DocumentEncryptionCandidate(
  input: SpaceV2DocumentEncryptionCandidateInput,
  crypto: SpaceCryptoPort,
  sha256: SpaceSha256Port,
): Promise<SpaceV2DocumentEncryptionCandidateResult> {
  let scene: SpaceSceneV2;
  let password: string;

  try {
    if (!hasExactKeys(input, INPUT_KEYS)) return fail("SPACE_V2_DOCUMENT_INVALID_INPUT");
    // Read the password once, before any await, and keep only this local copy. It is never
    // trimmed, normalized, logged, returned or put into an error.
    const passwordSnapshot = input.password;
    if (typeof passwordSnapshot !== "string" || passwordSnapshot.length === 0) {
      return fail("SPACE_V2_DOCUMENT_INVALID_INPUT");
    }
    const read = readSpaceSceneV2(input.scene);
    if (!read.ok) return fail("SPACE_V2_DOCUMENT_INVALID_INPUT");
    scene = read.value;
    password = passwordSnapshot;
  } catch {
    return fail("SPACE_V2_DOCUMENT_INVALID_INPUT");
  }

  // Both injected methods are read ONCE here, still before the first await, so a method getter
  // cannot drift between the read and the call. `verifyFrameReplayEvidenceDigestV1` has a default
  // Web Crypto port, so handing it anything but an always-defined adapter would silently turn a
  // missing injection into a global `crypto.subtle` call — the adapter below closes that path.
  let digestMethod: unknown;
  try {
    digestMethod = (sha256 as { readonly digest?: unknown } | null | undefined)?.digest;
  } catch {
    return fail("SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED");
  }
  if (typeof digestMethod !== "function") {
    return fail("SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED");
  }
  const digestCall = digestMethod as (this: unknown, bytes: Uint8Array) => Promise<Uint8Array>;
  // `.call(sha256, …)` keeps the port's own `this`, so a method-style port still works.
  const injectedSha256: SpaceSha256Port = { digest: (bytes) => digestCall.call(sha256, bytes) };

  let encryptMethod: unknown;
  try {
    encryptMethod = (crypto as { readonly encryptJson?: unknown } | null | undefined)?.encryptJson;
  } catch {
    return fail("SPACE_V2_DOCUMENT_ENCRYPT_FAILED");
  }
  if (typeof encryptMethod !== "function") {
    return fail("SPACE_V2_DOCUMENT_ENCRYPT_FAILED");
  }
  const encryptCall = encryptMethod as (
    this: unknown,
    value: unknown,
    password: string,
  ) => Promise<unknown>;

  try {
    const verified = await verifyFrameReplayEvidenceDigestV1(
      scene.frameEvidence,
      scene.frameEvidenceDigest,
      injectedSha256,
    );
    if (!verified.ok) return fail("SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED");
  } catch {
    return fail("SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED");
  }

  // The port is an injected dependency, so its response is treated as untrusted data: a value that
  // does not report success is an encryption failure, and one that claims success but carries an
  // unusable envelope is an output failure.
  let encrypted: unknown;
  try {
    encrypted = await encryptCall.call(crypto, scene, password);
    if ((encrypted as { readonly ok?: unknown } | null)?.ok !== true) {
      return fail("SPACE_V2_DOCUMENT_ENCRYPT_FAILED");
    }
  } catch {
    return fail("SPACE_V2_DOCUMENT_ENCRYPT_FAILED");
  }

  let enc: unknown;
  try {
    enc = (encrypted as { readonly value?: unknown }).value;
  } catch {
    return fail("SPACE_V2_DOCUMENT_INVALID_OUTPUT");
  }

  const document = readSpaceDocumentV2({ schema: SPACE_DOCUMENT_V2_VERSION, enc });
  if (!document.ok) return fail("SPACE_V2_DOCUMENT_INVALID_OUTPUT");
  return { ok: true, value: document.value };
}
