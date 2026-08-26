import { describe, expect, it, vi } from "vitest";
import type {
  FrameReplayEvidenceV1,
  OpenedSpaceV2,
  SpaceSha256Port,
  SpaceV2OpenPort,
} from "@denn/spaces";
import {
  createSpaceV2FrameReplayController,
  SPACE_V2_PROOF_MAX_BYTES,
  type SpaceV2FrameReplayControllerOptions,
} from "./replay-controller";

const PATH = "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png";
const ZERO_SHA256 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const BYTES = new Uint8Array([1, 2, 3]);

function evidence(over: Partial<FrameReplayEvidenceV1> = {}): FrameReplayEvidenceV1 {
  return {
    replayContract: "frame-logical-plan-v1",
    frameOrientation: "portrait",
    logicalWidth: 800,
    geometry: {
      aspect: 1.5,
      borderPercentOfWidth: 4,
      matColor: "#FFFFFF",
      contentInsetPx: 8,
    },
    frameColor: "#9F887A",
    transformEncoding: "normalized-max-pan-v1",
    transform: { scale: 1.25, x: -0.5, y: 0.25, rotationQuarterTurns: 1 },
    proofAsset: {
      objectPath: PATH,
      sha256: ZERO_SHA256,
      byteLength: 3,
      contentType: "image/png",
      intrinsicWidth: 1600,
      intrinsicHeight: 2400,
    },
    templateArt: { kind: "none" },
    textMode: "none",
    clockMode: "off",
    ...over,
  };
}

function opened(frameEvidence = evidence()): OpenedSpaceV2 {
  return {
    schema: "space-v2",
    scene: {
      schema: "space-scene-v2",
      productKind: "frame",
      frameEvidence,
      frameEvidenceDigest: {
        algorithm: "SHA-256",
        encoding: "denn-frame-evidence-v1",
        value: ZERO_SHA256,
      },
      roomCapability: "unsupported",
    },
  };
}

function harness(over: Partial<SpaceV2FrameReplayControllerOptions> = {}) {
  const calls: string[] = [];
  const opener: SpaceV2OpenPort = {
    open: vi.fn(async () => {
      calls.push("open");
      return { ok: true as const, value: opened() };
    }),
  };
  const proof = {
    read: vi.fn(async () => {
      calls.push("read");
      return { bytes: new Uint8Array(BYTES), contentType: "image/png" as const };
    }),
  };
  const sha256: SpaceSha256Port = {
    digest: vi.fn(async () => {
      calls.push("digest");
      return new Uint8Array(32);
    }),
  };
  const decoder = {
    decode: vi.fn(async () => {
      calls.push("decode");
      return { imageRef: "space-v2-proof-1", intrinsicWidth: 1600, intrinsicHeight: 2400 };
    }),
  };
  const options = { opener, proof, sha256, decoder, ...over };
  return {
    calls,
    opener,
    proof,
    sha256,
    decoder,
    controller: createSpaceV2FrameReplayController(options),
  };
}

const request = () => ({
  document: { encrypted: true },
  password: "password-secret",
  correlationId: "req_1",
});

describe("createSpaceV2FrameReplayController", () => {
  it("runs open → proof read → digest → decode and builds the closed evidence plan", async () => {
    const h = harness();
    const result = await h.controller.prepare(request());

    expect(result.ok).toBe(true);
    expect(h.calls).toEqual(["open", "read", "digest", "decode"]);
    expect(h.proof.read).toHaveBeenCalledWith({
      objectPath: PATH,
      maxBytes: SPACE_V2_PROOF_MAX_BYTES,
    });
    expect(h.sha256.digest).toHaveBeenCalledTimes(1);
    expect(h.decoder.decode).toHaveBeenCalledTimes(1);
    if (!result.ok) throw new Error("expected success");
    expect(result.value.imageRef).toBe("space-v2-proof-1");
    expect(result.value.plan).toEqual({
      kind: "frame",
      logicalCanvas: { width: 800, height: 1200 },
      commands: [
        {
          type: "fill-rect",
          layerId: "frame:body",
          rect: { x: 0, y: 0, width: 800, height: 1200 },
          color: "#9F887A",
        },
        {
          type: "fill-rect",
          layerId: "frame:mat",
          rect: { x: 32, y: 32, width: 736, height: 1136 },
          color: "#FFFFFF",
        },
        {
          type: "draw-image-cover",
          layerId: "frame:user-image",
          imageRef: "space-v2-proof-1",
          clipRect: { x: 40, y: 40, width: 720, height: 1120 },
          drawRect: { x: -995, y: -65, width: 2100, height: 1400 },
          rotationQuarterTurns: 1,
        },
      ],
    });
  });

  it("returns a plan detached from later evidence and decoder-result mutation", async () => {
    const sourceEvidence = evidence();
    const decoded = {
      imageRef: "space-v2-proof-1",
      intrinsicWidth: 1600,
      intrinsicHeight: 2400,
    };
    const h = harness({
      opener: {
        open: vi.fn(async () => ({ ok: true as const, value: opened(sourceEvidence) })),
      },
      decoder: { decode: vi.fn(async () => decoded) },
    });
    const result = await h.controller.prepare(request());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    const snapshot = JSON.stringify(result.value);

    (sourceEvidence.geometry as { aspect: number }).aspect = 2;
    (sourceEvidence.transform as { x: number; rotationQuarterTurns: number }).x = 1;
    (sourceEvidence.transform as { x: number; rotationQuarterTurns: number }).rotationQuarterTurns =
      3;
    (decoded as { imageRef: string; intrinsicWidth: number }).imageRef = "mutated-ref";
    (decoded as { imageRef: string; intrinsicWidth: number }).intrinsicWidth = 1;

    expect(JSON.stringify(result.value)).toBe(snapshot);
  });

  it("passes detached byte copies to digest and decoder", async () => {
    const source = new Uint8Array(BYTES);
    let digestInput: Uint8Array | null = null;
    let decodeInput: Uint8Array | null = null;
    const h = harness({
      proof: { read: vi.fn(async () => ({ bytes: source, contentType: "image/png" as const })) },
      sha256: {
        digest: vi.fn(async (bytes) => {
          digestInput = bytes;
          bytes[0] = 99;
          return new Uint8Array(32);
        }),
      },
      decoder: {
        decode: vi.fn(async (bytes) => {
          decodeInput = bytes;
          return { imageRef: "space-v2-proof-1", intrinsicWidth: 1600, intrinsicHeight: 2400 };
        }),
      },
    });

    expect((await h.controller.prepare(request())).ok).toBe(true);
    expect(source).toEqual(BYTES);
    expect(digestInput).not.toBe(source);
    expect(decodeInput).not.toBe(source);
    expect(decodeInput).not.toBe(digestInput);
    expect(decodeInput).toEqual(BYTES);
  });

  it.each([
    ["SPACE_V2_OPEN_INVALID_INPUT", "SPACE_V2_REPLAY_PASSWORD_REJECTED", true],
    ["SPACE_V2_OPEN_DECRYPT_FAILED", "SPACE_V2_REPLAY_PASSWORD_REJECTED", true],
    ["SPACE_V2_OPEN_INVALID_DOCUMENT", "SPACE_V2_REPLAY_INVALID_CONTENT", false],
    ["SPACE_V2_OPEN_INVALID_SCENE", "SPACE_V2_REPLAY_INVALID_CONTENT", false],
    ["SPACE_V2_OPEN_EVIDENCE_FAILED", "SPACE_V2_REPLAY_INVALID_CONTENT", false],
  ] as const)("maps opener %s and short-circuits proof", async (openCode, code, retryable) => {
    const h = harness({
      opener: { open: vi.fn(async () => ({ ok: false as const, code: openCode })) },
    });
    expect(await h.controller.prepare(request())).toEqual({
      ok: false,
      error: { code, retryable, correlationId: "req_1" },
    });
    expect(h.proof.read).not.toHaveBeenCalled();
    expect(h.sha256.digest).not.toHaveBeenCalled();
    expect(h.decoder.decode).not.toHaveBeenCalled();
  });

  it("classifies proof read rejection as the only non-password retryable failure", async () => {
    const h = harness({ proof: { read: vi.fn(async () => Promise.reject(new Error("RAW_SDK"))) } });
    const result = await h.controller.prepare(request());
    expect(result).toEqual({
      ok: false,
      error: { code: "SPACE_V2_REPLAY_PROOF_LOAD_FAILED", retryable: true, correlationId: "req_1" },
    });
    expect(JSON.stringify(result)).not.toContain("RAW_SDK");
    expect(JSON.stringify(result)).not.toContain(PATH);
    expect(JSON.stringify(result)).not.toContain("password-secret");
    expect(h.sha256.digest).not.toHaveBeenCalled();
    expect(h.decoder.decode).not.toHaveBeenCalled();
  });

  it.each([
    [{ bytes: BYTES, contentType: "image/jpeg" }, "SPACE_V2_REPLAY_PROOF_MISMATCH"],
    [{ bytes: new Uint8Array([1, 2]), contentType: "image/png" }, "SPACE_V2_REPLAY_PROOF_MISMATCH"],
    [{ bytes: BYTES, contentType: "image/png", extra: true }, "SPACE_V2_REPLAY_PROOF_LOAD_FAILED"],
  ] as const)(
    "rejects malformed or mismatched proof before digest/decode",
    async (proofResult, code) => {
      const h = harness({ proof: { read: vi.fn(async () => proofResult as never) } });
      expect(await h.controller.prepare(request())).toMatchObject({
        ok: false,
        error: { code },
      });
      expect(h.sha256.digest).not.toHaveBeenCalled();
      expect(h.decoder.decode).not.toHaveBeenCalled();
    },
  );

  it("rejects digest mismatch before decode", async () => {
    const h = harness({ sha256: { digest: vi.fn(async () => new Uint8Array(32).fill(1)) } });
    expect(await h.controller.prepare(request())).toMatchObject({
      ok: false,
      error: { code: "SPACE_V2_REPLAY_PROOF_MISMATCH", retryable: false },
    });
    expect(h.decoder.decode).not.toHaveBeenCalled();
  });

  it.each([
    [{ imageRef: "space-v2-proof-1", intrinsicWidth: 1599, intrinsicHeight: 2400 }, "dimensions"],
    [
      { imageRef: "https://secret.example", intrinsicWidth: 1600, intrinsicHeight: 2400 },
      "image ref",
    ],
    [
      { imageRef: "space-v2-proof-1", intrinsicWidth: 1600, intrinsicHeight: 2400, extra: true },
      "extra key",
    ],
  ])("rejects malformed decoded %s without a plan", async (decoded, _label) => {
    const h = harness({ decoder: { decode: vi.fn(async () => decoded as never) } });
    const result = await h.controller.prepare(request());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["SPACE_V2_REPLAY_PROOF_MISMATCH", "SPACE_V2_REPLAY_PROOF_DECODE_FAILED"]).toContain(
        result.error.code,
      );
    }
  });

  it("rejects malformed request/options without invoking any port", async () => {
    const h = harness();
    expect(await h.controller.prepare({ ...request(), extra: true } as never)).toEqual({
      ok: false,
      error: { code: "SPACE_V2_REPLAY_INVALID_INPUT", retryable: false, correlationId: "" },
    });
    expect(h.opener.open).not.toHaveBeenCalled();

    const bad = createSpaceV2FrameReplayController({
      opener: h.opener,
      proof: h.proof,
      sha256: h.sha256,
      decoder: h.decoder,
      extra: true,
    } as unknown as SpaceV2FrameReplayControllerOptions);
    expect(await bad.prepare(request())).toMatchObject({
      ok: false,
      error: { code: "SPACE_V2_REPLAY_INVALID_INPUT" },
    });
    expect(h.opener.open).not.toHaveBeenCalled();
  });

  it("maps a hostile opener success result to a safe resolved error", async () => {
    const hostile = {
      get ok() {
        return true;
      },
      get value() {
        throw new Error("RAW_HOSTILE_SECRET");
      },
    };
    const h = harness({ opener: { open: vi.fn(async () => hostile as never) } });
    const result = await h.controller.prepare(request());
    expect(result).toEqual({
      ok: false,
      error: {
        code: "SPACE_V2_REPLAY_INVALID_CONTENT",
        retryable: false,
        correlationId: "req_1",
      },
    });
    expect(JSON.stringify(result)).not.toContain("RAW_HOSTILE_SECRET");
    expect(h.proof.read).not.toHaveBeenCalled();
  });

  it("rejects a concurrent second prepare without coalescing or retrying", async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const open = vi.fn(async () => {
      await pending;
      return { ok: true as const, value: opened() };
    });
    const h = harness({ opener: { open } });
    const first = h.controller.prepare(request());
    const second = await h.controller.prepare({ ...request(), correlationId: "req_2" });
    expect(second).toEqual({
      ok: false,
      error: { code: "SPACE_V2_REPLAY_INVALID_INPUT", retryable: false, correlationId: "req_2" },
    });
    release?.();
    expect((await first).ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
  });
});
