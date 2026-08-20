import { describe, expect, it } from "vitest";
import {
  createFrameReplayEvidenceDigestV1,
  encodeFrameReplayEvidenceV1,
  FRAME_EVIDENCE_ENCODING_V1,
  FRAME_REPLAY_CONTRACT_V1,
  readSpaceDocument,
  readSpaceDocumentV2,
  readSpaceScene,
  readSpaceSceneV2,
  SPACE_DOCUMENT_V2_VERSION,
  SPACE_SCENE_VERSION,
  SPACE_SCENE_V2_VERSION,
  verifyFrameReplayEvidenceDigestV1,
  type FrameReplayEvidenceV1,
  type SpaceSha256Port,
} from "./index";

const envelope = {
  salt: "AAECAwQFBgcICQoLDA0ODw==",
  iv: "EBESExQVFhcYGRob",
  ct: "AAECAwQFBgcICQoLDA0ODw==",
};
const ZERO_SHA256 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const ONE_SHA256 = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
const ASSET_A = "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png";
const ASSET_B = "rebuild-space-assets/objects/123e4567-e89b-42d3-b456-426614174001.png";

function evidence(): FrameReplayEvidenceV1 {
  return {
    replayContract: "frame-logical-plan-v1",
    frameOrientation: "portrait",
    logicalWidth: 800,
    geometry: {
      aspect: 1,
      borderPercentOfWidth: 4,
      matColor: "#FFFFFF",
      contentInsetPx: 8,
    },
    frameColor: "#9F887A",
    transformEncoding: "normalized-max-pan-v1",
    transform: { scale: 1.25, x: -0.5, y: 0.25, rotationQuarterTurns: 1 },
    proofAsset: {
      objectPath: ASSET_A,
      sha256: ZERO_SHA256,
      byteLength: 123_456,
      contentType: "image/png",
      intrinsicWidth: 1600,
      intrinsicHeight: 2400,
    },
    templateArt: { kind: "none" },
    textMode: "none",
    clockMode: "off",
  };
}

function digest(value = ZERO_SHA256) {
  return { algorithm: "SHA-256", encoding: "denn-frame-evidence-v1", value } as const;
}

function scene() {
  return {
    schema: "space-scene-v2",
    productKind: "frame",
    frameEvidence: evidence(),
    frameEvidenceDigest: digest(),
    roomCapability: "unsupported",
  } as const;
}

function encodedText(input: unknown): string {
  const result = encodeFrameReplayEvidenceV1(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected encoded evidence");
  return new TextDecoder().decode(result.value.bytes);
}

describe("space-v2 strict readers", () => {
  it("exports separate V2 identifiers without changing the V1 identifier", () => {
    expect(SPACE_SCENE_VERSION).toBe("space-scene-v1");
    expect(SPACE_DOCUMENT_V2_VERSION).toBe("space-v2");
    expect(SPACE_SCENE_V2_VERSION).toBe("space-scene-v2");
    expect(FRAME_REPLAY_CONTRACT_V1).toBe("frame-logical-plan-v1");
    expect(FRAME_EVIDENCE_ENCODING_V1).toBe("denn-frame-evidence-v1");
  });

  it("reads an exact outer document into a detached envelope", () => {
    const input = { schema: "space-v2", enc: { ...envelope } };
    const result = readSpaceDocumentV2(input);
    expect(result).toEqual({ ok: true, value: input });
    expect(result.ok && result.value).not.toBe(input);
    expect(result.ok && result.value.enc).not.toBe(input.enc);
    expect(readSpaceDocument(input)).toEqual({ ok: false, code: "SPACE_INVALID_DOCUMENT" });
  });

  it.each([
    null,
    {},
    { schema: "space-v1", enc: envelope },
    { schema: "space-v2", enc: envelope, createdAt: "2026-08-20" },
    { schema: "space-v2", enc: { ...envelope, extra: true } },
    { schema: "space-v2", enc: { ...envelope, salt: "AA==" } },
    { schema: "space-v2", enc: { ...envelope, iv: "AA==" } },
    { schema: "space-v2", enc: { ...envelope, ct: "AA==" } },
  ])("rejects a non-exact or invalid V2 document", (input) => {
    expect(readSpaceDocumentV2(input)).toEqual({
      ok: false,
      code: "SPACE_V2_INVALID_DOCUMENT",
    });
  });

  it("reads the exact image-only scene as a detached snapshot without opening V1", () => {
    const input = scene();
    const result = readSpaceSceneV2(input);
    expect(result).toEqual({ ok: true, value: input });
    expect(result.ok && result.value).not.toBe(input);
    expect(result.ok && result.value.frameEvidence).not.toBe(input.frameEvidence);
    expect(readSpaceScene(input)).toEqual({ ok: false, code: "SPACE_INVALID_SCENE" });
  });

  it("accepts the inclusive numeric bounds and the exclusive 20 MiB maximum", () => {
    const input = scene();
    const frameEvidence = {
      ...input.frameEvidence,
      frameOrientation: "landscape" as const,
      geometry: { ...input.frameEvidence.geometry, aspect: 1 },
      transform: { scale: 5, x: -1, y: 1, rotationQuarterTurns: 3 as const },
      proofAsset: {
        ...input.frameEvidence.proofAsset,
        byteLength: 20 * 1024 * 1024 - 1,
        intrinsicWidth: Number.MAX_SAFE_INTEGER,
      },
    };
    expect(readSpaceSceneV2({ ...input, frameEvidence })).toMatchObject({ ok: true });
  });

  it.each([
    ["top extra", { ...scene(), extra: true }],
    ["evidence extra", { ...scene(), frameEvidence: { ...evidence(), text: "secret" } }],
    [
      "geometry extra",
      {
        ...scene(),
        frameEvidence: { ...evidence(), geometry: { ...evidence().geometry, extra: 1 } },
      },
    ],
    [
      "transform extra",
      {
        ...scene(),
        frameEvidence: { ...evidence(), transform: { ...evidence().transform, extra: 1 } },
      },
    ],
    [
      "proof extra",
      {
        ...scene(),
        frameEvidence: { ...evidence(), proofAsset: { ...evidence().proofAsset, extra: 1 } },
      },
    ],
    [
      "template extra",
      { ...scene(), frameEvidence: { ...evidence(), templateArt: { kind: "none", extra: 1 } } },
    ],
    ["digest extra", { ...scene(), frameEvidenceDigest: { ...digest(), extra: 1 } }],
    ["lowercase color", { ...scene(), frameEvidence: { ...evidence(), frameColor: "#ffffff" } }],
    ["zero logical width", { ...scene(), frameEvidence: { ...evidence(), logicalWidth: 0 } }],
    [
      "fractional logical width",
      { ...scene(), frameEvidence: { ...evidence(), logicalWidth: 800.5 } },
    ],
    [
      "unsafe logical width",
      { ...scene(), frameEvidence: { ...evidence(), logicalWidth: Number.MAX_SAFE_INTEGER + 1 } },
    ],
    [
      "zero aspect",
      {
        ...scene(),
        frameEvidence: { ...evidence(), geometry: { ...evidence().geometry, aspect: 0 } },
      },
    ],
    [
      "zero border",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          geometry: { ...evidence().geometry, borderPercentOfWidth: 0 },
        },
      },
    ],
    [
      "unknown inset",
      {
        ...scene(),
        frameEvidence: { ...evidence(), geometry: { ...evidence().geometry, contentInsetPx: 4 } },
      },
    ],
    [
      "scale below range",
      {
        ...scene(),
        frameEvidence: { ...evidence(), transform: { ...evidence().transform, scale: 0.99 } },
      },
    ],
    [
      "scale above range",
      {
        ...scene(),
        frameEvidence: { ...evidence(), transform: { ...evidence().transform, scale: 5.01 } },
      },
    ],
    [
      "x outside range",
      {
        ...scene(),
        frameEvidence: { ...evidence(), transform: { ...evidence().transform, x: -1.01 } },
      },
    ],
    [
      "y outside range",
      {
        ...scene(),
        frameEvidence: { ...evidence(), transform: { ...evidence().transform, y: 1.01 } },
      },
    ],
    [
      "rotation outside range",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          transform: { ...evidence().transform, rotationQuarterTurns: 4 },
        },
      },
    ],
    [
      "non-v4 path",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          proofAsset: {
            ...evidence().proofAsset,
            objectPath: "rebuild-space-assets/objects/123e4567-e89b-12d3-a456-426614174000.png",
          },
        },
      },
    ],
    [
      "uppercase uuid",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          proofAsset: {
            ...evidence().proofAsset,
            objectPath: "rebuild-space-assets/objects/123E4567-e89b-42d3-a456-426614174000.png",
          },
        },
      },
    ],
    [
      "old proofs path",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          proofAsset: { ...evidence().proofAsset, objectPath: "proofs/a.png" },
        },
      },
    ],
    [
      "asset at 20 MiB",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          proofAsset: { ...evidence().proofAsset, byteLength: 20 * 1024 * 1024 },
        },
      },
    ],
    [
      "zero asset bytes",
      {
        ...scene(),
        frameEvidence: { ...evidence(), proofAsset: { ...evidence().proofAsset, byteLength: 0 } },
      },
    ],
    [
      "fractional asset bytes",
      {
        ...scene(),
        frameEvidence: { ...evidence(), proofAsset: { ...evidence().proofAsset, byteLength: 1.5 } },
      },
    ],
    [
      "zero intrinsic width",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          proofAsset: { ...evidence().proofAsset, intrinsicWidth: 0 },
        },
      },
    ],
    [
      "fractional intrinsic height",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          proofAsset: { ...evidence().proofAsset, intrinsicHeight: 2.5 },
        },
      },
    ],
    [
      "wrong content type",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          proofAsset: { ...evidence().proofAsset, contentType: "image/jpeg" },
        },
      },
    ],
    [
      "proof digest length",
      {
        ...scene(),
        frameEvidence: { ...evidence(), proofAsset: { ...evidence().proofAsset, sha256: "AA==" } },
      },
    ],
    ["digest length", { ...scene(), frameEvidenceDigest: digest("AA==") }],
    ["digest algorithm", { ...scene(), frameEvidenceDigest: { ...digest(), algorithm: "SHA-1" } }],
    ["digest encoding", { ...scene(), frameEvidenceDigest: { ...digest(), encoding: "other" } }],
    [
      "landscape aspect",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          frameOrientation: "landscape",
          geometry: { ...evidence().geometry, aspect: 1.1 },
        },
      },
    ],
    [
      "portrait aspect",
      {
        ...scene(),
        frameEvidence: {
          ...evidence(),
          frameOrientation: "portrait",
          geometry: { ...evidence().geometry, aspect: 0.9 },
        },
      },
    ],
    [
      "non-finite",
      {
        ...scene(),
        frameEvidence: { ...evidence(), transform: { ...evidence().transform, x: Number.NaN } },
      },
    ],
    [
      "non-empty text capability",
      { ...scene(), frameEvidence: { ...evidence(), textMode: "text" } },
    ],
    [
      "template art capability",
      { ...scene(), frameEvidence: { ...evidence(), templateArt: { kind: "image" } } },
    ],
    ["clock capability", { ...scene(), frameEvidence: { ...evidence(), clockMode: "on" } }],
    ["room capability", { ...scene(), roomCapability: "room" }],
  ])("rejects unsupported or malformed scene input: %s", (_label, input) => {
    const result = readSpaceSceneV2(input);
    expect(result).toEqual({ ok: false, code: "SPACE_V2_INVALID_SCENE" });
    expect(Object.keys(result).sort()).toEqual(["code", "ok"]);
  });

  it("fails closed for hostile/circular input without exposing raw values", () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("secret-token");
        },
      },
    );
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    for (const input of [hostile, { ...scene(), circular }]) {
      const result = readSpaceSceneV2(input);
      expect(result).toEqual({ ok: false, code: "SPACE_V2_INVALID_SCENE" });
      expect(JSON.stringify(result)).not.toContain("secret-token");
      expect(JSON.stringify(result)).not.toContain(ASSET_A);
    }
  });

  it("rejects symbol and non-enumerable keys that cannot belong to the exact JSON shape", () => {
    const withSymbol = scene() as unknown as Record<PropertyKey, unknown>;
    withSymbol[Symbol("extra")] = true;
    expect(readSpaceSceneV2(withSymbol)).toEqual({
      ok: false,
      code: "SPACE_V2_INVALID_SCENE",
    });

    const hiddenSchema = { ...scene() } as Record<string, unknown>;
    Object.defineProperty(hiddenSchema, "schema", {
      configurable: true,
      enumerable: false,
      value: "space-scene-v2",
    });
    expect(readSpaceSceneV2(hiddenSchema)).toEqual({
      ok: false,
      code: "SPACE_V2_INVALID_SCENE",
    });
  });
});

describe("frame replay evidence canonical encoding", () => {
  it("pins the fixed-position UTF-8 tuple vector", () => {
    expect(encodedText(evidence())).toBe(
      '["denn-frame-evidence-v1","frame-logical-plan-v1","portrait",800,1,4,"#FFFFFF",8,"#9F887A","normalized-max-pan-v1",1.25,-0.5,0.25,1,"rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",123456,"image/png",1600,2400,"none","none","off"]',
    );
  });

  it("normalizes accepted negative zero and ignores source key insertion order", () => {
    const source = evidence();
    const reordered = {
      clockMode: source.clockMode,
      textMode: source.textMode,
      templateArt: { kind: source.templateArt.kind },
      proofAsset: {
        intrinsicHeight: source.proofAsset.intrinsicHeight,
        intrinsicWidth: source.proofAsset.intrinsicWidth,
        contentType: source.proofAsset.contentType,
        byteLength: source.proofAsset.byteLength,
        sha256: source.proofAsset.sha256,
        objectPath: source.proofAsset.objectPath,
      },
      transform: { rotationQuarterTurns: 1, y: 0.25, x: -0, scale: 1.25 },
      transformEncoding: source.transformEncoding,
      frameColor: source.frameColor,
      geometry: { contentInsetPx: 8, matColor: "#FFFFFF", borderPercentOfWidth: 4, aspect: 1 },
      logicalWidth: source.logicalWidth,
      frameOrientation: source.frameOrientation,
      replayContract: source.replayContract,
    };
    const baseline = { ...source, transform: { ...source.transform, x: 0 } };
    expect(encodedText(reordered)).toBe(encodedText(baseline));
  });

  it("reads every accepted input field once before producing a detached snapshot", () => {
    const counts = new Map<string, number>();
    const counted = (value: Record<string, unknown>, prefix: string) => {
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) {
        Object.defineProperty(result, key, {
          enumerable: true,
          get() {
            const path = `${prefix}.${key}`;
            counts.set(path, (counts.get(path) ?? 0) + 1);
            return item;
          },
        });
      }
      return result;
    };
    const source = evidence();
    const input = counted(
      {
        ...source,
        geometry: counted(source.geometry as unknown as Record<string, unknown>, "geometry"),
        transform: counted(source.transform as unknown as Record<string, unknown>, "transform"),
        proofAsset: counted(source.proofAsset as unknown as Record<string, unknown>, "proof"),
        templateArt: counted(source.templateArt as unknown as Record<string, unknown>, "art"),
      },
      "evidence",
    );
    const result = encodeFrameReplayEvidenceV1(input);
    expect(result.ok).toBe(true);
    expect([...counts.values()].every((count) => count === 1)).toBe(true);
    expect(counts.size).toBe(26);
  });

  it("does not re-read a drifting getter", () => {
    const input = evidence() as unknown as Record<string, unknown>;
    let reads = 0;
    Object.defineProperty(input, "frameOrientation", {
      enumerable: true,
      get() {
        reads += 1;
        return reads === 1 ? "portrait" : "landscape";
      },
    });
    expect(encodeFrameReplayEvidenceV1(input).ok).toBe(true);
    expect(reads).toBe(1);
  });

  it.each([
    ["extra", { ...evidence(), extra: true }],
    [
      "circular",
      (() => {
        const value = evidence() as unknown as Record<string, unknown>;
        value.extra = value;
        return value;
      })(),
    ],
    [
      "bad number",
      { ...evidence(), geometry: { ...evidence().geometry, aspect: Number.POSITIVE_INFINITY } },
    ],
    ["bad digest", { ...evidence(), proofAsset: { ...evidence().proofAsset, sha256: "AA==" } }],
  ])("maps invalid canonical input to one safe error: %s", (_label, input) => {
    expect(encodeFrameReplayEvidenceV1(input)).toEqual({
      ok: false,
      code: "SPACE_V2_INVALID_EVIDENCE",
    });
  });

  it("changes the digest for every mutable replay field", async () => {
    const base = evidence();
    const mutations: FrameReplayEvidenceV1[] = [
      { ...base, frameOrientation: "landscape" },
      { ...base, logicalWidth: 801 },
      { ...base, geometry: { ...base.geometry, aspect: 1.1 } },
      { ...base, geometry: { ...base.geometry, borderPercentOfWidth: 5 } },
      { ...base, geometry: { ...base.geometry, matColor: "#EEEEEE" } },
      { ...base, geometry: { ...base.geometry, contentInsetPx: 0 } },
      { ...base, frameColor: "#887766" },
      { ...base, transform: { ...base.transform, scale: 2 } },
      { ...base, transform: { ...base.transform, x: 0 } },
      { ...base, transform: { ...base.transform, y: 0 } },
      { ...base, transform: { ...base.transform, rotationQuarterTurns: 2 } },
      { ...base, proofAsset: { ...base.proofAsset, objectPath: ASSET_B } },
      { ...base, proofAsset: { ...base.proofAsset, sha256: ONE_SHA256 } },
      { ...base, proofAsset: { ...base.proofAsset, byteLength: 123_457 } },
      { ...base, proofAsset: { ...base.proofAsset, intrinsicWidth: 1601 } },
      { ...base, proofAsset: { ...base.proofAsset, intrinsicHeight: 2401 } },
    ];
    const baseline = await createFrameReplayEvidenceDigestV1(base);
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) return;
    const results = await Promise.all(
      mutations.map((mutation) => createFrameReplayEvidenceDigestV1(mutation)),
    );
    expect(
      results.every((result) => result.ok && result.value.value !== baseline.value.value),
    ).toBe(true);
  });
});

describe("frame replay evidence SHA-256 port", () => {
  it("pins the default Web Crypto digest vector", async () => {
    await expect(createFrameReplayEvidenceDigestV1(evidence())).resolves.toEqual({
      ok: true,
      value: {
        algorithm: "SHA-256",
        encoding: "denn-frame-evidence-v1",
        value: "9TMqpMGuEgpsbOQW8QfNdh/MysY0dDRPbDl4ODX7/mI=",
      },
    });
  });

  it("calls an injected hash exactly once with a defensive canonical byte copy", async () => {
    const calls: Uint8Array[] = [];
    const port: SpaceSha256Port = {
      async digest(bytes) {
        calls.push(bytes);
        return new Uint8Array(32).fill(7);
      },
    };
    const result = await createFrameReplayEvidenceDigestV1(evidence(), port);
    expect(result).toEqual({
      ok: true,
      value: {
        algorithm: "SHA-256",
        encoding: "denn-frame-evidence-v1",
        value: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=",
      },
    });
    expect(calls).toHaveLength(1);
    expect(new TextDecoder().decode(calls[0])).toBe(encodedText(evidence()));
  });

  it.each([
    [
      "throw",
      {
        digest: () => {
          throw new Error("raw-sdk-secret");
        },
      },
    ],
    ["reject", { digest: () => Promise.reject(new Error("raw-sdk-secret")) }],
    ["short", { digest: async () => new Uint8Array(31) }],
  ] satisfies readonly [string, SpaceSha256Port][])(
    "maps injected digest %s to one safe failure",
    async (_label, port) => {
      const result = await createFrameReplayEvidenceDigestV1(evidence(), port);
      expect(result).toEqual({ ok: false, code: "SPACE_V2_DIGEST_FAILED" });
      expect(JSON.stringify(result)).not.toContain("raw-sdk-secret");
      expect(JSON.stringify(result)).not.toContain(ASSET_A);
    },
  );

  it("verifies a matching digest and rejects mismatch without silent retry", async () => {
    let calls = 0;
    const port: SpaceSha256Port = {
      async digest() {
        calls += 1;
        return new Uint8Array(32).fill(7);
      },
    };
    await expect(
      verifyFrameReplayEvidenceDigestV1(
        evidence(),
        digest("BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc="),
        port,
      ),
    ).resolves.toMatchObject({ ok: true });
    expect(calls).toBe(1);

    await expect(verifyFrameReplayEvidenceDigestV1(evidence(), digest(), port)).resolves.toEqual({
      ok: false,
      code: "SPACE_V2_DIGEST_MISMATCH",
    });
    expect(calls).toBe(2);
  });

  it("rejects an invalid expected digest before hashing", async () => {
    let calls = 0;
    const port: SpaceSha256Port = {
      async digest() {
        calls += 1;
        return new Uint8Array(32);
      },
    };
    await expect(
      verifyFrameReplayEvidenceDigestV1(evidence(), { ...digest(), extra: true }, port),
    ).resolves.toEqual({ ok: false, code: "SPACE_V2_INVALID_EVIDENCE" });
    expect(calls).toBe(0);
  });
});
