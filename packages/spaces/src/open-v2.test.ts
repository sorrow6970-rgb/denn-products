import { describe, expect, it, vi } from "vitest";
import {
  createSpaceOpenPort,
  createSpaceV2OpenPort,
  type FrameReplayEvidenceV1,
  type SpaceCryptoPort,
  type SpaceSha256Port,
} from "./index";

const ENVELOPE = {
  salt: "AAECAwQFBgcICQoLDA0ODw==",
  iv: "EBESExQVFhcYGRob",
  ct: "AAECAwQFBgcICQoLDA0ODw==",
};
const ZERO_SHA256 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function evidence(): FrameReplayEvidenceV1 {
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
      objectPath: "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png",
      sha256: ZERO_SHA256,
      byteLength: 3,
      contentType: "image/png",
      intrinsicWidth: 1600,
      intrinsicHeight: 2400,
    },
    templateArt: { kind: "none" },
    textMode: "none",
    clockMode: "off",
  };
}

function scene(digest = ZERO_SHA256) {
  return {
    schema: "space-scene-v2" as const,
    productKind: "frame" as const,
    frameEvidence: evidence(),
    frameEvidenceDigest: {
      algorithm: "SHA-256" as const,
      encoding: "denn-frame-evidence-v1" as const,
      value: digest,
    },
    roomCapability: "unsupported" as const,
  };
}

const document = () => ({ schema: "space-v2" as const, enc: { ...ENVELOPE } });
const sha256 = (fill = 0): SpaceSha256Port => ({
  digest: vi.fn(async () => new Uint8Array(32).fill(fill)),
});

function crypto(value: unknown = scene()): Pick<SpaceCryptoPort, "decryptJson"> {
  return { decryptJson: vi.fn(async () => ({ ok: true as const, value })) };
}

describe("createSpaceV2OpenPort", () => {
  it("opens an exact V2 document in validation → decrypt → scene → digest order", async () => {
    const calls: string[] = [];
    const decryptJson = vi.fn(async () => {
      calls.push("decrypt");
      return { ok: true as const, value: scene() };
    });
    const digest = vi.fn(async () => {
      calls.push("digest");
      return new Uint8Array(32);
    });

    const result = await createSpaceV2OpenPort({ decryptJson }, { digest }).open(document(), "pw");

    expect(result).toEqual({
      ok: true,
      value: { schema: "space-v2", scene: scene() },
    });
    expect(calls).toEqual(["decrypt", "digest"]);
    expect(decryptJson).toHaveBeenCalledWith(ENVELOPE, "pw");
    expect(digest).toHaveBeenCalledTimes(1);
  });

  it("keeps V1 and V2 openers separate", async () => {
    const v1 = {
      schema: "space-v1",
      ownerLabel: "operator",
      createdAt: "2026-08-26",
      enc: ENVELOPE,
    };
    const decryptJson = vi.fn(async () => ({ ok: true as const, value: scene() }));
    expect(await createSpaceV2OpenPort({ decryptJson }, sha256()).open(v1, "pw")).toEqual({
      ok: false,
      code: "SPACE_V2_OPEN_INVALID_DOCUMENT",
    });
    expect(decryptJson).not.toHaveBeenCalled();
    expect(createSpaceOpenPort).toBeTypeOf("function");
  });

  it.each([null, {}, { ...document(), extra: true }])(
    "rejects an invalid document before decrypt/hash",
    async (input) => {
      const decryptJson = vi.fn(async () => ({ ok: true as const, value: scene() }));
      const hash = sha256();
      expect(await createSpaceV2OpenPort({ decryptJson }, hash).open(input, "pw")).toEqual({
        ok: false,
        code: "SPACE_V2_OPEN_INVALID_DOCUMENT",
      });
      expect(decryptJson).not.toHaveBeenCalled();
      expect(hash.digest).not.toHaveBeenCalled();
    },
  );

  it.each([null, ""])("rejects an invalid password before decrypt/hash", async (password) => {
    const decryptJson = vi.fn(async () => ({ ok: true as const, value: scene() }));
    const hash = sha256();
    expect(await createSpaceV2OpenPort({ decryptJson }, hash).open(document(), password)).toEqual({
      ok: false,
      code: "SPACE_V2_OPEN_INVALID_INPUT",
    });
    expect(decryptJson).not.toHaveBeenCalled();
    expect(hash.digest).not.toHaveBeenCalled();
  });

  it("maps decrypt rejection and malformed plaintext without leaking raw values", async () => {
    const rejected = { decryptJson: vi.fn(async () => Promise.reject(new Error("SECRET"))) };
    const first = await createSpaceV2OpenPort(rejected, sha256()).open(
      document(),
      "password-secret",
    );
    expect(first).toEqual({ ok: false, code: "SPACE_V2_OPEN_DECRYPT_FAILED" });
    expect(JSON.stringify(first)).not.toContain("SECRET");
    expect(JSON.stringify(first)).not.toContain("password-secret");

    const hash = sha256();
    const second = await createSpaceV2OpenPort(crypto({ schema: "bad" }), hash).open(
      document(),
      "pw",
    );
    expect(second).toEqual({ ok: false, code: "SPACE_V2_OPEN_INVALID_SCENE" });
    expect(hash.digest).not.toHaveBeenCalled();
  });

  it("fails closed when evidence digest verification fails", async () => {
    const result = await createSpaceV2OpenPort(crypto(scene()), sha256(1)).open(document(), "pw");
    expect(result).toEqual({ ok: false, code: "SPACE_V2_OPEN_EVIDENCE_FAILED" });
  });

  it("returns detached validated scene data", async () => {
    const source = scene();
    const result = await createSpaceV2OpenPort(crypto(source), sha256()).open(document(), "pw");
    expect(result.ok).toBe(true);
    (source.frameEvidence.transform as { x: number }).x = 0.75;
    if (result.ok) expect(result.value.scene.frameEvidence.transform.x).toBe(-0.5);
  });
});
