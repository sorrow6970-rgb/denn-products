// Local-only space V2 proof asset preparation (spec 066).
//
// The missing byte-identity boundary between the spec 064 `proofAsset` descriptor and the spec 065
// issuer projector: the PNG bytes an upload will later send and the descriptor that describes them
// must come from ONE immutable snapshot, taken before any await.
//
// This module is NOT wired into `App.tsx` or any route. It performs no upload, no Firebase, no
// token, no encryption, no Firestore write, no DOM/Canvas work, and generates no UUID, random value
// or timestamp. The SHA-256 port is injected by the caller — there is no global crypto wrapper here.
//
// SCOPE LIMIT, stated plainly: this is NOT a PNG decoder. It checks the 8-byte signature, the first
// chunk's length/type and the IHDR dimensions, and nothing else. CRC values, chunk ordering, IDAT
// contents, IEND presence and whether a browser can actually decode the image are NOT verified and
// NOT tested. A success therefore means "a PNG-header candidate a V2 descriptor can be built from",
// not "a valid PNG". A later asset/viewer stage still has to fail closed on real decode.

import type { FrameReplayEvidenceV1, SpaceSha256Port } from "@denn/spaces";

/** Approved object prefix (Founder GG-4=A); the caller never supplies a whole path. */
const OBJECT_PREFIX = "rebuild-space-assets/objects/";
/** Lowercase RFC 4122 UUID v4 only — the same shape the spec 064 asset path validator accepts. */
const ASSET_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** Same cap as the spec 064 evidence contract: 1..20,971,519 bytes. */
const MAX_ASSET_BYTES = 20 * 1024 * 1024 - 1;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
/** `IHDR` in ASCII. */
const IHDR_TYPE = [0x49, 0x48, 0x44, 0x52] as const;
const IHDR_DATA_LENGTH = 13;
/** signature 8 + length 4 + type 4 + data 13 + CRC 4. */
const PNG_HEADER_BYTES = 33;
const MAX_DIMENSION = 2 ** 31 - 1;

/**
 * Failure meanings. A failure carries nothing else: no bytes, asset id, object path, digest, PNG
 * header value, token, password, email, UID or thrown SDK message, and it never describes a retry
 * or a fallback — there is none.
 */
export type SpaceV2ProofErrorCode =
  // the input shape, the asset id, or the byte view itself is unusable.
  | "SPACE_V2_PROOF_INVALID_INPUT"
  // the bytes do not start with a PNG signature + IHDR the dimensions can be read from.
  | "SPACE_V2_PROOF_INVALID_PNG"
  // the snapshot is larger than the approved asset cap.
  | "SPACE_V2_PROOF_TOO_LARGE"
  // the injected SHA-256 port threw, rejected or returned an unusable digest.
  | "SPACE_V2_PROOF_DIGEST_FAILED";

export interface SpaceV2ProofAssetCandidateInput {
  /** Lowercase UUID v4. Generated once by a later issue orchestration, never by this function. */
  readonly assetId: string;
  readonly pngBytes: Uint8Array;
}

export interface PreparedSpaceV2ProofAssetCandidate {
  readonly descriptor: FrameReplayEvidenceV1["proofAsset"];
  /**
   * A fresh copy of the same snapshot on every call, so an upload stage always sends exactly the
   * bytes the descriptor describes. Mutating one returned copy cannot affect the next one. The call
   * count carries no meaning — this function performs no upload and no retry.
   */
  copyUploadBytes(): Uint8Array;
}

export type SpaceV2ProofAssetPreparationResult =
  | { readonly ok: true; readonly value: PreparedSpaceV2ProofAssetCandidate }
  | { readonly ok: false; readonly code: SpaceV2ProofErrorCode };

const INPUT_KEYS = ["assetId", "pngBytes"] as const;

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

const readUint32BE = (bytes: Uint8Array, offset: number): number =>
  bytes[offset] * 0x1000000 +
  (bytes[offset + 1] << 16) +
  (bytes[offset + 2] << 8) +
  bytes[offset + 3];

const isDimension = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 1 && value <= MAX_DIMENSION;

/** Standard base64 (never URL-safe, never hex) — the encoding the spec 064 descriptor expects. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const fail = (code: SpaceV2ProofErrorCode): { readonly ok: false; readonly code: typeof code } => ({
  ok: false,
  code,
});

/**
 * Snapshot the caller's PNG bytes once, derive the approved object path from the asset id, read the
 * intrinsic dimensions out of the IHDR, and hash that exact snapshot into a spec 064 `proofAsset`
 * descriptor.
 *
 * The copy is taken BEFORE the first await, so a caller that mutates its buffer afterwards cannot
 * make the descriptor disagree with the bytes an upload would send. The digest port receives its
 * own copy as well: a hostile port that mutates its argument cannot reach the retained snapshot.
 * Intrinsic width/height come only from the IHDR — a caller-supplied number is never trusted.
 *
 * Never throws: a hostile, revoked or detached input becomes a typed failure.
 */
export async function prepareSpaceV2ProofAssetCandidate(
  input: SpaceV2ProofAssetCandidateInput,
  sha256: SpaceSha256Port,
): Promise<SpaceV2ProofAssetPreparationResult> {
  let snapshot: Uint8Array;
  let assetId: string;

  try {
    if (!hasExactKeys(input, INPUT_KEYS)) return fail("SPACE_V2_PROOF_INVALID_INPUT");
    const candidateId = input.assetId;
    const pngBytes = input.pngBytes;
    if (typeof candidateId !== "string" || !ASSET_ID.test(candidateId)) {
      return fail("SPACE_V2_PROOF_INVALID_INPUT");
    }
    if (!(pngBytes instanceof Uint8Array)) return fail("SPACE_V2_PROOF_INVALID_INPUT");
    // A SharedArrayBuffer view can be written by another agent while we work, so no snapshot of it
    // can be trusted to match what was hashed.
    if (typeof SharedArrayBuffer !== "undefined" && pngBytes.buffer instanceof SharedArrayBuffer) {
      return fail("SPACE_V2_PROOF_INVALID_INPUT");
    }
    assetId = candidateId;
    // The one and only copy of the caller's bytes, taken before any await.
    snapshot = new Uint8Array(pngBytes);
    // A detached buffer reads as zero length; so does an empty view. Neither carries bytes to hash.
    if (snapshot.byteLength === 0) return fail("SPACE_V2_PROOF_INVALID_INPUT");
  } catch {
    return fail("SPACE_V2_PROOF_INVALID_INPUT");
  }

  if (snapshot.byteLength > MAX_ASSET_BYTES) return fail("SPACE_V2_PROOF_TOO_LARGE");

  if (snapshot.byteLength < PNG_HEADER_BYTES) return fail("SPACE_V2_PROOF_INVALID_PNG");
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (snapshot[index] !== PNG_SIGNATURE[index]) return fail("SPACE_V2_PROOF_INVALID_PNG");
  }
  if (readUint32BE(snapshot, 8) !== IHDR_DATA_LENGTH) return fail("SPACE_V2_PROOF_INVALID_PNG");
  for (let index = 0; index < IHDR_TYPE.length; index += 1) {
    if (snapshot[12 + index] !== IHDR_TYPE[index]) return fail("SPACE_V2_PROOF_INVALID_PNG");
  }
  const intrinsicWidth = readUint32BE(snapshot, 16);
  const intrinsicHeight = readUint32BE(snapshot, 20);
  if (!isDimension(intrinsicWidth) || !isDimension(intrinsicHeight)) {
    return fail("SPACE_V2_PROOF_INVALID_PNG");
  }

  let sha256Value: string;
  try {
    const digest = await sha256.digest(new Uint8Array(snapshot));
    if (!(digest instanceof Uint8Array) || digest.byteLength !== 32) throw new Error();
    sha256Value = bytesToBase64(digest);
  } catch {
    return fail("SPACE_V2_PROOF_DIGEST_FAILED");
  }

  return {
    ok: true,
    value: {
      descriptor: {
        objectPath: `${OBJECT_PREFIX}${assetId}.png`,
        sha256: sha256Value,
        byteLength: snapshot.byteLength,
        contentType: "image/png",
        intrinsicWidth,
        intrinsicHeight,
      },
      copyUploadBytes: () => new Uint8Array(snapshot),
    },
  };
}
