// Unit contract for the local space V2 document encryption candidate (spec 067 §5). Synthetic scene
// and synthetic password only — no real token, no real proof object, no network, no Firebase, no UI.
// The crypto port and the SHA-256 port are always injected; one test uses the real
// `createSpaceCrypto` over local Web Crypto to prove a full local roundtrip.

import { readFileSync } from "node:fs";
import {
  createFrameReplayEvidenceDigestV1,
  createSpaceCrypto,
  encodeFrameReplayEvidenceV1,
  readSpaceDocumentV2,
  readSpaceSceneV2,
  type SpaceCryptoPort,
  type SpaceEncryptedEnvelope,
  type SpaceSceneV2,
  type SpaceSha256Port,
} from "@denn/spaces";
import { describe, expect, it, vi } from "vitest";
import {
  createSpaceV2DocumentEncryptionCandidate,
  type SpaceV2DocumentEncryptionCandidateInput,
} from "./document-encryption-candidate";

// --- fixtures ----------------------------------------------------------------

const PASSWORD = "구운몽-2026";

const webCryptoPort: SpaceSha256Port = {
  async digest(bytes) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
    return new Uint8Array(digest);
  },
};

/** Records every call and delegates, so "exactly once, on these bytes" stays assertable. */
const recordingSha256 = () => {
  const calls: Uint8Array[] = [];
  return {
    calls,
    digest: vi.fn(async (bytes: Uint8Array) => {
      calls.push(Uint8Array.from(bytes));
      return webCryptoPort.digest(bytes);
    }),
  };
};

const EVIDENCE = {
  replayContract: "frame-logical-plan-v1",
  frameOrientation: "portrait",
  logicalWidth: 1000,
  geometry: { aspect: 1.4, borderPercentOfWidth: 4, matColor: "#FFFFFF", contentInsetPx: 8 },
  frameColor: "#191A1D",
  transformEncoding: "normalized-max-pan-v1",
  transform: { scale: 1.25, x: 0.5, y: -0.25, rotationQuarterTurns: 0 },
  proofAsset: {
    objectPath: "rebuild-space-assets/objects/0f9c1b2a-4d3e-4f5a-9b6c-7d8e9f0a1b2c.png",
    sha256: `${"A".repeat(43)}=`,
    byteLength: 2048,
    contentType: "image/png",
    intrinsicWidth: 1200,
    intrinsicHeight: 1680,
  },
  templateArt: { kind: "none" },
  textMode: "none",
  clockMode: "off",
} as const;

const digestFixture = await createFrameReplayEvidenceDigestV1(EVIDENCE, webCryptoPort);
if (!digestFixture.ok) throw new Error("fixture digest failed");

/** A caller-owned, mutable scene object — the shape a real caller would hand in. */
const sceneSource = () => ({
  schema: "space-scene-v2" as const,
  productKind: "frame" as const,
  frameEvidence: structuredClone(EVIDENCE) as Record<string, unknown>,
  frameEvidenceDigest: { ...digestFixture.value } as Record<string, unknown>,
  roomCapability: "unsupported" as const,
});

const canonicalScene = (): SpaceSceneV2 => {
  const read = readSpaceSceneV2(sceneSource());
  if (!read.ok) throw new Error("fixture scene failed");
  return read.value;
};

const CANONICAL_SCENE = canonicalScene();

const b64 = (bytes: number[]): string => btoa(String.fromCharCode(...bytes));

const ENVELOPE: SpaceEncryptedEnvelope = {
  salt: b64(new Array(16).fill(0x11)),
  iv: b64(new Array(12).fill(0x22)),
  ct: b64(new Array(48).fill(0x33)),
};

/** Deterministic stand-in so a test never depends on real key derivation. */
const recordingCrypto = (envelope: SpaceEncryptedEnvelope = ENVELOPE) => {
  const calls: { value: unknown; password: string }[] = [];
  return {
    calls,
    encryptJson: vi.fn(async (value: unknown, password: string) => {
      calls.push({ value, password });
      return { ok: true as const, value: envelope };
    }),
    decryptJson: vi.fn(async () => ({ ok: false as const, code: "SPACE_DECRYPT_FAILED" as const })),
  };
};

const input = (
  over: Partial<SpaceV2DocumentEncryptionCandidateInput> = {},
): SpaceV2DocumentEncryptionCandidateInput => ({
  scene: sceneSource() as unknown as SpaceSceneV2,
  password: PASSWORD,
  ...over,
});

// --- success -----------------------------------------------------------------

describe("createSpaceV2DocumentEncryptionCandidate — success", () => {
  it("wraps the envelope in the exact V2 outer document", async () => {
    const crypto = recordingCrypto();
    const sha256 = recordingSha256();

    const result = await createSpaceV2DocumentEncryptionCandidate(input(), crypto, sha256);

    expect(result).toEqual({
      ok: true,
      value: { schema: "space-v2", enc: { ...ENVELOPE } },
    });
    if (!result.ok) return;
    expect(Object.keys(result.value).sort()).toEqual(["enc", "schema"]);
    expect(Object.keys(result.value.enc).sort()).toEqual(["ct", "iv", "salt"]);
    expect(readSpaceDocumentV2(result.value).ok).toBe(true);
  });

  it("encrypts the reader's canonical scene, with the exact password", async () => {
    const crypto = recordingCrypto();
    const result = await createSpaceV2DocumentEncryptionCandidate(
      input(),
      crypto,
      recordingSha256(),
    );

    expect(result.ok).toBe(true);
    expect(crypto.encryptJson).toHaveBeenCalledTimes(1);
    expect(crypto.calls[0]?.value).toEqual(CANONICAL_SCENE);
    expect(crypto.calls[0]?.password).toBe(PASSWORD);
  });

  it("hashes the canonical evidence bytes exactly once before encrypting", async () => {
    const crypto = recordingCrypto();
    const sha256 = recordingSha256();

    const result = await createSpaceV2DocumentEncryptionCandidate(input(), crypto, sha256);

    expect(result.ok).toBe(true);
    expect(sha256.digest).toHaveBeenCalledTimes(1);
    const encoded = encodeFrameReplayEvidenceV1(CANONICAL_SCENE.frameEvidence);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect(sha256.calls[0]).toEqual(encoded.value.bytes);
    expect(crypto.decryptJson).not.toHaveBeenCalled();
  });

  it("adds nothing to the outer document beyond the GG-1 contract", async () => {
    const result = await createSpaceV2DocumentEncryptionCandidate(
      input(),
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.value);
    for (const forbidden of [
      "token",
      "owner",
      "uid",
      "createdAt",
      "rebuild-space-assets",
      PASSWORD,
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("is detached: mutating the caller's scene or password afterwards changes nothing", async () => {
    const scene = sceneSource();
    const candidate = { scene: scene as unknown as SpaceSceneV2, password: PASSWORD };
    const crypto = recordingCrypto();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      candidate,
      crypto,
      recordingSha256(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    scene.frameEvidence.logicalWidth = 4;
    (scene.frameEvidenceDigest as { value: string }).value = `${"B".repeat(43)}=`;
    (candidate as { password: string }).password = "other";
    (result.value.enc as { salt: string }).salt = "tampered";

    expect(crypto.calls[0]?.value).toEqual(CANONICAL_SCENE);
    expect(crypto.calls[0]?.password).toBe(PASSWORD);
    expect(readSpaceDocumentV2({ schema: "space-v2", enc: ENVELOPE }).ok).toBe(true);
  });
});

// --- evidence verification ---------------------------------------------------

describe("createSpaceV2DocumentEncryptionCandidate — evidence verification", () => {
  it("refuses a scene whose digest does not belong to its evidence", async () => {
    const scene = sceneSource();
    // Shape-valid but wrong: `readSpaceSceneV2` accepts it, only the verifier can catch it.
    scene.frameEvidenceDigest = { ...scene.frameEvidenceDigest, value: `${"C".repeat(43)}=` };
    const crypto = recordingCrypto();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      input({ scene: scene as unknown as SpaceSceneV2 }),
      crypto,
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED" });
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });

  it("refuses a scene whose evidence was edited away from its digest", async () => {
    const scene = sceneSource();
    scene.frameEvidence = { ...scene.frameEvidence, logicalWidth: 999 };
    const crypto = recordingCrypto();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      input({ scene: scene as unknown as SpaceSceneV2 }),
      crypto,
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED" });
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a port that throws",
      {
        digest: () => {
          throw new Error("token=abc123 password=hunter2");
        },
      },
    ],
    ["a port that rejects", { digest: async () => Promise.reject(new Error("uid=operator-1")) }],
    ["a port that returns the wrong length", { digest: async () => new Uint8Array(16) }],
    ["a port that returns a non-Uint8Array", { digest: async () => "digest" }],
  ])("refuses %s without encrypting", async (_label, sha256) => {
    const crypto = recordingCrypto();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      input(),
      crypto,
      sha256 as unknown as SpaceSha256Port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED" });
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });
});

// --- rejected input ----------------------------------------------------------

describe("createSpaceV2DocumentEncryptionCandidate — rejected input", () => {
  it.each([
    ["an empty password", ""],
    ["a non-string password", 1234],
    ["a null password", null],
    ["an undefined password", undefined],
  ])("rejects %s without encrypting", async (_label, password) => {
    const crypto = recordingCrypto();
    const sha256 = recordingSha256();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      input({ password: password as unknown as string }),
      crypto,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_INVALID_INPUT" });
    expect(crypto.encryptJson).not.toHaveBeenCalled();
    expect(sha256.digest).not.toHaveBeenCalled();
  });

  it("keeps a whitespace-only password, because the existing contract only bans the empty string", async () => {
    const crypto = recordingCrypto();
    const result = await createSpaceV2DocumentEncryptionCandidate(
      input({ password: "   " }),
      crypto,
      recordingSha256(),
    );

    expect(result.ok).toBe(true);
    expect(crypto.calls[0]?.password).toBe("   ");
  });

  it.each([
    ["a null scene", null],
    ["a scene with an extra key", { ...sceneSource(), token: "t" }],
    ["a scene with a missing key", { schema: "space-scene-v2", productKind: "frame" }],
    ["a V1 scene version", { ...sceneSource(), schema: "space-scene-v1" }],
    ["an unsupported room capability", { ...sceneSource(), roomCapability: "supported" }],
    ["a non-frame product", { ...sceneSource(), productKind: "case" }],
  ])("rejects %s without hashing or encrypting", async (_label, scene) => {
    const crypto = recordingCrypto();
    const sha256 = recordingSha256();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      input({ scene: scene as unknown as SpaceSceneV2 }),
      crypto,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_INVALID_INPUT" });
    expect(sha256.digest).not.toHaveBeenCalled();
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });

  it.each([
    ["an extra key", { scene: sceneSource(), password: PASSWORD, token: "t" }],
    ["a missing key", { scene: sceneSource() }],
    ["no keys", {}],
    ["null", null],
    ["a primitive", PASSWORD],
    ["an array", [sceneSource()]],
  ])("rejects %s as the whole input", async (_label, candidate) => {
    const crypto = recordingCrypto();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      candidate as unknown as SpaceV2DocumentEncryptionCandidateInput,
      crypto,
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_INVALID_INPUT" });
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });

  it("rejects a non-enumerable key", async () => {
    const candidate = { scene: sceneSource() };
    Object.defineProperty(candidate, "password", { value: PASSWORD, enumerable: false });

    const result = await createSpaceV2DocumentEncryptionCandidate(
      candidate as unknown as SpaceV2DocumentEncryptionCandidateInput,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_INVALID_INPUT" });
  });

  it("rejects an extra symbol key", async () => {
    const candidate = { scene: sceneSource(), password: PASSWORD, [Symbol("token")]: "t" };

    const result = await createSpaceV2DocumentEncryptionCandidate(
      candidate as unknown as SpaceV2DocumentEncryptionCandidateInput,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_INVALID_INPUT" });
  });

  it("fails closed on a throwing getter instead of throwing", async () => {
    const candidate = {
      scene: sceneSource(),
      get password(): string {
        throw new Error("revoked");
      },
    };

    const result = await createSpaceV2DocumentEncryptionCandidate(
      candidate as unknown as SpaceV2DocumentEncryptionCandidateInput,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_INVALID_INPUT" });
  });

  it("fails closed on a revoked Proxy input", async () => {
    const revocable = Proxy.revocable(input(), {});
    revocable.revoke();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      revocable.proxy,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_INVALID_INPUT" });
  });
});

// --- required injection ------------------------------------------------------
//
// `verifyFrameReplayEvidenceDigestV1` defaults to a global Web Crypto port, so a missing or
// malformed SHA port must fail here rather than quietly reaching `globalThis.crypto.subtle`.

describe("createSpaceV2DocumentEncryptionCandidate — required injection", () => {
  const malformedPorts = (): [string, unknown][] => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    return [
      ["undefined", undefined],
      ["null", null],
      ["a primitive", "port"],
      ["an object without the method", {}],
      ["a non-function method", { digest: 42, encryptJson: 42 }],
      [
        "a throwing method getter",
        {
          get digest(): unknown {
            throw new Error("revoked");
          },
          get encryptJson(): unknown {
            throw new Error("revoked");
          },
        },
      ],
      ["a revoked proxy", revocable.proxy],
    ];
  };

  it.each(malformedPorts())(
    "refuses %s as the SHA port, with no global digest and no encryption",
    async (_label, sha256) => {
      const crypto = recordingCrypto();
      const subtleSpy = vi.spyOn(globalThis.crypto.subtle, "digest");

      try {
        const result = await createSpaceV2DocumentEncryptionCandidate(
          input(),
          crypto,
          sha256 as unknown as SpaceSha256Port,
        );
        expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED" });
      } finally {
        subtleSpy.mockRestore();
      }

      expect(subtleSpy).not.toHaveBeenCalled();
      expect(crypto.encryptJson).not.toHaveBeenCalled();
    },
  );

  it.each(malformedPorts())("refuses %s as the crypto port", async (_label, crypto) => {
    const sha256 = recordingSha256();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      input(),
      crypto as unknown as SpaceCryptoPort,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_ENCRYPT_FAILED" });
  });

  it("reads the SHA method once, so a drifting getter cannot swap it", async () => {
    let reads = 0;
    const sha256 = {
      get digest() {
        reads += 1;
        return reads === 1
          ? webCryptoPort.digest
          : () => {
              throw new Error("swapped");
            };
      },
    };
    const crypto = recordingCrypto();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      input(),
      crypto,
      sha256 as unknown as SpaceSha256Port,
    );

    expect(result.ok).toBe(true);
    expect(reads).toBe(1);
    expect(crypto.encryptJson).toHaveBeenCalledTimes(1);
  });

  it("reads the crypto method once, so a drifting getter cannot swap it", async () => {
    let reads = 0;
    const encryptJson = vi.fn(async () => ({ ok: true as const, value: ENVELOPE }));
    const crypto = {
      get encryptJson() {
        reads += 1;
        return reads === 1
          ? encryptJson
          : () => {
              throw new Error("swapped");
            };
      },
      decryptJson: vi.fn(),
    };

    const result = await createSpaceV2DocumentEncryptionCandidate(
      input(),
      crypto as unknown as SpaceCryptoPort,
      recordingSha256(),
    );

    expect(result.ok).toBe(true);
    expect(reads).toBe(1);
    expect(encryptJson).toHaveBeenCalledTimes(1);
  });

  it("keeps a method-style port working by preserving its receiver", async () => {
    class MethodStylePort {
      readonly seen: unknown[] = [];
      async encryptJson(value: unknown, password: string) {
        this.seen.push({ value, password });
        return { ok: true as const, value: ENVELOPE };
      }
      async decryptJson() {
        return { ok: false as const, code: "SPACE_DECRYPT_FAILED" as const };
      }
    }
    const crypto = new MethodStylePort();

    const result = await createSpaceV2DocumentEncryptionCandidate(
      input(),
      crypto,
      recordingSha256(),
    );

    expect(result.ok).toBe(true);
    expect(crypto.seen).toEqual([{ value: CANONICAL_SCENE, password: PASSWORD }]);
  });
});

// --- crypto failures ---------------------------------------------------------

describe("createSpaceV2DocumentEncryptionCandidate — crypto failures", () => {
  const failingCrypto = (encryptJson: unknown): SpaceCryptoPort =>
    ({ encryptJson, decryptJson: vi.fn() }) as unknown as SpaceCryptoPort;

  it.each([
    ["a reported failure", async () => ({ ok: false, code: "SPACE_ENCRYPT_FAILED" })],
    [
      "a thrown error",
      () => {
        throw new Error("password=hunter2 token=abc123");
      },
    ],
    ["a rejection", async () => Promise.reject(new Error("uid=operator-1"))],
    ["a non-object result", async () => "envelope"],
    ["a null result", async () => null],
    ["a result without ok", async () => ({ value: ENVELOPE })],
  ])("maps %s to a safe encrypt failure", async (_label, encryptJson) => {
    const result = await createSpaceV2DocumentEncryptionCandidate(
      input(),
      failingCrypto(encryptJson),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_ENCRYPT_FAILED" });
  });

  it("never asks the port to decrypt or retry", async () => {
    const crypto = recordingCrypto();
    crypto.encryptJson.mockImplementationOnce(async () => ({
      ok: false as unknown as true,
      value: ENVELOPE,
    }));

    const result = await createSpaceV2DocumentEncryptionCandidate(
      input(),
      crypto,
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_ENCRYPT_FAILED" });
    expect(crypto.encryptJson).toHaveBeenCalledTimes(1);
    expect(crypto.decryptJson).not.toHaveBeenCalled();
  });
});

// --- rejected output ---------------------------------------------------------

describe("createSpaceV2DocumentEncryptionCandidate — rejected output", () => {
  const succeedingCrypto = (value: unknown): SpaceCryptoPort =>
    ({
      encryptJson: async () => ({ ok: true, value }),
      decryptJson: vi.fn(),
    }) as unknown as SpaceCryptoPort;

  it.each([
    ["a missing envelope", undefined],
    ["a null envelope", null],
    ["a primitive envelope", "enc"],
    ["an envelope with an extra key", { ...ENVELOPE, tag: "x" }],
    ["an envelope with a missing key", { salt: ENVELOPE.salt, iv: ENVELOPE.iv }],
    ["a salt of the wrong length", { ...ENVELOPE, salt: b64(new Array(15).fill(0x11)) }],
    ["an iv of the wrong length", { ...ENVELOPE, iv: b64(new Array(11).fill(0x22)) }],
    ["a ciphertext that is too short", { ...ENVELOPE, ct: b64(new Array(8).fill(0x33)) }],
    ["a salt that is not base64", { ...ENVELOPE, salt: "not base64!" }],
    ["a non-string ct", { ...ENVELOPE, ct: 42 }],
  ])("maps %s to a safe output failure", async (_label, value) => {
    const result = await createSpaceV2DocumentEncryptionCandidate(
      input(),
      succeedingCrypto(value),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_DOCUMENT_INVALID_OUTPUT" });
  });
});

// --- secret boundary ---------------------------------------------------------

describe("createSpaceV2DocumentEncryptionCandidate — secret boundary", () => {
  it("never leaks anything but a code on failure", async () => {
    const scene = sceneSource();
    scene.frameEvidenceDigest = { ...scene.frameEvidenceDigest, value: `${"C".repeat(43)}=` };

    const failures = [
      await createSpaceV2DocumentEncryptionCandidate(
        input({ password: "" }),
        recordingCrypto(),
        recordingSha256(),
      ),
      await createSpaceV2DocumentEncryptionCandidate(
        input({ scene: scene as unknown as SpaceSceneV2 }),
        recordingCrypto(),
        recordingSha256(),
      ),
      await createSpaceV2DocumentEncryptionCandidate(
        input(),
        {
          encryptJson: async () => {
            throw new Error(`password=${PASSWORD} token=abc123`);
          },
          decryptJson: vi.fn(),
        } as unknown as SpaceCryptoPort,
        recordingSha256(),
      ),
    ];

    for (const result of failures) {
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(Object.keys(result).sort()).toEqual(["code", "ok"]);
      expect(result.code).toMatch(/^SPACE_V2_DOCUMENT_[A-Z_]+$/);
      expect(JSON.stringify(result)).not.toMatch(
        new RegExp(
          `${PASSWORD}|rebuild-space-assets|token|uid|@|Error|${ENVELOPE.ct.slice(0, 8)}|retry`,
          "i",
        ),
      );
    }
  });
});

// --- local roundtrip ---------------------------------------------------------

describe("createSpaceV2DocumentEncryptionCandidate — local roundtrip", () => {
  it("produces a document the existing crypto can decrypt back to the same scene", async () => {
    const crypto = createSpaceCrypto();

    const result = await createSpaceV2DocumentEncryptionCandidate(input(), crypto, webCryptoPort);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const decrypted = await crypto.decryptJson(result.value.enc, PASSWORD);
    expect(decrypted.ok).toBe(true);
    if (!decrypted.ok) return;

    const reread = readSpaceSceneV2(decrypted.value);
    expect(reread).toEqual({ ok: true, value: CANONICAL_SCENE });
  });

  it("cannot be decrypted with the wrong password", async () => {
    const crypto = createSpaceCrypto();

    const result = await createSpaceV2DocumentEncryptionCandidate(input(), crypto, webCryptoPort);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const decrypted = await crypto.decryptJson(result.value.enc, `${PASSWORD}!`);
    expect(decrypted).toEqual({ ok: false, code: "SPACE_DECRYPT_FAILED" });
  });
});

// --- boundary ----------------------------------------------------------------

describe("createSpaceV2DocumentEncryptionCandidate — boundary", () => {
  it("touches no network, global crypto, DOM, Canvas, random or clock of its own", async () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const subtleSpy = vi.spyOn(globalThis.crypto.subtle, "digest");
    const randomValuesSpy = vi.spyOn(globalThis.crypto, "getRandomValues");
    const randomSpy = vi.spyOn(Math, "random");
    const nowSpy = vi.spyOn(Date, "now");
    const logSpy = vi.spyOn(console, "log");

    try {
      const result = await createSpaceV2DocumentEncryptionCandidate(
        input(),
        recordingCrypto(),
        // A fake port so the module's own behaviour is what the spies observe.
        { digest: async () => new Uint8Array(32) } as unknown as SpaceSha256Port,
      );
      // The stub digest does not match the fixture evidence, which is the point: even then the
      // module reaches no global of its own.
      expect(result.ok).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
      subtleSpy.mockRestore();
      randomValuesSpy.mockRestore();
      randomSpy.mockRestore();
      nowSpy.mockRestore();
      logSpy.mockRestore();
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(subtleSpy).not.toHaveBeenCalled();
    expect(randomValuesSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
    expect(nowSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect("document" in globalThis).toBe(false);
    expect("HTMLCanvasElement" in globalThis).toBe(false);
  });

  it("stays out of the admin UI: App.tsx never imports or calls it", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

    expect(app).not.toContain("document-encryption-candidate");
    expect(app).not.toContain("createSpaceV2DocumentEncryptionCandidate");
  });
});
