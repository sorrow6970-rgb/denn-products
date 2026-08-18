import { describe, expect, it } from "vitest";
import { createSpaceCrypto, LEGACY_SPACE_CRYPTO } from "./crypto";

const VECTOR = Object.freeze({
  password: "비밀번호🔒",
  value: { schema: "space-scene-v1", text: "안녕😀", n: 1 },
  envelope: {
    salt: "AAECAwQFBgcICQoLDA0ODw==",
    iv: "EBESExQVFhcYGRob",
    ct: "l+K0Xv7nnslbRvPYSyv2Wn8V4pOc4gjyqtr55KOL3Pr4yz7eh5vAcatSzVALe0bz+8ayWLPxP3AK1SH4SafChPBViBC9",
  },
});

function fixedCrypto(): { readonly crypto: Crypto; readonly calls: number[] } {
  const calls: number[] = [];
  const values = [
    Uint8Array.from({ length: 16 }, (_, index) => index),
    Uint8Array.from({ length: 12 }, (_, index) => index + 16),
  ];
  const crypto = {
    subtle: globalThis.crypto.subtle,
    getRandomValues<T extends ArrayBufferView | null>(target: T): T {
      if (!(target instanceof Uint8Array)) throw new Error("unexpected target");
      calls.push(target.length);
      const next = values.shift();
      if (!next || next.length !== target.length) throw new Error("unexpected random request");
      target.set(next);
      return target;
    },
    randomUUID: globalThis.crypto.randomUUID.bind(globalThis.crypto),
  } as Crypto;
  return { crypto, calls };
}

describe("legacy space crypto envelope", () => {
  it("pins the legacy algorithm constants", () => {
    expect(LEGACY_SPACE_CRYPTO).toEqual({
      pbkdf2Iterations: 120_000,
      pbkdf2Hash: "SHA-256",
      aesName: "AES-GCM",
      aesKeyBits: 256,
      saltBytes: 16,
      ivBytes: 12,
    });
  });

  it("encrypts to the fixed legacy vector with exactly one salt and IV request", async () => {
    const fixed = fixedCrypto();
    const result = await createSpaceCrypto(fixed.crypto).encryptJson(VECTOR.value, VECTOR.password);
    expect(result).toEqual({ ok: true, value: VECTOR.envelope });
    expect(fixed.calls).toEqual([16, 12]);
  });

  it("decrypts the fixed legacy vector including UTF-8 Korean and emoji", async () => {
    await expect(
      createSpaceCrypto().decryptJson(VECTOR.envelope, VECTOR.password),
    ).resolves.toEqual({
      ok: true,
      value: VECTOR.value,
    });
  });

  it("preserves JSON insertion order semantics", async () => {
    const fixed = fixedCrypto();
    const first = await createSpaceCrypto(fixed.crypto).encryptJson({ b: 1, a: 2 }, "pw");
    const secondFixed = fixedCrypto();
    const second = await createSpaceCrypto(secondFixed.crypto).encryptJson({ a: 2, b: 1 }, "pw");
    expect(first.ok && second.ok && first.value.ct).not.toBe(second.ok && second.value.ct);
  });

  it.each([
    ["wrong password", VECTOR.envelope, "wrong"],
    [
      "tampered ciphertext",
      { ...VECTOR.envelope, ct: `${VECTOR.envelope.ct.slice(0, -4)}AAAA` },
      VECTOR.password,
    ],
  ])("maps %s to one safe decrypt failure", async (_name, envelope, password) => {
    const result = await createSpaceCrypto().decryptJson(envelope, password);
    expect(result).toEqual({ ok: false, code: "SPACE_DECRYPT_FAILED" });
    expect(JSON.stringify(result)).not.toContain(password);
    expect(JSON.stringify(result)).not.toContain(VECTOR.envelope.ct);
  });

  it.each([
    null,
    {},
    { ...VECTOR.envelope, extra: true },
    { ...VECTOR.envelope, salt: "AA-_" },
    { ...VECTOR.envelope, salt: "AA==" },
    { ...VECTOR.envelope, iv: "AA==" },
    { ...VECTOR.envelope, ct: "AA==" },
  ])("rejects malformed envelopes before decrypt", async (envelope) => {
    await expect(createSpaceCrypto().decryptJson(envelope, "pw")).resolves.toEqual({
      ok: false,
      code: "SPACE_INVALID_ENVELOPE",
    });
  });

  it("fails closed for hostile envelope getters", async () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("secret");
        },
      },
    );
    await expect(createSpaceCrypto().decryptJson(hostile, "pw")).resolves.toEqual({
      ok: false,
      code: "SPACE_INVALID_ENVELOPE",
    });
  });

  it.each([undefined, () => undefined, 1n])(
    "rejects non-JSON values without random or crypto",
    async (value) => {
      const fixed = fixedCrypto();
      await expect(createSpaceCrypto(fixed.crypto).encryptJson(value, "pw")).resolves.toEqual({
        ok: false,
        code: "SPACE_INVALID_INPUT",
      });
      expect(fixed.calls).toEqual([]);
    },
  );

  it("rejects circular values and an empty password without leaking raw errors", async () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    await expect(createSpaceCrypto().encryptJson(circular, "pw")).resolves.toEqual({
      ok: false,
      code: "SPACE_INVALID_INPUT",
    });
    await expect(createSpaceCrypto().encryptJson(VECTOR.value, "")).resolves.toEqual({
      ok: false,
      code: "SPACE_INVALID_INPUT",
    });
  });
});
