import { PUBLIC_CATALOG_LOCATION } from "@denn/firebase";

export type SpaceProofImageErrorCode =
  | "SPACE_PROOF_IMAGE_MISSING"
  | "SPACE_PROOF_IMAGE_INVALID"
  | "SPACE_PROOF_IMAGE_UNTRUSTED";

export type SpaceProofImageResult =
  | {
      readonly ok: true;
      readonly value: { readonly kind: "firebase-proof-image"; readonly src: string };
    }
  | { readonly ok: false; readonly code: SpaceProofImageErrorCode };

export type SpaceV1FrameReplayErrorCode =
  | "SPACE_PROOF_TRANSFORM_INVALID"
  | "SPACE_PROOF_TRANSFORM_UNSUPPORTED"
  | "SPACE_PROOF_ORIENTATION_UNCONFIRMED";

export type SpaceV1FrameReplayResult = {
  readonly ok: false;
  readonly code: SpaceV1FrameReplayErrorCode;
};

const FIREBASE_STORAGE_HOST = "firebasestorage.googleapis.com";
const BUCKET_OBJECT_PREFIX = `/v0/b/${PUBLIC_CATALOG_LOCATION.bucket}/o/`;

const proofFailure = (code: SpaceProofImageErrorCode): SpaceProofImageResult => ({
  ok: false,
  code,
});

/** Pure trust decision for a legacy scene photo. This function performs no request or decoding. */
export function resolveSpaceProofImageUrl(input: unknown): SpaceProofImageResult {
  try {
    if (input === undefined || input === null || input === "") {
      return proofFailure("SPACE_PROOF_IMAGE_MISSING");
    }
    if (typeof input !== "string") return proofFailure("SPACE_PROOF_IMAGE_INVALID");
    if (input.trim() !== input) return proofFailure("SPACE_PROOF_IMAGE_INVALID");

    let url: URL;
    try {
      url = new URL(input);
    } catch {
      return proofFailure("SPACE_PROOF_IMAGE_INVALID");
    }
    if (url.protocol !== "https:" || url.port !== "") {
      return proofFailure("SPACE_PROOF_IMAGE_INVALID");
    }
    if (url.username !== "" || url.password !== "" || url.hash !== "") {
      return proofFailure("SPACE_PROOF_IMAGE_UNTRUSTED");
    }
    if (url.hostname !== FIREBASE_STORAGE_HOST || !url.pathname.startsWith(BUCKET_OBJECT_PREFIX)) {
      return proofFailure("SPACE_PROOF_IMAGE_UNTRUSTED");
    }

    const encodedObject = url.pathname.slice(BUCKET_OBJECT_PREFIX.length);
    if (encodedObject.length === 0 || encodedObject.includes("/")) {
      return proofFailure("SPACE_PROOF_IMAGE_UNTRUSTED");
    }
    let objectPath: string;
    try {
      objectPath = decodeURIComponent(encodedObject);
    } catch {
      return proofFailure("SPACE_PROOF_IMAGE_INVALID");
    }
    if (encodeURIComponent(objectPath) !== encodedObject) {
      return proofFailure("SPACE_PROOF_IMAGE_UNTRUSTED");
    }
    if (!objectPath.startsWith("proofs/") || objectPath.length === "proofs/".length) {
      return proofFailure("SPACE_PROOF_IMAGE_UNTRUSTED");
    }
    if (
      [...objectPath].some((character) => character.charCodeAt(0) < 0x20 || character === "\u007f")
    ) {
      return proofFailure("SPACE_PROOF_IMAGE_UNTRUSTED");
    }

    const keys = [...url.searchParams.keys()];
    if (keys.some((key) => key !== "alt" && key !== "token")) {
      return proofFailure("SPACE_PROOF_IMAGE_UNTRUSTED");
    }
    const alt = url.searchParams.getAll("alt");
    const tokens = url.searchParams.getAll("token");
    if (alt.length !== 1 || alt[0] !== "media") {
      return proofFailure("SPACE_PROOF_IMAGE_INVALID");
    }
    if (tokens.length > 1 || (tokens.length === 1 && tokens[0].length === 0)) {
      return proofFailure("SPACE_PROOF_IMAGE_INVALID");
    }

    return { ok: true, value: { kind: "firebase-proof-image", src: input } };
  } catch {
    return proofFailure("SPACE_PROOF_IMAGE_INVALID");
  }
}

const transformFailure = (code: SpaceV1FrameReplayErrorCode): SpaceV1FrameReplayResult => ({
  ok: false,
  code,
});

const V1_TRANSFORM_KEYS = new Set(["scale", "x", "y", "rot"]);

/**
 * Classify V1 replay eligibility without mapping legacy coordinates into the current transform.
 * V1 has no durable orientation/capture basis, so even a centered transform cannot be exact.
 */
export function classifySpaceV1FrameReplay(input: unknown): SpaceV1FrameReplayResult {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      return transformFailure("SPACE_PROOF_TRANSFORM_INVALID");
    }
    const value = input as Record<string, unknown>;
    if (Object.keys(value).some((key) => !V1_TRANSFORM_KEYS.has(key))) {
      return transformFailure("SPACE_PROOF_TRANSFORM_INVALID");
    }

    // Snapshot each potentially hostile field exactly once.
    const scale = value.scale;
    const x = value.x;
    const y = value.y;
    const rot = value.rot;
    if (
      typeof scale !== "number" ||
      !Number.isFinite(scale) ||
      typeof x !== "number" ||
      !Number.isFinite(x) ||
      typeof y !== "number" ||
      !Number.isFinite(y) ||
      (rot !== undefined && (typeof rot !== "number" || !Number.isFinite(rot)))
    ) {
      return transformFailure("SPACE_PROOF_TRANSFORM_INVALID");
    }
    if (scale < 1 || scale > 5 || x !== 0 || y !== 0 || (rot !== undefined && rot !== 0)) {
      return transformFailure("SPACE_PROOF_TRANSFORM_UNSUPPORTED");
    }
    return transformFailure("SPACE_PROOF_ORIENTATION_UNCONFIRMED");
  } catch {
    return transformFailure("SPACE_PROOF_TRANSFORM_INVALID");
  }
}
