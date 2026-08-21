// Unit contract for the local space V2 issue preparation orchestrator (spec 068 §5). Synthetic
// catalog, synthetic PNG header bytes and a synthetic password only — no real product data, no
// token, no network, no Firebase, no UI. Both ports are always injected; one test uses the real
// `createSpaceCrypto` over local Web Crypto to prove the decrypt roundtrip.

import { readFileSync } from "node:fs";
import type { CatalogDocumentV1 } from "@denn/shared";
import {
  createSpaceCrypto,
  readSpaceDocumentV2,
  readSpaceSceneV2,
  type SpaceCryptoPort,
  type SpaceSha256Port,
} from "@denn/spaces";
import { describe, expect, it, vi } from "vitest";
import {
  prepareSpaceV2LocalIssueCandidate,
  type SpaceV2LocalIssuePreparationInput,
} from "./issue-preparation";

// --- fixtures ----------------------------------------------------------------

const ASSET_ID = "0f9c1b2a-4d3e-4f5a-9b6c-7d8e9f0a1b2c";
const OBJECT_PATH = `rebuild-space-assets/objects/${ASSET_ID}.png`;
const PASSWORD = "구운몽-2026";

const be32 = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

/** 33-byte PNG header candidate: signature + IHDR(13) + placeholder CRC. */
const pngHeader = (width = 1200, height = 1680): Uint8Array =>
  Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...be32(13),
    0x49,
    0x48,
    0x44,
    0x52,
    ...be32(width),
    ...be32(height),
    8,
    6,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);

const doc = (data: Record<string, unknown>): CatalogDocumentV1 =>
  ({ schemaVersion: 1, migratedFrom: "legacy-v0", data }) as unknown as CatalogDocumentV1;

const SIZE = { id: "s1", name: "사이즈", aspect: 1.4, frameThickness: 4 };
/** Image-only: uploaded, no design source, explicit clock opt-out. */
const TEMPLATE = { id: "ft1", name: "템플릿", type: "uploaded", clockEnabled: false };

const catalogSource = () => doc({ frameSizes: [SIZE], frameTemplates: [TEMPLATE] });

const webCryptoSha256: SpaceSha256Port = {
  async digest(bytes) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
    return new Uint8Array(digest);
  },
};

/** Records every call and delegates to real SHA-256, so counts and bytes stay assertable. */
const recordingSha256 = () => {
  const calls: Uint8Array[] = [];
  return {
    calls,
    digest: vi.fn(async (bytes: Uint8Array) => {
      calls.push(Uint8Array.from(bytes));
      return webCryptoSha256.digest(bytes);
    }),
  };
};

const b64 = (bytes: number[]): string => btoa(String.fromCharCode(...bytes));

const ENVELOPE = {
  salt: b64(new Array(16).fill(0x11)),
  iv: b64(new Array(12).fill(0x22)),
  ct: b64(new Array(48).fill(0x33)),
};

const recordingCrypto = () => {
  const calls: { value: unknown; password: string }[] = [];
  return {
    calls,
    encryptJson: vi.fn(async (value: unknown, password: string) => {
      calls.push({ value, password });
      return { ok: true as const, value: { ...ENVELOPE } };
    }),
    decryptJson: vi.fn(async () => ({ ok: false as const, code: "SPACE_DECRYPT_FAILED" as const })),
  };
};

const input = (
  over: Partial<SpaceV2LocalIssuePreparationInput> = {},
): SpaceV2LocalIssuePreparationInput => ({
  catalog: catalogSource(),
  selection: { frameSizeId: "s1", templateId: "ft1" },
  frameOrientation: "portrait",
  logicalWidth: 1000,
  frameColor: "#191A1D",
  transform: { scale: 1.25, x: 0.5, y: -0.25, rotationQuarterTurns: 0 },
  assetId: ASSET_ID,
  pngBytes: pngHeader(),
  password: PASSWORD,
  ...over,
});

// --- success -----------------------------------------------------------------

describe("prepareSpaceV2LocalIssueCandidate — success", () => {
  it("runs proof, scene and document in order: SHA three times, encrypt once", async () => {
    const sha256 = recordingSha256();
    const crypto = recordingCrypto();

    const result = await prepareSpaceV2LocalIssueCandidate(input(), crypto, sha256);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sha256.digest).toHaveBeenCalledTimes(3);
    expect(crypto.encryptJson).toHaveBeenCalledTimes(1);
    expect(crypto.decryptJson).not.toHaveBeenCalled();
  });

  it("hashes the exact PNG snapshot first, then the same evidence bytes twice", async () => {
    const sha256 = recordingSha256();
    const pngBytes = pngHeader();

    const result = await prepareSpaceV2LocalIssueCandidate(
      input({ pngBytes }),
      recordingCrypto(),
      sha256,
    );

    expect(result.ok).toBe(true);
    expect(sha256.calls[0]).toEqual(pngBytes);
    expect(sha256.calls[1]).toEqual(sha256.calls[2]);
    // The evidence encoding is not the PNG, so stage 1 and stages 2/3 must differ.
    expect(sha256.calls[1]).not.toEqual(sha256.calls[0]);
  });

  it("describes the proof bytes it hands out", async () => {
    const result = await prepareSpaceV2LocalIssueCandidate(
      input(),
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const descriptor = result.value.copyProofDescriptor();
    expect(descriptor).toEqual({
      objectPath: OBJECT_PATH,
      sha256: expect.stringMatching(/^[A-Za-z0-9+/]{43}=$/),
      byteLength: 33,
      contentType: "image/png",
      intrinsicWidth: 1200,
      intrinsicHeight: 1680,
    });
    expect(result.value.copyUploadBytes()).toEqual(pngHeader());
    expect(readSpaceDocumentV2(result.value.copyDocument()).ok).toBe(true);
  });

  it("encrypts a scene whose proof descriptor is the one the handle reports", async () => {
    const crypto = createSpaceCrypto();

    const result = await prepareSpaceV2LocalIssueCandidate(input(), crypto, webCryptoSha256);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const decrypted = await crypto.decryptJson(result.value.copyDocument().enc, PASSWORD);
    expect(decrypted.ok).toBe(true);
    if (!decrypted.ok) return;
    const scene = readSpaceSceneV2(decrypted.value);
    expect(scene.ok).toBe(true);
    if (!scene.ok) return;
    expect(scene.value.frameEvidence.proofAsset).toEqual(result.value.copyProofDescriptor());
  });

  it("hands the handle nothing but the three copies", async () => {
    const result = await prepareSpaceV2LocalIssueCandidate(
      input(),
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.value).sort()).toEqual([
      "copyDocument",
      "copyProofDescriptor",
      "copyUploadBytes",
    ]);
    const serialized = JSON.stringify({
      descriptor: result.value.copyProofDescriptor(),
      document: result.value.copyDocument(),
    });
    for (const forbidden of ["token", "owner", "uid", "createdAt", PASSWORD, "frameEvidence"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

// --- immutable copies --------------------------------------------------------

describe("prepareSpaceV2LocalIssueCandidate — immutable copies", () => {
  const prepared = async () => {
    const result = await prepareSpaceV2LocalIssueCandidate(
      input(),
      recordingCrypto(),
      recordingSha256(),
    );
    if (!result.ok) throw new Error("fixture preparation failed");
    return result.value;
  };

  it("returns a fresh descriptor each call", async () => {
    const handle = await prepared();
    const first = handle.copyProofDescriptor();
    const second = handle.copyProofDescriptor();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    (first as { objectPath: string }).objectPath = "tampered";
    expect(handle.copyProofDescriptor().objectPath).toBe(OBJECT_PATH);
  });

  it("returns fresh upload bytes each call", async () => {
    const handle = await prepared();
    const first = handle.copyUploadBytes();
    const second = handle.copyUploadBytes();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    first.fill(0);
    expect(handle.copyUploadBytes()).toEqual(pngHeader());
  });

  it("returns a fresh document, nested envelope included", async () => {
    const handle = await prepared();
    const first = handle.copyDocument();
    const second = handle.copyDocument();

    expect(first).not.toBe(second);
    expect(first.enc).not.toBe(second.enc);
    expect(first).toEqual(second);
    (first.enc as { salt: string }).salt = "tampered";
    expect(handle.copyDocument().enc.salt).toBe(ENVELOPE.salt);
  });
});

// --- first-await snapshot ----------------------------------------------------

describe("prepareSpaceV2LocalIssueCandidate — first-await snapshot", () => {
  it("uses only the first snapshot when the caller mutates everything mid-flight", async () => {
    // A port that suspends on the first call, so the caller can mutate while the flow is awaiting.
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let first = true;
    const sha256: SpaceSha256Port = {
      async digest(bytes) {
        if (first) {
          first = false;
          await gate;
        }
        return webCryptoSha256.digest(bytes);
      },
    };

    const catalog = catalogSource();
    const selection = { frameSizeId: "s1", templateId: "ft1" };
    const transform = { scale: 1.25, x: 0.5, y: -0.25, rotationQuarterTurns: 0 as const };
    const pngBytes = pngHeader();
    const candidate = { ...input(), catalog, selection, transform, pngBytes };

    const pending = prepareSpaceV2LocalIssueCandidate(candidate, recordingCrypto(), sha256);

    // Everything the caller still owns is rewritten before the flow resumes.
    pngBytes.fill(0xff);
    (catalog.data as { frameSizes?: unknown }).frameSizes = [];
    selection.templateId = "other";
    (transform as { scale: number }).scale = 5;
    (candidate as { password: string }).password = "";
    (candidate as { assetId: string }).assetId = "nope";
    release?.();

    const result = await pending;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.copyUploadBytes()).toEqual(pngHeader());
    expect(result.value.copyProofDescriptor().objectPath).toBe(OBJECT_PATH);
  });
});

// --- rejected input ----------------------------------------------------------

describe("prepareSpaceV2LocalIssueCandidate — rejected input", () => {
  it.each([
    ["an extra key", { ...input(), token: "t" }],
    [
      "a missing key",
      (() => {
        const { password: _password, ...rest } = input();
        return rest;
      })(),
    ],
    ["null", null],
    ["a primitive", "issue"],
    ["an array", [input()]],
  ])("rejects %s as the whole input", async (_label, candidate) => {
    const sha256 = recordingSha256();
    const crypto = recordingCrypto();

    const result = await prepareSpaceV2LocalIssueCandidate(
      candidate as unknown as SpaceV2LocalIssuePreparationInput,
      crypto,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_INVALID_INPUT" });
    expect(sha256.digest).not.toHaveBeenCalled();
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a selection with an extra key",
      { selection: { frameSizeId: "s1", templateId: "ft1", x: 1 } },
    ],
    ["a transform with a missing key", { transform: { scale: 1, x: 0, y: 0 } }],
    ["an empty password", { password: "" }],
    ["a non-string password", { password: 7 }],
    ["a malformed catalog", { catalog: { schemaVersion: 1 } }],
    ["a null catalog", { catalog: null }],
  ])("rejects %s before any hashing", async (_label, over) => {
    const sha256 = recordingSha256();
    const crypto = recordingCrypto();

    const result = await prepareSpaceV2LocalIssueCandidate(
      input(over as Partial<SpaceV2LocalIssuePreparationInput>),
      crypto,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_INVALID_INPUT" });
    expect(sha256.digest).not.toHaveBeenCalled();
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });

  it("rejects a non-enumerable key", async () => {
    const { password: _password, ...rest } = input();
    Object.defineProperty(rest, "password", { value: PASSWORD, enumerable: false });

    const result = await prepareSpaceV2LocalIssueCandidate(
      rest as unknown as SpaceV2LocalIssuePreparationInput,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_INVALID_INPUT" });
  });

  it("rejects an extra symbol key", async () => {
    const candidate = { ...input(), [Symbol("token")]: "t" };

    const result = await prepareSpaceV2LocalIssueCandidate(
      candidate as unknown as SpaceV2LocalIssuePreparationInput,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_INVALID_INPUT" });
  });

  it("fails closed on a throwing getter", async () => {
    const { password: _password, ...rest } = input();
    const candidate = {
      ...rest,
      get password(): string {
        throw new Error("revoked");
      },
    };

    const result = await prepareSpaceV2LocalIssueCandidate(
      candidate as unknown as SpaceV2LocalIssuePreparationInput,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_INVALID_INPUT" });
  });

  it("fails closed on a revoked Proxy input", async () => {
    const revocable = Proxy.revocable(input(), {});
    revocable.revoke();

    const result = await prepareSpaceV2LocalIssueCandidate(
      revocable.proxy,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_INVALID_INPUT" });
  });
});

// --- ports -------------------------------------------------------------------

describe("prepareSpaceV2LocalIssueCandidate — ports", () => {
  const malformed = (): [string, unknown][] => {
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

  it.each(malformed())(
    "refuses %s as the SHA port, with no global digest",
    async (_label, sha256) => {
      const crypto = recordingCrypto();
      const subtleSpy = vi.spyOn(globalThis.crypto.subtle, "digest");

      try {
        const result = await prepareSpaceV2LocalIssueCandidate(
          input(),
          crypto,
          sha256 as unknown as SpaceSha256Port,
        );
        expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_INVALID_PORT" });
      } finally {
        subtleSpy.mockRestore();
      }

      expect(subtleSpy).not.toHaveBeenCalled();
      expect(crypto.encryptJson).not.toHaveBeenCalled();
    },
  );

  it.each(malformed())("refuses %s as the crypto port before hashing", async (_label, crypto) => {
    const sha256 = recordingSha256();

    const result = await prepareSpaceV2LocalIssueCandidate(
      input(),
      crypto as unknown as SpaceCryptoPort,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_INVALID_PORT" });
    expect(sha256.digest).not.toHaveBeenCalled();
  });

  it("reads each port method once, so a drifting getter cannot swap it", async () => {
    let digestReads = 0;
    let encryptReads = 0;
    const sha256 = {
      get digest() {
        digestReads += 1;
        return digestReads === 1
          ? webCryptoSha256.digest
          : () => {
              throw new Error("swapped");
            };
      },
    };
    const encryptJson = vi.fn(async () => ({ ok: true as const, value: { ...ENVELOPE } }));
    const crypto = {
      get encryptJson() {
        encryptReads += 1;
        return encryptReads === 1
          ? encryptJson
          : () => {
              throw new Error("swapped");
            };
      },
    };

    const result = await prepareSpaceV2LocalIssueCandidate(
      input(),
      crypto as unknown as SpaceCryptoPort,
      sha256 as unknown as SpaceSha256Port,
    );

    expect(result.ok).toBe(true);
    expect(digestReads).toBe(1);
    expect(encryptReads).toBe(1);
    expect(encryptJson).toHaveBeenCalledTimes(1);
  });

  it("keeps a method-style port working by preserving its receiver", async () => {
    class MethodStyleCrypto {
      readonly seen: string[] = [];
      async encryptJson(_value: unknown, password: string) {
        this.seen.push(password);
        return { ok: true as const, value: { ...ENVELOPE } };
      }
      async decryptJson() {
        return { ok: false as const, code: "SPACE_DECRYPT_FAILED" as const };
      }
    }
    const crypto = new MethodStyleCrypto();

    const result = await prepareSpaceV2LocalIssueCandidate(input(), crypto, recordingSha256());

    expect(result.ok).toBe(true);
    expect(crypto.seen).toEqual([PASSWORD]);
  });
});

// --- stage failures ----------------------------------------------------------

describe("prepareSpaceV2LocalIssueCandidate — stage failures", () => {
  it.each([
    ["an upper-case asset id", { assetId: ASSET_ID.toUpperCase() }],
    ["a whole object path as the asset id", { assetId: OBJECT_PATH }],
    ["bytes that are not a PNG header", { pngBytes: new Uint8Array(33) }],
    ["a truncated header", { pngBytes: pngHeader().slice(0, 32) }],
    ["a non-Uint8Array", { pngBytes: [...pngHeader()] }],
  ])("stops at the proof stage for %s", async (_label, over) => {
    const sha256 = recordingSha256();
    const crypto = recordingCrypto();

    const result = await prepareSpaceV2LocalIssueCandidate(
      input(over as Partial<SpaceV2LocalIssuePreparationInput>),
      crypto,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_PROOF_FAILED" });
    expect(sha256.digest).not.toHaveBeenCalled();
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });

  it("stops at the proof stage when the SHA port fails on the proof bytes", async () => {
    const crypto = recordingCrypto();
    const sha256 = { digest: vi.fn(async () => new Uint8Array(16)) };

    const result = await prepareSpaceV2LocalIssueCandidate(input(), crypto, sha256);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_PROOF_FAILED" });
    expect(sha256.digest).toHaveBeenCalledTimes(1);
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown template", { selection: { frameSizeId: "s1", templateId: "nope" } }],
    ["an orientation that contradicts the aspect", { frameOrientation: "landscape" as const }],
    ["a lower-case frame colour", { frameColor: "#191a1d" }],
    [
      "a transform outside the contract range",
      { transform: { scale: 9, x: 0, y: 0, rotationQuarterTurns: 0 as const } },
    ],
    [
      "a template with real art",
      {
        catalog: doc({
          frameSizes: [SIZE],
          frameTemplates: [{ ...TEMPLATE, dataUrl: "https://example.invalid/a.png" }],
        }),
      },
    ],
    [
      "a template with a clock",
      {
        catalog: doc({
          frameSizes: [SIZE],
          frameTemplates: [{ id: "ft1", name: "템플릿", type: "uploaded" }],
        }),
      },
    ],
  ])("stops at the scene stage for %s, after only the proof hash", async (_label, over) => {
    const sha256 = recordingSha256();
    const crypto = recordingCrypto();

    const result = await prepareSpaceV2LocalIssueCandidate(
      input(over as Partial<SpaceV2LocalIssuePreparationInput>),
      crypto,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_SCENE_FAILED" });
    expect(sha256.digest).toHaveBeenCalledTimes(1);
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });

  it.each([
    ["a reported failure", async () => ({ ok: false, code: "SPACE_ENCRYPT_FAILED" })],
    [
      "a thrown error",
      () => {
        throw new Error("password=hunter2 token=abc123");
      },
    ],
    ["a rejection", async () => Promise.reject(new Error("uid=operator-1"))],
    ["a malformed envelope", async () => ({ ok: true, value: { salt: "x", iv: "y", ct: "z" } })],
  ])("stops at the document stage for %s", async (_label, encryptJson) => {
    const sha256 = recordingSha256();

    const result = await prepareSpaceV2LocalIssueCandidate(
      input(),
      { encryptJson, decryptJson: vi.fn() } as unknown as SpaceCryptoPort,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_PREPARATION_DOCUMENT_FAILED" });
    expect(sha256.digest).toHaveBeenCalledTimes(3);
  });

  it("never leaks a child code, a secret or a path on failure", async () => {
    const failures = [
      await prepareSpaceV2LocalIssueCandidate(
        input({ password: "" }),
        recordingCrypto(),
        recordingSha256(),
      ),
      await prepareSpaceV2LocalIssueCandidate(
        input({ assetId: "nope" }),
        recordingCrypto(),
        recordingSha256(),
      ),
      await prepareSpaceV2LocalIssueCandidate(
        input(),
        {
          encryptJson: () => {
            throw new Error(`password=${PASSWORD} path=${OBJECT_PATH}`);
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
      expect(result.code).toMatch(/^SPACE_V2_PREPARATION_[A-Z_]+$/);
      expect(JSON.stringify(result)).not.toMatch(
        new RegExp(
          `${PASSWORD}|rebuild-space-assets|SPACE_V2_PROOF|SPACE_V2_DOCUMENT|token|uid|Error`,
          "i",
        ),
      );
    }
  });
});

// --- boundary ----------------------------------------------------------------

describe("prepareSpaceV2LocalIssueCandidate — boundary", () => {
  it("touches no network, global crypto, DOM, Canvas, random, clock or console", async () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const subtleSpy = vi.spyOn(globalThis.crypto.subtle, "digest");
    const randomValuesSpy = vi.spyOn(globalThis.crypto, "getRandomValues");
    const uuidSpy = vi.spyOn(globalThis.crypto, "randomUUID");
    const randomSpy = vi.spyOn(Math, "random");
    const nowSpy = vi.spyOn(Date, "now");
    const logSpy = vi.spyOn(console, "log");

    try {
      const result = await prepareSpaceV2LocalIssueCandidate(input(), recordingCrypto(), {
        // A stub digest: deterministic, and never the global one.
        digest: async () => new Uint8Array(32).fill(7),
      });
      // The whole flow completes on the stub alone: every stage — including the verification that
      // would otherwise fall back to a default Web Crypto port — used the injected port only.
      expect(result.ok).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      subtleSpy.mockRestore();
      randomValuesSpy.mockRestore();
      uuidSpy.mockRestore();
      randomSpy.mockRestore();
      nowSpy.mockRestore();
      logSpy.mockRestore();
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(subtleSpy).not.toHaveBeenCalled();
    expect(randomValuesSpy).not.toHaveBeenCalled();
    expect(uuidSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
    expect(nowSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect("document" in globalThis).toBe(false);
    expect("HTMLCanvasElement" in globalThis).toBe(false);
  });

  it("stays out of the admin UI: App.tsx never imports or calls it", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

    expect(app).not.toContain("issue-preparation");
    expect(app).not.toContain("prepareSpaceV2LocalIssueCandidate");
  });
});
