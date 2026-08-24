// Unit contract for the local space V2 issue bundle orchestrator (spec 072 §5). Synthetic UUID
// sequences, a synthetic catalog, synthetic PNG header bytes and a synthetic password only — no
// real token, no network, no Firebase, no UI, and no global randomness. All three ports are always
// injected; one test uses the real `createSpaceCrypto` over local Web Crypto to prove that the
// encrypted scene really carries the descriptor the handle reports.
//
// NOT covered here, on purpose: randomness quality and collision freedom (spec 071 scope limit),
// and anything about upload, Firestore create or URL issuance, which do not exist yet.

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
import { prepareSpaceV2LocalIssueBundle, type SpaceV2LocalIssueBundleInput } from "./issue-bundle";
import type { SpaceV2IssueUuidPort } from "./issue-token-candidate";

// --- fixtures ----------------------------------------------------------------

const ASSET_ID = "0f9c1b2a-4d3e-4f5a-9b6c-7d8e9f0a1b2c";
const TOKEN = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const OBJECT_PATH = `rebuild-space-assets/objects/${ASSET_ID}.png`;
const PASSWORD = "구운몽-2026";

/** Hands out the given values in order; running past the end is an explicit test failure. */
const sequenceSource = (...values: unknown[]) => {
  const randomUUID = vi.fn(() => {
    if (randomUUID.mock.calls.length > values.length) {
      throw new Error("source called more times than the test allows");
    }
    return values[randomUUID.mock.calls.length - 1];
  });
  return { randomUUID } as unknown as SpaceV2IssueUuidPort & { randomUUID: typeof randomUUID };
};

const pair = () => sequenceSource(ASSET_ID, TOKEN);

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

const input = (over: Partial<SpaceV2LocalIssueBundleInput> = {}): SpaceV2LocalIssueBundleInput => ({
  catalog: catalogSource(),
  selection: { frameSizeId: "s1", templateId: "ft1" },
  frameOrientation: "portrait",
  logicalWidth: 1000,
  frameColor: "#191A1D",
  transform: { scale: 1.25, x: 0.5, y: -0.25, rotationQuarterTurns: 0 },
  pngBytes: pngHeader(),
  password: PASSWORD,
  ...over,
});

// --- success -----------------------------------------------------------------

describe("prepareSpaceV2LocalIssueBundle — success", () => {
  it("runs identity then preparation: UUID twice, SHA three times, encrypt once", async () => {
    const uuid = pair();
    const sha256 = recordingSha256();
    const crypto = recordingCrypto();

    const result = await prepareSpaceV2LocalIssueBundle(input(), uuid, crypto, sha256);

    expect(result.ok).toBe(true);
    expect(uuid.randomUUID).toHaveBeenCalledTimes(2);
    expect(sha256.digest).toHaveBeenCalledTimes(3);
    expect(crypto.encryptJson).toHaveBeenCalledTimes(1);
    expect(crypto.decryptJson).not.toHaveBeenCalled();
  });

  it("spends both UUIDs before the first hash, in that exact order", async () => {
    const order: string[] = [];
    const values = [ASSET_ID, TOKEN];
    let index = 0;
    const uuid: SpaceV2IssueUuidPort = {
      randomUUID: () => {
        order.push(`uuid#${index + 1}`);
        return values[index++] as string;
      },
    };
    const sha256: SpaceSha256Port = {
      digest: async (bytes) => {
        order.push("sha");
        return webCryptoSha256.digest(bytes);
      },
    };
    const crypto = {
      encryptJson: async () => {
        order.push("encrypt");
        return { ok: true as const, value: { ...ENVELOPE } };
      },
      decryptJson: vi.fn(),
    } as unknown as SpaceCryptoPort;

    const result = await prepareSpaceV2LocalIssueBundle(input(), uuid, crypto, sha256);

    expect(result.ok).toBe(true);
    expect(order).toEqual(["uuid#1", "uuid#2", "sha", "sha", "sha", "encrypt"]);
  });

  it("hands out the token and the three copies, and nothing else", async () => {
    const result = await prepareSpaceV2LocalIssueBundle(
      input(),
      pair(),
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.value).sort()).toEqual([
      "copyDocument",
      "copyProofDescriptor",
      "copyUploadBytes",
      "token",
    ]);
    expect(result.value.token).toBe(TOKEN);
    expect(result.value.copyProofDescriptor()).toEqual({
      objectPath: OBJECT_PATH,
      sha256: expect.stringMatching(/^[A-Za-z0-9+/]{43}=$/),
      byteLength: 33,
      contentType: "image/png",
      intrinsicWidth: 1200,
      intrinsicHeight: 1680,
    });
    expect(result.value.copyUploadBytes()).toEqual(pngHeader());
    expect(readSpaceDocumentV2(result.value.copyDocument()).ok).toBe(true);

    const serialized = JSON.stringify({
      descriptor: result.value.copyProofDescriptor(),
      document: result.value.copyDocument(),
    });
    for (const forbidden of ["owner", "uid", "createdAt", "assetId", PASSWORD, TOKEN]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("reads the UUID method once for both calls and preserves the receiver", async () => {
    let reads = 0;
    const values = [ASSET_ID, TOKEN];
    let index = 0;
    const drifting = {
      get randomUUID() {
        reads += 1;
        return reads === 1
          ? () => values[index++] as string
          : () => {
              throw new Error("swapped");
            };
      },
    };

    const drifted = await prepareSpaceV2LocalIssueBundle(
      input(),
      drifting as unknown as SpaceV2IssueUuidPort,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(drifted.ok).toBe(true);
    expect(reads).toBe(1);
    expect(index).toBe(2);

    class MethodStyleSource {
      calls = 0;
      readonly values = [ASSET_ID, TOKEN];
      randomUUID(): string {
        this.calls += 1;
        return this.values[this.calls - 1] as string;
      }
    }
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
    const source = new MethodStyleSource();
    const crypto = new MethodStyleCrypto();

    const methodStyle = await prepareSpaceV2LocalIssueBundle(
      input(),
      source,
      crypto,
      recordingSha256(),
    );

    expect(methodStyle.ok).toBe(true);
    if (!methodStyle.ok) return;
    expect(source.calls).toBe(2);
    expect(crypto.seen).toEqual([PASSWORD]);
    expect(methodStyle.value.token).toBe(TOKEN);
  });
});

// --- identity and proof agreement --------------------------------------------

describe("prepareSpaceV2LocalIssueBundle — identity and proof agreement", () => {
  it("keeps the token different from the asset id inside the object path", async () => {
    const result = await prepareSpaceV2LocalIssueBundle(
      input(),
      pair(),
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { objectPath } = result.value.copyProofDescriptor();
    expect(objectPath).toBe(OBJECT_PATH);
    expect(objectPath).toContain(ASSET_ID);
    expect(objectPath).not.toContain(result.value.token);
    expect(result.value.token).not.toBe(ASSET_ID);
  });

  it("encrypts a scene whose proof descriptor is the one the handle reports", async () => {
    const crypto = createSpaceCrypto();

    const result = await prepareSpaceV2LocalIssueBundle(input(), pair(), crypto, webCryptoSha256);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const decrypted = await crypto.decryptJson(result.value.copyDocument().enc, PASSWORD);
    expect(decrypted.ok).toBe(true);
    if (!decrypted.ok) return;
    const scene = readSpaceSceneV2(decrypted.value);
    expect(scene.ok).toBe(true);
    if (!scene.ok) return;
    expect(scene.value.frameEvidence.proofAsset).toEqual(result.value.copyProofDescriptor());
    // The public link token is not part of what gets encrypted.
    expect(JSON.stringify(decrypted.value)).not.toContain(TOKEN);
  });
});

// --- immutable copies --------------------------------------------------------

describe("prepareSpaceV2LocalIssueBundle — immutable copies", () => {
  const prepared = async () => {
    const result = await prepareSpaceV2LocalIssueBundle(
      input(),
      pair(),
      recordingCrypto(),
      recordingSha256(),
    );
    if (!result.ok) throw new Error("fixture bundle failed");
    return result.value;
  };

  it("returns a fresh descriptor each call, and the token stays put", async () => {
    const handle = await prepared();
    const first = handle.copyProofDescriptor();
    const second = handle.copyProofDescriptor();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    (first as { objectPath: string }).objectPath = "tampered";
    expect(handle.copyProofDescriptor().objectPath).toBe(OBJECT_PATH);
    expect(handle.token).toBe(TOKEN);
  });

  it("returns fresh upload bytes each call", async () => {
    const handle = await prepared();
    const first = handle.copyUploadBytes();
    const second = handle.copyUploadBytes();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    first.fill(0);
    expect(handle.copyUploadBytes()).toEqual(pngHeader());
    expect(handle.token).toBe(TOKEN);
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
    expect(handle.token).toBe(TOKEN);
  });
});

// --- first-await snapshot ----------------------------------------------------

describe("prepareSpaceV2LocalIssueBundle — first-await snapshot", () => {
  it("uses only the first snapshot when the caller mutates everything mid-flight", async () => {
    // A port that suspends on the first hash, so the caller can mutate while the flow is awaiting.
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

    const pending = prepareSpaceV2LocalIssueBundle(candidate, pair(), recordingCrypto(), sha256);

    // Everything the caller still owns is rewritten before the flow resumes.
    pngBytes.fill(0xff);
    (catalog.data as { frameSizes?: unknown }).frameSizes = [];
    selection.templateId = "other";
    (transform as { scale: number }).scale = 5;
    (candidate as { password: string }).password = "";
    release?.();

    const result = await pending;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.copyUploadBytes()).toEqual(pngHeader());
    expect(result.value.copyProofDescriptor().objectPath).toBe(OBJECT_PATH);
    expect(result.value.token).toBe(TOKEN);
  });
});

// --- rejected top-level input ------------------------------------------------

describe("prepareSpaceV2LocalIssueBundle — rejected top-level input", () => {
  it.each([
    ["an extra key", { ...input(), token: "t" }],
    ["a caller-supplied assetId", { ...input(), assetId: ASSET_ID }],
    [
      "a missing key",
      (() => {
        const { password: _password, ...rest } = input();
        return rest;
      })(),
    ],
    ["null", null],
    ["undefined", undefined],
    ["a primitive", "issue"],
    ["an array", [input()]],
  ])("rejects %s before any UUID, hash or encryption", async (_label, candidate) => {
    const uuid = pair();
    const sha256 = recordingSha256();
    const crypto = recordingCrypto();

    const result = await prepareSpaceV2LocalIssueBundle(
      candidate as unknown as SpaceV2LocalIssueBundleInput,
      uuid,
      crypto,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_INVALID_INPUT" });
    expect(uuid.randomUUID).not.toHaveBeenCalled();
    expect(sha256.digest).not.toHaveBeenCalled();
    expect(crypto.encryptJson).not.toHaveBeenCalled();
  });

  it("rejects a non-enumerable key", async () => {
    const uuid = pair();
    const { password: _password, ...rest } = input();
    Object.defineProperty(rest, "password", { value: PASSWORD, enumerable: false });

    const result = await prepareSpaceV2LocalIssueBundle(
      rest as unknown as SpaceV2LocalIssueBundleInput,
      uuid,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_INVALID_INPUT" });
    expect(uuid.randomUUID).not.toHaveBeenCalled();
  });

  it("rejects an extra symbol key", async () => {
    const uuid = pair();
    const candidate = { ...input(), [Symbol("token")]: "t" };

    const result = await prepareSpaceV2LocalIssueBundle(
      candidate as unknown as SpaceV2LocalIssueBundleInput,
      uuid,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_INVALID_INPUT" });
    expect(uuid.randomUUID).not.toHaveBeenCalled();
  });

  it("fails closed on a throwing getter", async () => {
    const uuid = pair();
    const { password: _password, ...rest } = input();
    const candidate = {
      ...rest,
      get password(): string {
        throw new Error("revoked");
      },
    };

    const result = await prepareSpaceV2LocalIssueBundle(
      candidate as unknown as SpaceV2LocalIssueBundleInput,
      uuid,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_INVALID_INPUT" });
    expect(uuid.randomUUID).not.toHaveBeenCalled();
  });

  it("fails closed on a revoked Proxy input", async () => {
    const uuid = pair();
    const revocable = Proxy.revocable(input(), {});
    revocable.revoke();

    const result = await prepareSpaceV2LocalIssueBundle(
      revocable.proxy,
      uuid,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_INVALID_INPUT" });
    expect(uuid.randomUUID).not.toHaveBeenCalled();
  });

  it("reads each top-level property exactly once", async () => {
    const reads: string[] = [];
    const plain = input();
    const candidate: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(plain)) {
      Object.defineProperty(candidate, key, {
        enumerable: true,
        get() {
          reads.push(key);
          return value;
        },
      });
    }

    const result = await prepareSpaceV2LocalIssueBundle(
      candidate as unknown as SpaceV2LocalIssueBundleInput,
      pair(),
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result.ok).toBe(true);
    expect(reads.length).toBe(8);
    expect(new Set(reads).size).toBe(8);
  });
});

// --- identity failures -------------------------------------------------------

describe("prepareSpaceV2LocalIssueBundle — identity failures", () => {
  const malformedUuidPorts = (): [string, unknown][] => {
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    return [
      ["undefined", undefined],
      ["null", null],
      ["a primitive", "port"],
      ["an object without the method", {}],
      ["a non-function method", { randomUUID: ASSET_ID }],
      [
        "a throwing method getter",
        {
          get randomUUID(): unknown {
            throw new Error("revoked");
          },
        },
      ],
      ["a revoked proxy", revocable.proxy],
    ];
  };

  it.each(malformedUuidPorts())(
    "maps %s as the UUID port to IDENTITY_FAILED, with no hashing",
    async (_label, uuid) => {
      const sha256 = recordingSha256();
      const crypto = recordingCrypto();

      const result = await prepareSpaceV2LocalIssueBundle(
        input(),
        uuid as unknown as SpaceV2IssueUuidPort,
        crypto,
        sha256,
      );

      expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_IDENTITY_FAILED" });
      expect(sha256.digest).not.toHaveBeenCalled();
      expect(crypto.encryptJson).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["an upper-case first value", [ASSET_ID.toUpperCase(), TOKEN], 1],
    ["a non-string first value", [42, TOKEN], 1],
    ["an upper-case second value", [ASSET_ID, TOKEN.toUpperCase()], 2],
    ["a non-UUID second value", [ASSET_ID, "nope"], 2],
    ["a collision", [ASSET_ID, ASSET_ID], 2],
  ])(
    "maps %s to IDENTITY_FAILED after exactly %s call(s), and never a third",
    async (_label, values, expectedCalls) => {
      const uuid = sequenceSource(...(values as unknown[]));
      const sha256 = recordingSha256();
      const crypto = recordingCrypto();

      const result = await prepareSpaceV2LocalIssueBundle(input(), uuid, crypto, sha256);

      expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_IDENTITY_FAILED" });
      expect(uuid.randomUUID).toHaveBeenCalledTimes(expectedCalls as number);
      expect(sha256.digest).not.toHaveBeenCalled();
      expect(crypto.encryptJson).not.toHaveBeenCalled();
    },
  );

  it("maps a throwing source to IDENTITY_FAILED without a retry", async () => {
    const randomUUID = vi.fn(() => {
      throw new Error(`token=${TOKEN} uid=operator-1@example.invalid`);
    });
    const sha256 = recordingSha256();

    const result = await prepareSpaceV2LocalIssueBundle(
      input(),
      { randomUUID } as unknown as SpaceV2IssueUuidPort,
      recordingCrypto(),
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_IDENTITY_FAILED" });
    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(sha256.digest).not.toHaveBeenCalled();
  });
});

// --- preparation failures ----------------------------------------------------

describe("prepareSpaceV2LocalIssueBundle — preparation failures", () => {
  it.each([
    [
      "a nested selection with an extra key",
      { selection: { frameSizeId: "s1", templateId: "x", y: 1 } },
    ],
    ["a transform with a missing key", { transform: { scale: 1, x: 0, y: 0 } }],
    ["an empty password", { password: "" }],
    ["a malformed catalog", { catalog: { schemaVersion: 1 } }],
    ["bytes that are not a PNG header", { pngBytes: new Uint8Array(33) }],
    ["a non-Uint8Array", { pngBytes: [...pngHeader()] }],
    ["an unknown template", { selection: { frameSizeId: "s1", templateId: "nope" } }],
    ["an orientation that contradicts the aspect", { frameOrientation: "landscape" as const }],
    ["a lower-case frame colour", { frameColor: "#191a1d" }],
  ])("maps %s to PREPARATION_FAILED with no second identity", async (_label, over) => {
    const uuid = pair();

    const result = await prepareSpaceV2LocalIssueBundle(
      input(over as Partial<SpaceV2LocalIssueBundleInput>),
      uuid,
      recordingCrypto(),
      recordingSha256(),
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_PREPARATION_FAILED" });
    // Exactly the one pair: no regeneration, no retry after the refusal.
    expect(uuid.randomUUID).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["an undefined SHA port", undefined],
    ["a SHA port without the method", {}],
    ["a non-function digest", { digest: 42 }],
  ])("maps %s to PREPARATION_FAILED", async (_label, sha256) => {
    const uuid = pair();

    const result = await prepareSpaceV2LocalIssueBundle(
      input(),
      uuid,
      recordingCrypto(),
      sha256 as unknown as SpaceSha256Port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_PREPARATION_FAILED" });
    expect(uuid.randomUUID).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["an undefined crypto port", undefined],
    ["a crypto port without the method", {}],
    ["a non-function encryptJson", { encryptJson: 42 }],
  ])("maps %s to PREPARATION_FAILED", async (_label, crypto) => {
    const uuid = pair();
    const sha256 = recordingSha256();

    const result = await prepareSpaceV2LocalIssueBundle(
      input(),
      uuid,
      crypto as unknown as SpaceCryptoPort,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_PREPARATION_FAILED" });
    expect(uuid.randomUUID).toHaveBeenCalledTimes(2);
    expect(sha256.digest).not.toHaveBeenCalled();
  });

  it.each([
    ["a reported encryption failure", async () => ({ ok: false, code: "SPACE_ENCRYPT_FAILED" })],
    [
      "a thrown encryption error",
      () => {
        throw new Error("password=hunter2 token=abc123");
      },
    ],
    ["an encryption rejection", async () => Promise.reject(new Error("uid=operator-1"))],
    ["a malformed envelope", async () => ({ ok: true, value: { salt: "x", iv: "y", ct: "z" } })],
  ])("maps %s to PREPARATION_FAILED after the three hashes", async (_label, encryptJson) => {
    const uuid = pair();
    const sha256 = recordingSha256();

    const result = await prepareSpaceV2LocalIssueBundle(
      input(),
      uuid,
      { encryptJson, decryptJson: vi.fn() } as unknown as SpaceCryptoPort,
      sha256,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_BUNDLE_PREPARATION_FAILED" });
    expect(sha256.digest).toHaveBeenCalledTimes(3);
    expect(uuid.randomUUID).toHaveBeenCalledTimes(2);
  });
});

// --- boundary ----------------------------------------------------------------

describe("prepareSpaceV2LocalIssueBundle — boundary", () => {
  it("never leaks a child code, a UUID, a secret or a path on failure", async () => {
    const failures = [
      await prepareSpaceV2LocalIssueBundle(
        null as unknown as SpaceV2LocalIssueBundleInput,
        pair(),
        recordingCrypto(),
        recordingSha256(),
      ),
      await prepareSpaceV2LocalIssueBundle(
        input(),
        sequenceSource(ASSET_ID, ASSET_ID),
        recordingCrypto(),
        recordingSha256(),
      ),
      await prepareSpaceV2LocalIssueBundle(
        input(),
        {
          randomUUID: () => {
            throw new Error(`token=${TOKEN} uid=operator-1@example.invalid`);
          },
        } as unknown as SpaceV2IssueUuidPort,
        recordingCrypto(),
        recordingSha256(),
      ),
      await prepareSpaceV2LocalIssueBundle(
        input({ password: "" }),
        pair(),
        recordingCrypto(),
        recordingSha256(),
      ),
      await prepareSpaceV2LocalIssueBundle(
        input(),
        pair(),
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
      expect(result.code).toMatch(/^SPACE_V2_BUNDLE_[A-Z_]+$/);
      expect(JSON.stringify(result)).not.toMatch(
        new RegExp(
          `${ASSET_ID}|${TOKEN}|0f9c1b2a|1a2b3c4d|${PASSWORD}|rebuild-space-assets|SPACE_V2_IDENTITY|SPACE_V2_TOKEN|SPACE_V2_PREPARATION|operator-1|@|Error|retry`,
          "i",
        ),
      );
    }
  });

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
    const errorSpy = vi.spyOn(console, "error");

    try {
      // The whole flow completes on the injected stubs alone: no stage falls back to a global port.
      const success = await prepareSpaceV2LocalIssueBundle(input(), pair(), recordingCrypto(), {
        digest: async () => new Uint8Array(32).fill(7),
      });
      expect(success.ok).toBe(true);
      const refused = await prepareSpaceV2LocalIssueBundle(
        input(),
        sequenceSource(ASSET_ID, ASSET_ID),
        recordingCrypto(),
        { digest: async () => new Uint8Array(32).fill(7) },
      );
      expect(refused.ok).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
      subtleSpy.mockRestore();
      randomValuesSpy.mockRestore();
      uuidSpy.mockRestore();
      randomSpy.mockRestore();
      nowSpy.mockRestore();
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(subtleSpy).not.toHaveBeenCalled();
    expect(randomValuesSpy).not.toHaveBeenCalled();
    expect(uuidSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
    expect(nowSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect("document" in globalThis).toBe(false);
    expect("HTMLCanvasElement" in globalThis).toBe(false);
  });

  it("uploads nothing and creates nothing: the module names no Storage or Firestore capability", () => {
    const source = readFileSync(new URL("./issue-bundle.ts", import.meta.url), "utf8");
    const code = source
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");

    for (const forbidden of [
      "firebase",
      "uploadBytes",
      "getDownloadURL",
      "setDoc",
      "addDoc",
      "fetch(",
      "XMLHttpRequest",
      "globalThis.crypto",
      "Math.random",
      "Date.now",
    ]) {
      expect(code).not.toContain(forbidden);
    }
  });

  it("stays out of the admin UI: App.tsx and main.tsx never import or call it", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    const main = readFileSync(new URL("../main.tsx", import.meta.url), "utf8");

    for (const entry of [app, main]) {
      expect(entry).not.toContain("issue-bundle");
      expect(entry).not.toContain("prepareSpaceV2LocalIssueBundle");
    }
  });
});
