import { LEGACY_SPACE_CRYPTO, type SpaceEncryptedEnvelope } from "./crypto";

export const SPACE_DOCUMENT_V2_VERSION = "space-v2" as const;
export const SPACE_SCENE_V2_VERSION = "space-scene-v2" as const;
export const FRAME_REPLAY_CONTRACT_V1 = "frame-logical-plan-v1" as const;
export const FRAME_EVIDENCE_ENCODING_V1 = "denn-frame-evidence-v1" as const;

const TRANSFORM_ENCODING_V1 = "normalized-max-pan-v1" as const;
const MAX_ASSET_BYTES = 20 * 1024 * 1024 - 1;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const COLOR = /^#[0-9A-F]{6}$/;
const ASSET_PATH =
  /^rebuild-space-assets\/objects\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/;

export type SpaceV2ErrorCode =
  | "SPACE_V2_INVALID_DOCUMENT"
  | "SPACE_V2_INVALID_SCENE"
  | "SPACE_V2_INVALID_EVIDENCE"
  | "SPACE_V2_DIGEST_FAILED"
  | "SPACE_V2_DIGEST_MISMATCH";

export type SpaceV2Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: SpaceV2ErrorCode };

export interface SpaceDocumentV2 {
  readonly schema: typeof SPACE_DOCUMENT_V2_VERSION;
  readonly enc: SpaceEncryptedEnvelope;
}

export type FrameOrientationV1 = "portrait" | "landscape";

export interface FrameReplayEvidenceV1 {
  readonly replayContract: typeof FRAME_REPLAY_CONTRACT_V1;
  readonly frameOrientation: FrameOrientationV1;
  readonly logicalWidth: number;
  readonly geometry: {
    readonly aspect: number;
    readonly borderPercentOfWidth: number;
    readonly matColor: string;
    readonly contentInsetPx: 0 | 8;
  };
  readonly frameColor: string;
  readonly transformEncoding: typeof TRANSFORM_ENCODING_V1;
  readonly transform: {
    readonly scale: number;
    readonly x: number;
    readonly y: number;
    readonly rotationQuarterTurns: 0 | 1 | 2 | 3;
  };
  readonly proofAsset: {
    readonly objectPath: string;
    readonly sha256: string;
    readonly byteLength: number;
    readonly contentType: "image/png";
    readonly intrinsicWidth: number;
    readonly intrinsicHeight: number;
  };
  readonly templateArt: { readonly kind: "none" };
  readonly textMode: "none";
  readonly clockMode: "off";
}

export interface FrameReplayEvidenceDigestV1 {
  readonly algorithm: "SHA-256";
  readonly encoding: typeof FRAME_EVIDENCE_ENCODING_V1;
  readonly value: string;
}

export interface SpaceSceneV2 {
  readonly schema: typeof SPACE_SCENE_V2_VERSION;
  readonly productKind: "frame";
  readonly frameEvidence: FrameReplayEvidenceV1;
  readonly frameEvidenceDigest: FrameReplayEvidenceDigestV1;
  readonly roomCapability: "unsupported";
}

export interface EncodedFrameReplayEvidenceV1 {
  readonly evidence: FrameReplayEvidenceV1;
  readonly bytes: Uint8Array;
}

export interface SpaceSha256Port {
  digest(bytes: Uint8Array): Promise<Uint8Array>;
}

const DOCUMENT_KEYS = ["schema", "enc"] as const;
const ENVELOPE_KEYS = ["salt", "iv", "ct"] as const;
const SCENE_KEYS = [
  "schema",
  "productKind",
  "frameEvidence",
  "frameEvidenceDigest",
  "roomCapability",
] as const;
const EVIDENCE_KEYS = [
  "replayContract",
  "frameOrientation",
  "logicalWidth",
  "geometry",
  "frameColor",
  "transformEncoding",
  "transform",
  "proofAsset",
  "templateArt",
  "textMode",
  "clockMode",
] as const;
const GEOMETRY_KEYS = ["aspect", "borderPercentOfWidth", "matColor", "contentInsetPx"] as const;
const TRANSFORM_KEYS = ["scale", "x", "y", "rotationQuarterTurns"] as const;
const PROOF_KEYS = [
  "objectPath",
  "sha256",
  "byteLength",
  "contentType",
  "intrinsicWidth",
  "intrinsicHeight",
] as const;
const TEMPLATE_ART_KEYS = ["kind"] as const;
const DIGEST_KEYS = ["algorithm", "encoding", "value"] as const;

function exactRecord<const Keys extends readonly string[]>(
  input: unknown,
  expectedKeys: Keys,
): { readonly [Key in Keys[number]]: unknown } | null {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.length !== expectedKeys.length || ownKeys.some((key) => typeof key !== "string")) {
    return null;
  }
  for (const key of ownKeys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(input, key);
    if (!descriptor?.enumerable) return null;
  }
  const keySet = new Set(ownKeys as string[]);
  if (expectedKeys.some((key) => !keySet.has(key))) return null;

  const snapshot: Record<string, unknown> = {};
  const source = input as Record<string, unknown>;
  for (const key of expectedKeys) snapshot[key] = source[key];
  return snapshot as { readonly [Key in Keys[number]]: unknown };
}

function decodedBase64Length(value: unknown): number | null {
  if (typeof value !== "string" || value === "" || !BASE64.test(value)) return null;
  try {
    return atob(value).length;
  } catch {
    return null;
  }
}

function normalizedFinite(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Object.is(value, -0) ? 0 : value;
}

function positiveSafeInteger(value: unknown, max = Number.MAX_SAFE_INTEGER): number | null {
  const normalized = normalizedFinite(value);
  return normalized !== null &&
    Number.isSafeInteger(normalized) &&
    normalized > 0 &&
    normalized <= max
    ? normalized
    : null;
}

function boundedNumber(value: unknown, min: number, max: number): number | null {
  const normalized = normalizedFinite(value);
  return normalized !== null && normalized >= min && normalized <= max ? normalized : null;
}

function parseEvidence(input: unknown): FrameReplayEvidenceV1 | null {
  const evidence = exactRecord(input, EVIDENCE_KEYS);
  if (!evidence) return null;
  const geometry = exactRecord(evidence.geometry, GEOMETRY_KEYS);
  const transform = exactRecord(evidence.transform, TRANSFORM_KEYS);
  const proof = exactRecord(evidence.proofAsset, PROOF_KEYS);
  const templateArt = exactRecord(evidence.templateArt, TEMPLATE_ART_KEYS);
  if (!geometry || !transform || !proof || !templateArt) return null;

  if (evidence.replayContract !== FRAME_REPLAY_CONTRACT_V1) return null;
  if (evidence.frameOrientation !== "portrait" && evidence.frameOrientation !== "landscape") {
    return null;
  }
  const logicalWidth = positiveSafeInteger(evidence.logicalWidth);
  const aspect = normalizedFinite(geometry.aspect);
  const borderPercentOfWidth = normalizedFinite(geometry.borderPercentOfWidth);
  const scale = boundedNumber(transform.scale, 1, 5);
  const x = boundedNumber(transform.x, -1, 1);
  const y = boundedNumber(transform.y, -1, 1);
  const byteLength = positiveSafeInteger(proof.byteLength, MAX_ASSET_BYTES);
  const intrinsicWidth = positiveSafeInteger(proof.intrinsicWidth);
  const intrinsicHeight = positiveSafeInteger(proof.intrinsicHeight);
  if (
    logicalWidth === null ||
    aspect === null ||
    aspect <= 0 ||
    borderPercentOfWidth === null ||
    borderPercentOfWidth <= 0 ||
    scale === null ||
    x === null ||
    y === null ||
    byteLength === null ||
    intrinsicWidth === null ||
    intrinsicHeight === null
  ) {
    return null;
  }
  if (evidence.frameOrientation === "portrait" ? aspect < 1 : aspect > 1) return null;
  if (typeof geometry.matColor !== "string" || !COLOR.test(geometry.matColor)) return null;
  if (geometry.contentInsetPx !== 0 && geometry.contentInsetPx !== 8) return null;
  if (typeof evidence.frameColor !== "string" || !COLOR.test(evidence.frameColor)) return null;
  if (evidence.transformEncoding !== TRANSFORM_ENCODING_V1) return null;
  if (
    transform.rotationQuarterTurns !== 0 &&
    transform.rotationQuarterTurns !== 1 &&
    transform.rotationQuarterTurns !== 2 &&
    transform.rotationQuarterTurns !== 3
  ) {
    return null;
  }
  if (typeof proof.objectPath !== "string" || !ASSET_PATH.test(proof.objectPath)) return null;
  if (typeof proof.sha256 !== "string" || decodedBase64Length(proof.sha256) !== 32) return null;
  if (proof.contentType !== "image/png") return null;
  if (templateArt.kind !== "none" || evidence.textMode !== "none" || evidence.clockMode !== "off") {
    return null;
  }

  return {
    replayContract: FRAME_REPLAY_CONTRACT_V1,
    frameOrientation: evidence.frameOrientation,
    logicalWidth,
    geometry: {
      aspect,
      borderPercentOfWidth,
      matColor: geometry.matColor,
      contentInsetPx: geometry.contentInsetPx,
    },
    frameColor: evidence.frameColor,
    transformEncoding: TRANSFORM_ENCODING_V1,
    transform: {
      scale,
      x,
      y,
      rotationQuarterTurns: transform.rotationQuarterTurns,
    },
    proofAsset: {
      objectPath: proof.objectPath,
      sha256: proof.sha256,
      byteLength,
      contentType: "image/png",
      intrinsicWidth,
      intrinsicHeight,
    },
    templateArt: { kind: "none" },
    textMode: "none",
    clockMode: "off",
  };
}

function parseDigest(input: unknown): FrameReplayEvidenceDigestV1 | null {
  const digest = exactRecord(input, DIGEST_KEYS);
  if (!digest) return null;
  if (
    digest.algorithm !== "SHA-256" ||
    digest.encoding !== FRAME_EVIDENCE_ENCODING_V1 ||
    typeof digest.value !== "string" ||
    decodedBase64Length(digest.value) !== 32
  ) {
    return null;
  }
  return {
    algorithm: "SHA-256",
    encoding: FRAME_EVIDENCE_ENCODING_V1,
    value: digest.value,
  };
}

export function readSpaceDocumentV2(input: unknown): SpaceV2Result<SpaceDocumentV2> {
  try {
    const document = exactRecord(input, DOCUMENT_KEYS);
    const envelope = exactRecord(document?.enc, ENVELOPE_KEYS);
    if (!document || document.schema !== SPACE_DOCUMENT_V2_VERSION || !envelope) throw new Error();
    if (
      typeof envelope.salt !== "string" ||
      typeof envelope.iv !== "string" ||
      typeof envelope.ct !== "string" ||
      decodedBase64Length(envelope.salt) !== LEGACY_SPACE_CRYPTO.saltBytes ||
      decodedBase64Length(envelope.iv) !== LEGACY_SPACE_CRYPTO.ivBytes ||
      (decodedBase64Length(envelope.ct) ?? 0) < 16
    ) {
      throw new Error();
    }
    return {
      ok: true,
      value: {
        schema: SPACE_DOCUMENT_V2_VERSION,
        enc: { salt: envelope.salt, iv: envelope.iv, ct: envelope.ct },
      },
    };
  } catch {
    return { ok: false, code: "SPACE_V2_INVALID_DOCUMENT" };
  }
}

export function readSpaceSceneV2(input: unknown): SpaceV2Result<SpaceSceneV2> {
  try {
    const scene = exactRecord(input, SCENE_KEYS);
    if (
      !scene ||
      scene.schema !== SPACE_SCENE_V2_VERSION ||
      scene.productKind !== "frame" ||
      scene.roomCapability !== "unsupported"
    ) {
      throw new Error();
    }
    const frameEvidence = parseEvidence(scene.frameEvidence);
    const frameEvidenceDigest = parseDigest(scene.frameEvidenceDigest);
    if (!frameEvidence || !frameEvidenceDigest) throw new Error();
    return {
      ok: true,
      value: {
        schema: SPACE_SCENE_V2_VERSION,
        productKind: "frame",
        frameEvidence,
        frameEvidenceDigest,
        roomCapability: "unsupported",
      },
    };
  } catch {
    return { ok: false, code: "SPACE_V2_INVALID_SCENE" };
  }
}

export function encodeFrameReplayEvidenceV1(
  input: unknown,
): SpaceV2Result<EncodedFrameReplayEvidenceV1> {
  try {
    const evidence = parseEvidence(input);
    if (!evidence) throw new Error();
    const { geometry, transform, proofAsset } = evidence;
    const tuple = [
      FRAME_EVIDENCE_ENCODING_V1,
      FRAME_REPLAY_CONTRACT_V1,
      evidence.frameOrientation,
      evidence.logicalWidth,
      geometry.aspect,
      geometry.borderPercentOfWidth,
      geometry.matColor,
      geometry.contentInsetPx,
      evidence.frameColor,
      TRANSFORM_ENCODING_V1,
      transform.scale,
      transform.x,
      transform.y,
      transform.rotationQuarterTurns,
      proofAsset.objectPath,
      proofAsset.sha256,
      proofAsset.byteLength,
      "image/png",
      proofAsset.intrinsicWidth,
      proofAsset.intrinsicHeight,
      "none",
      "none",
      "off",
    ] as const;
    return {
      ok: true,
      value: { evidence, bytes: new TextEncoder().encode(JSON.stringify(tuple)) },
    };
  } catch {
    return { ok: false, code: "SPACE_V2_INVALID_EVIDENCE" };
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const webCryptoSha256Port: SpaceSha256Port = {
  async digest(bytes) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
    return new Uint8Array(digest);
  },
};

async function digestEvidence(
  input: unknown,
  sha256: SpaceSha256Port,
): Promise<SpaceV2Result<{ readonly evidence: FrameReplayEvidenceV1; readonly value: string }>> {
  const encoded = encodeFrameReplayEvidenceV1(input);
  if (!encoded.ok) return encoded;
  try {
    const digest = await sha256.digest(Uint8Array.from(encoded.value.bytes));
    if (!(digest instanceof Uint8Array) || digest.byteLength !== 32) throw new Error();
    return {
      ok: true,
      value: { evidence: encoded.value.evidence, value: bytesToBase64(digest) },
    };
  } catch {
    return { ok: false, code: "SPACE_V2_DIGEST_FAILED" };
  }
}

export async function createFrameReplayEvidenceDigestV1(
  input: unknown,
  sha256: SpaceSha256Port = webCryptoSha256Port,
): Promise<SpaceV2Result<FrameReplayEvidenceDigestV1>> {
  const result = await digestEvidence(input, sha256);
  if (!result.ok) return result;
  return {
    ok: true,
    value: {
      algorithm: "SHA-256",
      encoding: FRAME_EVIDENCE_ENCODING_V1,
      value: result.value.value,
    },
  };
}

export async function verifyFrameReplayEvidenceDigestV1(
  input: unknown,
  expectedDigest: unknown,
  sha256: SpaceSha256Port = webCryptoSha256Port,
): Promise<SpaceV2Result<FrameReplayEvidenceV1>> {
  let expected: FrameReplayEvidenceDigestV1 | null;
  try {
    expected = parseDigest(expectedDigest);
  } catch {
    expected = null;
  }
  if (!expected) return { ok: false, code: "SPACE_V2_INVALID_EVIDENCE" };
  const result = await digestEvidence(input, sha256);
  if (!result.ok) return result;
  if (result.value.value !== expected.value) {
    return { ok: false, code: "SPACE_V2_DIGEST_MISMATCH" };
  }
  return { ok: true, value: result.value.evidence };
}
