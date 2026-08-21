// Unit contract for the local space V2 proof asset preparation (spec 066 §4). Synthetic bytes only —
// no real proof image, no file on disk, no network, no Firebase, no DOM/Canvas. Every SHA-256 port is
// injected: the module has none of its own.
//
// NOT covered here, on purpose: PNG CRC values, chunk ordering, IDAT/IEND and real browser decode.
// The module only reads the signature, the first chunk header and the IHDR dimensions, so these
// fixtures are PNG-header candidates rather than decodable images.

import { readFileSync } from "node:fs";
import type { SpaceSha256Port } from "@denn/spaces";
import type { CatalogDocumentV1 } from "@denn/shared";
import { describe, expect, it, vi } from "vitest";
import { createSpaceV2FrameIssueCandidate } from "./issue-candidate";
import {
  prepareSpaceV2ProofAssetCandidate,
  type SpaceV2ProofAssetCandidateInput,
} from "./proof-asset-candidate";

// --- fixtures ----------------------------------------------------------------

const ASSET_ID = "0f9c1b2a-4d3e-4f5a-9b6c-7d8e9f0a1b2c";
const OBJECT_PATH = `rebuild-space-assets/objects/${ASSET_ID}.png`;
const MAX_ASSET_BYTES = 20 * 1024 * 1024 - 1;

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR = [0x49, 0x48, 0x44, 0x52];
/** bit depth, colour type, compression, filter, interlace, then a placeholder CRC. */
const IHDR_TAIL = [8, 6, 0, 0, 0, 0, 0, 0, 0];

const be32 = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

const pngHeader = (
  over: {
    signature?: number[];
    chunkLength?: number;
    chunkType?: number[];
    width?: number;
    height?: number;
    tail?: number[];
  } = {},
): Uint8Array => {
  const {
    signature = SIGNATURE,
    chunkLength = 13,
    chunkType = IHDR,
    width = 1200,
    height = 1680,
    tail = IHDR_TAIL,
  } = over;
  return Uint8Array.from([
    ...signature,
    ...be32(chunkLength),
    ...chunkType,
    ...be32(width),
    ...be32(height),
    ...tail,
  ]);
};

/**
 * SHA-256 of the default 33-byte fixture, computed with an INDEPENDENT implementation
 * (`node:crypto` createHash) and pinned here as a fixed vector.
 */
const FIXED_VECTOR = "qnSaWoyx47Xk9xTr2cXmRtN0swaEGgU6OmLPO5gnxIs=";

const DIGEST_BYTES = Uint8Array.from({ length: 32 }, (_, index) => index);
const DIGEST_VALUE = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

/** Deterministic stand-in so a test never depends on real hashing. */
const recordingPort = () => {
  const calls: Uint8Array[] = [];
  return {
    calls,
    digest: vi.fn(async (bytes: Uint8Array) => {
      calls.push(bytes);
      return DIGEST_BYTES;
    }),
  };
};

/** Real SHA-256, injected the way a production caller would inject it. */
const webCryptoPort: SpaceSha256Port = {
  async digest(bytes) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
    return new Uint8Array(digest);
  },
};

const input = (
  over: Partial<SpaceV2ProofAssetCandidateInput> = {},
): SpaceV2ProofAssetCandidateInput => ({
  assetId: ASSET_ID,
  pngBytes: pngHeader(),
  ...over,
});

// --- success -----------------------------------------------------------------

describe("prepareSpaceV2ProofAssetCandidate — success", () => {
  it("builds the exact descriptor from the asset id and the IHDR", async () => {
    const port = recordingPort();
    const result = await prepareSpaceV2ProofAssetCandidate(input(), port);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.descriptor).toEqual({
      objectPath: OBJECT_PATH,
      sha256: DIGEST_VALUE,
      byteLength: 33,
      contentType: "image/png",
      intrinsicWidth: 1200,
      intrinsicHeight: 1680,
    });
    expect(port.digest).toHaveBeenCalledTimes(1);
    expect(port.calls[0]).toEqual(pngHeader());
  });

  it("matches an independent fixed SHA-256 vector for the same bytes", async () => {
    const result = await prepareSpaceV2ProofAssetCandidate(input(), webCryptoPort);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.descriptor.sha256).toBe(FIXED_VECTOR);
  });

  it("reads the dimensions from the IHDR, never from the caller", async () => {
    const result = await prepareSpaceV2ProofAssetCandidate(
      input({ pngBytes: pngHeader({ width: 7, height: 2147483647 }) }),
      recordingPort(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.descriptor.intrinsicWidth).toBe(7);
    expect(result.value.descriptor.intrinsicHeight).toBe(2147483647);
  });

  it("accepts bytes that continue past the header", async () => {
    const bytes = Uint8Array.from([...pngHeader(), ...new Array(64).fill(0x2a)]);
    const result = await prepareSpaceV2ProofAssetCandidate(
      input({ pngBytes: bytes }),
      recordingPort(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.descriptor.byteLength).toBe(97);
  });
});

// --- byte identity -----------------------------------------------------------

describe("prepareSpaceV2ProofAssetCandidate — byte identity", () => {
  it("hands out a fresh, byte-identical copy on every call", async () => {
    const result = await prepareSpaceV2ProofAssetCandidate(input(), recordingPort());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const first = result.value.copyUploadBytes();
    const second = result.value.copyUploadBytes();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    expect(first).toEqual(pngHeader());
  });

  it("ignores a mutation of the caller's buffer made after the call", async () => {
    const pngBytes = pngHeader();
    const result = await prepareSpaceV2ProofAssetCandidate(input({ pngBytes }), recordingPort());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    pngBytes[16] = 0xff;
    pngBytes[32] = 0xff;

    expect(result.value.copyUploadBytes()).toEqual(pngHeader());
    expect(result.value.descriptor.intrinsicWidth).toBe(1200);
    expect(result.value.descriptor.byteLength).toBe(33);
  });

  it("survives a digest port that mutates the bytes it was given", async () => {
    const hostilePort: SpaceSha256Port = {
      async digest(bytes) {
        bytes.fill(0xff);
        return DIGEST_BYTES;
      },
    };

    const result = await prepareSpaceV2ProofAssetCandidate(input(), hostilePort);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.copyUploadBytes()).toEqual(pngHeader());
  });

  it("survives a caller that mutates a returned upload copy", async () => {
    const result = await prepareSpaceV2ProofAssetCandidate(input(), recordingPort());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    result.value.copyUploadBytes().fill(0);

    expect(result.value.copyUploadBytes()).toEqual(pngHeader());
    expect(result.value.descriptor.byteLength).toBe(33);
  });
});

// --- rejected input ----------------------------------------------------------

describe("prepareSpaceV2ProofAssetCandidate — rejected input", () => {
  it.each([
    ["an upper-case UUID", ASSET_ID.toUpperCase()],
    ["a non-v4 UUID", "0f9c1b2a-4d3e-3f5a-9b6c-7d8e9f0a1b2c"],
    ["a bad UUID variant", "0f9c1b2a-4d3e-4f5a-cb6c-7d8e9f0a1b2c"],
    ["a whole object path", OBJECT_PATH],
    ["a UUID with a png suffix", `${ASSET_ID}.png`],
    ["a padded UUID", ` ${ASSET_ID}`],
    ["an empty id", ""],
  ])("rejects %s without calling the digest port", async (_label, assetId) => {
    const port = recordingPort();
    const result = await prepareSpaceV2ProofAssetCandidate(input({ assetId }), port);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_INVALID_INPUT" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it.each([
    ["a plain array", [...pngHeader()]],
    ["an ArrayBuffer", pngHeader().buffer],
    ["a DataView", new DataView(pngHeader().buffer)],
    ["an Int8Array", new Int8Array(33)],
    ["a string", "png"],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s as the byte view", async (_label, pngBytes) => {
    const port = recordingPort();
    const result = await prepareSpaceV2ProofAssetCandidate(
      input({ pngBytes: pngBytes as unknown as Uint8Array }),
      port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_INVALID_INPUT" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it("rejects a detached buffer", async () => {
    const buffer = pngHeader().buffer;
    const pngBytes = new Uint8Array(buffer);
    structuredClone(buffer, { transfer: [buffer] });
    const port = recordingPort();

    const result = await prepareSpaceV2ProofAssetCandidate(input({ pngBytes }), port);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_INVALID_INPUT" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it("rejects a view on shared memory, which another agent could rewrite", async () => {
    const shared = new SharedArrayBuffer(33);
    const pngBytes = new Uint8Array(shared);
    pngBytes.set(pngHeader());
    const port = recordingPort();

    const result = await prepareSpaceV2ProofAssetCandidate(input({ pngBytes }), port);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_INVALID_INPUT" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it("rejects an empty view", async () => {
    const result = await prepareSpaceV2ProofAssetCandidate(
      input({ pngBytes: new Uint8Array(0) }),
      recordingPort(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_INVALID_INPUT" });
  });

  it.each([
    ["an extra key", { assetId: ASSET_ID, pngBytes: pngHeader(), upload: true }],
    ["a missing key", { assetId: ASSET_ID }],
    ["no keys", {}],
    ["null", null],
    ["a primitive", ASSET_ID],
    ["an array", [ASSET_ID]],
  ])("rejects %s as the whole input", async (_label, candidate) => {
    const port = recordingPort();
    const result = await prepareSpaceV2ProofAssetCandidate(
      candidate as unknown as SpaceV2ProofAssetCandidateInput,
      port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_INVALID_INPUT" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it("rejects a non-enumerable key", async () => {
    const candidate = { pngBytes: pngHeader() };
    Object.defineProperty(candidate, "assetId", { value: ASSET_ID, enumerable: false });

    const result = await prepareSpaceV2ProofAssetCandidate(
      candidate as unknown as SpaceV2ProofAssetCandidateInput,
      recordingPort(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_INVALID_INPUT" });
  });

  it("rejects an extra symbol key", async () => {
    const candidate = { assetId: ASSET_ID, pngBytes: pngHeader(), [Symbol("upload")]: true };

    const result = await prepareSpaceV2ProofAssetCandidate(
      candidate as unknown as SpaceV2ProofAssetCandidateInput,
      recordingPort(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_INVALID_INPUT" });
  });

  it("fails closed on a throwing getter instead of throwing", async () => {
    const candidate = {
      get assetId(): string {
        throw new Error("revoked");
      },
      pngBytes: pngHeader(),
    };

    const result = await prepareSpaceV2ProofAssetCandidate(
      candidate as unknown as SpaceV2ProofAssetCandidateInput,
      recordingPort(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_INVALID_INPUT" });
  });
});

// --- rejected PNG ------------------------------------------------------------

describe("prepareSpaceV2ProofAssetCandidate — rejected PNG header", () => {
  it.each([
    [
      "a bad signature byte",
      pngHeader({ signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b] }),
    ],
    [
      "a JPEG signature",
      pngHeader({ signature: [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46] }),
    ],
    ["a truncated header", pngHeader().slice(0, 32)],
    ["only the signature", Uint8Array.from(SIGNATURE)],
    ["a first chunk length that is not 13", pngHeader({ chunkLength: 12 })],
    ["a huge first chunk length", pngHeader({ chunkLength: 0xffffffff })],
    ["a first chunk that is not IHDR", pngHeader({ chunkType: [0x49, 0x44, 0x41, 0x54] })],
    ["a lower-case ihdr", pngHeader({ chunkType: [0x69, 0x68, 0x64, 0x72] })],
    ["a zero width", pngHeader({ width: 0 })],
    ["a zero height", pngHeader({ height: 0 })],
    ["a width above the PNG maximum", pngHeader({ width: 0xffffffff })],
    ["a height above the PNG maximum", pngHeader({ height: 0x80000000 })],
  ])("rejects %s without calling the digest port", async (_label, pngBytes) => {
    const port = recordingPort();
    const result = await prepareSpaceV2ProofAssetCandidate(input({ pngBytes }), port);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_INVALID_PNG" });
    expect(port.digest).not.toHaveBeenCalled();
  });
});

// --- size cap ----------------------------------------------------------------

describe("prepareSpaceV2ProofAssetCandidate — size cap", () => {
  const sized = (byteLength: number): Uint8Array => {
    const bytes = new Uint8Array(byteLength);
    bytes.set(pngHeader());
    return bytes;
  };

  it("accepts exactly the approved maximum", async () => {
    const port = recordingPort();
    const result = await prepareSpaceV2ProofAssetCandidate(
      input({ pngBytes: sized(MAX_ASSET_BYTES) }),
      port,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.descriptor.byteLength).toBe(MAX_ASSET_BYTES);
    expect(port.digest).toHaveBeenCalledTimes(1);
  });

  it("refuses one byte over the approved maximum without hashing it", async () => {
    const port = recordingPort();
    const result = await prepareSpaceV2ProofAssetCandidate(
      input({ pngBytes: sized(MAX_ASSET_BYTES + 1) }),
      port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_TOO_LARGE" });
    expect(port.digest).not.toHaveBeenCalled();
  });
});

// --- digest failures ---------------------------------------------------------

describe("prepareSpaceV2ProofAssetCandidate — digest failures", () => {
  it.each([
    [
      "a port that throws",
      {
        digest: () => {
          throw new Error("token=abc123 path admin/state.json");
        },
      },
    ],
    [
      "a port that rejects",
      { digest: async () => Promise.reject(new Error("uid=operator-1 password=hunter2")) },
    ],
    ["a port that returns the wrong length", { digest: async () => new Uint8Array(16) }],
    ["a port that returns a non-Uint8Array", { digest: async () => [1, 2, 3] }],
  ])("maps %s to a safe digest failure", async (_label, port) => {
    const result = await prepareSpaceV2ProofAssetCandidate(
      input(),
      port as unknown as SpaceSha256Port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PROOF_DIGEST_FAILED" });
    expect(Object.keys(result).sort()).toEqual(["code", "ok"]);
    expect(JSON.stringify(result)).not.toMatch(
      /rebuild-space-assets|token|password|uid|Error|hunter2|state\.json/i,
    );
  });
});

// --- boundary ----------------------------------------------------------------

describe("prepareSpaceV2ProofAssetCandidate — boundary", () => {
  const doc = (data: Record<string, unknown>): CatalogDocumentV1 =>
    ({ schemaVersion: 1, migratedFrom: "legacy-v0", data }) as unknown as CatalogDocumentV1;

  it("produces a descriptor the spec 065 issue projector accepts", async () => {
    const prepared = await prepareSpaceV2ProofAssetCandidate(input(), webCryptoPort);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    const port = recordingPort();
    const candidate = await createSpaceV2FrameIssueCandidate(
      {
        catalog: doc({
          frameSizes: [{ id: "s1", name: "사이즈", aspect: 1.4, frameThickness: 4 }],
          frameTemplates: [{ id: "ft1", name: "템플릿", type: "uploaded", clockEnabled: false }],
        }),
        selection: { frameSizeId: "s1", templateId: "ft1" },
        frameOrientation: "portrait",
        logicalWidth: 1000,
        frameColor: "#191A1D",
        transform: { scale: 1.25, x: 0.5, y: -0.25, rotationQuarterTurns: 0 },
        proofAsset: prepared.value.descriptor,
      },
      port,
    );

    expect(candidate.ok).toBe(true);
    if (!candidate.ok) return;
    expect(candidate.value.frameEvidence.proofAsset).toEqual(prepared.value.descriptor);
  });

  it("touches no network, Web Crypto, DOM, Canvas, random or clock", async () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const subtleSpy = vi.spyOn(globalThis.crypto.subtle, "digest");
    const randomSpy = vi.spyOn(Math, "random");
    const nowSpy = vi.spyOn(Date, "now");
    const uuidSpy = vi.spyOn(globalThis.crypto, "randomUUID");

    try {
      const result = await prepareSpaceV2ProofAssetCandidate(input(), recordingPort());
      expect(result.ok).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      subtleSpy.mockRestore();
      randomSpy.mockRestore();
      nowSpy.mockRestore();
      uuidSpy.mockRestore();
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(subtleSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
    expect(nowSpy).not.toHaveBeenCalled();
    expect(uuidSpy).not.toHaveBeenCalled();
    expect("document" in globalThis).toBe(false);
    expect("HTMLCanvasElement" in globalThis).toBe(false);
  });

  it("stays out of the admin UI: App.tsx never imports or calls it", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

    expect(app).not.toContain("proof-asset-candidate");
    expect(app).not.toContain("prepareSpaceV2ProofAssetCandidate");
  });
});
