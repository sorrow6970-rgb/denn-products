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

export type SpaceProofTransformErrorCode =
  | "SPACE_PROOF_TRANSFORM_INVALID"
  | "SPACE_PROOF_TRANSFORM_UNSUPPORTED";

export type SpaceProofTransformResult =
  | {
      readonly ok: true;
      readonly value: {
        readonly status: "identity-supported";
        readonly transform: {
          readonly scale: 1;
          readonly x: 0;
          readonly y: 0;
          readonly rotationQuarterTurns: 0;
        };
      };
    }
  | { readonly ok: false; readonly code: SpaceProofTransformErrorCode };

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

const transformFailure = (code: SpaceProofTransformErrorCode): SpaceProofTransformResult => ({
  ok: false,
  code,
});

/** Map only the one legacy transform whose meaning is proven to match the current identity. */
export function resolveSpaceProofTransform(input: unknown): SpaceProofTransformResult {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      return transformFailure("SPACE_PROOF_TRANSFORM_INVALID");
    }
    const value = input as Record<string, unknown>;
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
    if (scale !== 1 || x !== 0 || y !== 0 || (rot !== undefined && rot !== 0)) {
      return transformFailure("SPACE_PROOF_TRANSFORM_UNSUPPORTED");
    }
    return {
      ok: true,
      value: {
        status: "identity-supported",
        transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: 0 },
      },
    };
  } catch {
    return transformFailure("SPACE_PROOF_TRANSFORM_INVALID");
  }
}
