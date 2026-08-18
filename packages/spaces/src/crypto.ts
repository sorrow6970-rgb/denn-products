export const LEGACY_SPACE_CRYPTO = Object.freeze({
  pbkdf2Iterations: 120_000,
  pbkdf2Hash: "SHA-256",
  aesName: "AES-GCM",
  aesKeyBits: 256,
  saltBytes: 16,
  ivBytes: 12,
} as const);

export interface SpaceEncryptedEnvelope {
  readonly salt: string;
  readonly iv: string;
  readonly ct: string;
}

export type SpaceCryptoErrorCode =
  | "SPACE_INVALID_INPUT"
  | "SPACE_INVALID_ENVELOPE"
  | "SPACE_ENCRYPT_FAILED"
  | "SPACE_DECRYPT_FAILED";

export type SpaceCryptoResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: SpaceCryptoErrorCode };

export interface SpaceCryptoPort {
  encryptJson(value: unknown, password: string): Promise<SpaceCryptoResult<SpaceEncryptedEnvelope>>;
  decryptJson(envelope: unknown, password: string): Promise<SpaceCryptoResult<unknown>>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array | null {
  if (value === "" || !BASE64.test(value)) return null;
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function readEnvelope(
  input: unknown,
): { readonly salt: Uint8Array; readonly iv: Uint8Array; readonly ct: Uint8Array } | null {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
    const keys = Object.keys(input).sort();
    if (keys.join(",") !== "ct,iv,salt") return null;
    const value = input as Record<string, unknown>;
    if (
      typeof value.salt !== "string" ||
      typeof value.iv !== "string" ||
      typeof value.ct !== "string"
    )
      return null;
    const salt = base64ToBytes(value.salt);
    const iv = base64ToBytes(value.iv);
    const ct = base64ToBytes(value.ct);
    if (!salt || !iv || !ct) return null;
    if (salt.length !== LEGACY_SPACE_CRYPTO.saltBytes || iv.length !== LEGACY_SPACE_CRYPTO.ivBytes)
      return null;
    if (ct.length < 16) return null;
    return { salt, iv, ct };
  } catch {
    return null;
  }
}

async function deriveKey(
  cryptoPort: Crypto,
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const material = await cryptoPort.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return cryptoPort.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: LEGACY_SPACE_CRYPTO.pbkdf2Iterations,
      hash: LEGACY_SPACE_CRYPTO.pbkdf2Hash,
    },
    material,
    { name: LEGACY_SPACE_CRYPTO.aesName, length: LEGACY_SPACE_CRYPTO.aesKeyBits },
    false,
    ["encrypt", "decrypt"],
  );
}

export function createSpaceCrypto(cryptoPort: Crypto = globalThis.crypto): SpaceCryptoPort {
  return {
    async encryptJson(value, password) {
      if (typeof password !== "string" || password.length === 0) {
        return { ok: false, code: "SPACE_INVALID_INPUT" };
      }
      let plaintext: Uint8Array;
      try {
        const json = JSON.stringify(value);
        if (typeof json !== "string") return { ok: false, code: "SPACE_INVALID_INPUT" };
        plaintext = encoder.encode(json);
      } catch {
        return { ok: false, code: "SPACE_INVALID_INPUT" };
      }
      try {
        const salt = cryptoPort.getRandomValues(new Uint8Array(LEGACY_SPACE_CRYPTO.saltBytes));
        const iv = cryptoPort.getRandomValues(new Uint8Array(LEGACY_SPACE_CRYPTO.ivBytes));
        const key = await deriveKey(cryptoPort, password, salt);
        const ciphertext = await cryptoPort.subtle.encrypt(
          { name: LEGACY_SPACE_CRYPTO.aesName, iv: toArrayBuffer(iv) },
          key,
          toArrayBuffer(plaintext),
        );
        return {
          ok: true,
          value: {
            salt: bytesToBase64(salt),
            iv: bytesToBase64(iv),
            ct: bytesToBase64(new Uint8Array(ciphertext)),
          },
        };
      } catch {
        return { ok: false, code: "SPACE_ENCRYPT_FAILED" };
      }
    },

    async decryptJson(envelope, password) {
      if (typeof password !== "string") return { ok: false, code: "SPACE_INVALID_INPUT" };
      const parsed = readEnvelope(envelope);
      if (!parsed) return { ok: false, code: "SPACE_INVALID_ENVELOPE" };
      try {
        const key = await deriveKey(cryptoPort, password, parsed.salt);
        const plaintext = await cryptoPort.subtle.decrypt(
          { name: LEGACY_SPACE_CRYPTO.aesName, iv: toArrayBuffer(parsed.iv) },
          key,
          toArrayBuffer(parsed.ct),
        );
        return { ok: true, value: JSON.parse(decoder.decode(plaintext)) as unknown };
      } catch {
        return { ok: false, code: "SPACE_DECRYPT_FAILED" };
      }
    },
  };
}
