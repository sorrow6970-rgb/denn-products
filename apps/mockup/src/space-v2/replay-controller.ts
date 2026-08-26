import type { PreviewDrawCommand, PreviewRenderPlan } from "@denn/render";
import type {
  FrameReplayEvidenceV1,
  SpaceSha256Port,
  SpaceV2OpenErrorCode,
  SpaceV2OpenPort,
} from "@denn/spaces";
import { buildFrameProductPlan } from "../canvas/productPlan";
import { maxPanFromRects, toLogicalTransform } from "../preview/imageTransform";

export const SPACE_V2_PROOF_MAX_BYTES = 20_971_519;

export interface SpaceV2ProofBytesPort {
  read(request: {
    readonly objectPath: string;
    readonly maxBytes: number;
  }): Promise<{ readonly bytes: Uint8Array; readonly contentType: "image/png" }>;
}

export interface SpaceV2PngDecodePort {
  decode(bytes: Uint8Array): Promise<{
    readonly imageRef: string;
    readonly intrinsicWidth: number;
    readonly intrinsicHeight: number;
  }>;
}

export interface SpaceV2FrameReplayControllerOptions {
  readonly opener: SpaceV2OpenPort;
  readonly proof: SpaceV2ProofBytesPort;
  readonly sha256: SpaceSha256Port;
  readonly decoder: SpaceV2PngDecodePort;
}

export interface SpaceV2FrameReplayController {
  prepare(request: {
    readonly document: unknown;
    readonly password: unknown;
    readonly correlationId: unknown;
  }): Promise<SpaceV2FrameReplayResult>;
}

export type SpaceV2FrameReplayErrorCode =
  | "SPACE_V2_REPLAY_INVALID_INPUT"
  | "SPACE_V2_REPLAY_PASSWORD_REJECTED"
  | "SPACE_V2_REPLAY_INVALID_CONTENT"
  | "SPACE_V2_REPLAY_PROOF_LOAD_FAILED"
  | "SPACE_V2_REPLAY_PROOF_MISMATCH"
  | "SPACE_V2_REPLAY_PROOF_DECODE_FAILED"
  | "SPACE_V2_REPLAY_PLAN_FAILED";

export type SpaceV2FrameReplayResult =
  | {
      readonly ok: true;
      readonly value: { readonly plan: PreviewRenderPlan; readonly imageRef: string };
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: SpaceV2FrameReplayErrorCode;
        readonly retryable: boolean;
        readonly correlationId: string;
      };
    };

const OPTION_KEYS = ["opener", "proof", "sha256", "decoder"] as const;
const REQUEST_KEYS = ["document", "password", "correlationId"] as const;
const PROOF_KEYS = ["bytes", "contentType"] as const;
const DECODE_KEYS = ["imageRef", "intrinsicWidth", "intrinsicHeight"] as const;
const CORRELATION_ID = /^[A-Za-z0-9_-]{1,64}$/;
const IMAGE_REF = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function exactRecord<const Keys extends readonly string[]>(
  input: unknown,
  keys: Keys,
): { readonly [Key in Keys[number]]: unknown } | null {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string")) return null;
  for (const key of ownKeys) {
    if (!Reflect.getOwnPropertyDescriptor(input, key)?.enumerable) return null;
  }
  const present = new Set(ownKeys as string[]);
  if (keys.some((key) => !present.has(key))) return null;
  const source = input as Record<string, unknown>;
  const snapshot: Record<string, unknown> = {};
  for (const key of keys) snapshot[key] = source[key];
  return snapshot as { readonly [Key in Keys[number]]: unknown };
}

type BoundMethods = {
  readonly open: SpaceV2OpenPort["open"];
  readonly read: SpaceV2ProofBytesPort["read"];
  readonly digest: SpaceSha256Port["digest"];
  readonly decode: SpaceV2PngDecodePort["decode"];
};

function bindMethods(options: unknown): BoundMethods | null {
  try {
    const snapshot = exactRecord(options, OPTION_KEYS);
    if (snapshot === null) return null;
    const opener = snapshot.opener as SpaceV2OpenPort;
    const proof = snapshot.proof as SpaceV2ProofBytesPort;
    const sha256 = snapshot.sha256 as SpaceSha256Port;
    const decoder = snapshot.decoder as SpaceV2PngDecodePort;
    const open = opener?.open;
    const read = proof?.read;
    const digest = sha256?.digest;
    const decode = decoder?.decode;
    if (
      typeof open !== "function" ||
      typeof read !== "function" ||
      typeof digest !== "function" ||
      typeof decode !== "function"
    ) {
      return null;
    }
    return {
      open: open.bind(opener),
      read: read.bind(proof),
      digest: digest.bind(sha256),
      decode: decode.bind(decoder),
    };
  } catch {
    return null;
  }
}

function fail(code: SpaceV2FrameReplayErrorCode, correlationId: string): SpaceV2FrameReplayResult {
  return {
    ok: false,
    error: {
      code,
      retryable:
        code === "SPACE_V2_REPLAY_PASSWORD_REJECTED" ||
        code === "SPACE_V2_REPLAY_PROOF_LOAD_FAILED",
      correlationId,
    },
  };
}

function openFailure(code: SpaceV2OpenErrorCode): SpaceV2FrameReplayErrorCode {
  return code === "SPACE_V2_OPEN_INVALID_INPUT" || code === "SPACE_V2_OPEN_DECRYPT_FAILED"
    ? "SPACE_V2_REPLAY_PASSWORD_REJECTED"
    : "SPACE_V2_REPLAY_INVALID_CONTENT";
}

function toBase64(bytes: Uint8Array): string | null {
  try {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  } catch {
    return null;
  }
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function createSpaceV2FrameReplayController(
  options: SpaceV2FrameReplayControllerOptions,
): SpaceV2FrameReplayController {
  const methods = bindMethods(options);
  let inFlight = false;

  const run = async (
    document: unknown,
    password: unknown,
    correlationId: string,
  ): Promise<SpaceV2FrameReplayResult> => {
    if (methods === null) return fail("SPACE_V2_REPLAY_INVALID_INPUT", correlationId);

    try {
      const opened: Awaited<ReturnType<SpaceV2OpenPort["open"]>> = await methods.open(
        document,
        password,
      );
      if (!opened.ok) return fail(openFailure(opened.code), correlationId);
      const evidence = opened.value.scene.frameEvidence;

      let rawProof: unknown;
      try {
        rawProof = await methods.read({
          objectPath: evidence.proofAsset.objectPath,
          maxBytes: SPACE_V2_PROOF_MAX_BYTES,
        });
      } catch {
        return fail("SPACE_V2_REPLAY_PROOF_LOAD_FAILED", correlationId);
      }
      let proof: ReturnType<typeof exactRecord>;
      try {
        proof = exactRecord(rawProof, PROOF_KEYS);
      } catch {
        proof = null;
      }
      if (proof === null || !(proof.bytes instanceof Uint8Array)) {
        return fail("SPACE_V2_REPLAY_PROOF_LOAD_FAILED", correlationId);
      }
      if (proof.contentType !== "image/png") {
        return fail("SPACE_V2_REPLAY_PROOF_MISMATCH", correlationId);
      }
      const bytes = new Uint8Array(proof.bytes);
      if (bytes.byteLength !== evidence.proofAsset.byteLength) {
        return fail("SPACE_V2_REPLAY_PROOF_MISMATCH", correlationId);
      }

      let digest: Uint8Array;
      try {
        const result = await methods.digest(new Uint8Array(bytes));
        if (!(result instanceof Uint8Array) || result.byteLength !== 32) throw new Error();
        digest = new Uint8Array(result);
      } catch {
        return fail("SPACE_V2_REPLAY_PROOF_MISMATCH", correlationId);
      }
      if (toBase64(digest) !== evidence.proofAsset.sha256) {
        return fail("SPACE_V2_REPLAY_PROOF_MISMATCH", correlationId);
      }

      let rawDecoded: unknown;
      try {
        rawDecoded = await methods.decode(new Uint8Array(bytes));
      } catch {
        return fail("SPACE_V2_REPLAY_PROOF_DECODE_FAILED", correlationId);
      }
      let decoded: ReturnType<typeof exactRecord>;
      try {
        decoded = exactRecord(rawDecoded, DECODE_KEYS);
      } catch {
        decoded = null;
      }
      if (
        decoded === null ||
        typeof decoded.imageRef !== "string" ||
        decoded.imageRef.length > 128 ||
        !IMAGE_REF.test(decoded.imageRef) ||
        !positiveSafeInteger(decoded.intrinsicWidth) ||
        !positiveSafeInteger(decoded.intrinsicHeight)
      ) {
        return fail("SPACE_V2_REPLAY_PROOF_DECODE_FAILED", correlationId);
      }
      if (
        decoded.intrinsicWidth !== evidence.proofAsset.intrinsicWidth ||
        decoded.intrinsicHeight !== evidence.proofAsset.intrinsicHeight
      ) {
        return fail("SPACE_V2_REPLAY_PROOF_MISMATCH", correlationId);
      }
      const decodedProof = {
        imageRef: decoded.imageRef,
        intrinsicWidth: decoded.intrinsicWidth,
        intrinsicHeight: decoded.intrinsicHeight,
      };

      const buildPlan = (transform: FrameReplayEvidenceV1["transform"]) =>
        buildFrameProductPlan({
          geometry: {
            aspect: evidence.geometry.aspect,
            borderPercentOfWidth: evidence.geometry.borderPercentOfWidth,
            matColor: evidence.geometry.matColor,
            contentInsetPx: evidence.geometry.contentInsetPx,
            textZones: [],
            clockPreview: null,
          },
          frameColor: evidence.frameColor,
          logicalWidth: evidence.logicalWidth,
          userImage: {
            imageRef: decodedProof.imageRef,
            intrinsicSize: {
              width: decodedProof.intrinsicWidth,
              height: decodedProof.intrinsicHeight,
            },
            transform,
          },
        });

      // The encrypted evidence stores normalized max-pan fractions, while productPlan expects
      // logical pixels. Mirror the established spec 029/030 composition contract: a zero-pan probe
      // includes the final scale and quarter-turn, its emitted rects are the sole max-pan source,
      // and only then is the normalized pan converted for the final plan.
      const probe = buildPlan({
        scale: evidence.transform.scale,
        x: 0,
        y: 0,
        rotationQuarterTurns: evidence.transform.rotationQuarterTurns,
      });
      if (!probe.ok) return fail("SPACE_V2_REPLAY_PLAN_FAILED", correlationId);
      const probeImage = probe.plan.commands.find(
        (command): command is Extract<PreviewDrawCommand, { readonly type: "draw-image-cover" }> =>
          command.type === "draw-image-cover" && command.layerId === "frame:user-image",
      );
      if (probeImage === undefined) return fail("SPACE_V2_REPLAY_PLAN_FAILED", correlationId);
      const maxPan = maxPanFromRects(probeImage.clipRect, probeImage.drawRect);
      if (maxPan === null) return fail("SPACE_V2_REPLAY_PLAN_FAILED", correlationId);
      const logicalTransform = toLogicalTransform(evidence.transform, maxPan);
      if (logicalTransform === null) return fail("SPACE_V2_REPLAY_PLAN_FAILED", correlationId);

      const plan = buildPlan(logicalTransform);
      if (!plan.ok) return fail("SPACE_V2_REPLAY_PLAN_FAILED", correlationId);
      return { ok: true, value: { plan: plan.plan, imageRef: decodedProof.imageRef } };
    } catch {
      return fail("SPACE_V2_REPLAY_INVALID_CONTENT", correlationId);
    }
  };

  return {
    prepare(request) {
      let snapshot: ReturnType<typeof exactRecord>;
      try {
        snapshot = exactRecord(request, REQUEST_KEYS);
      } catch {
        snapshot = null;
      }
      const correlationId =
        snapshot !== null &&
        typeof snapshot.correlationId === "string" &&
        CORRELATION_ID.test(snapshot.correlationId)
          ? snapshot.correlationId
          : "";
      if (snapshot === null || correlationId === "") {
        return Promise.resolve(fail("SPACE_V2_REPLAY_INVALID_INPUT", correlationId));
      }
      if (inFlight) {
        return Promise.resolve(fail("SPACE_V2_REPLAY_INVALID_INPUT", correlationId));
      }
      inFlight = true;
      return run(snapshot.document, snapshot.password, correlationId).finally(() => {
        inFlight = false;
      });
    },
  };
}
