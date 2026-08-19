const MAX_DOCUMENT_ID_BYTES = 1_500;
const RESERVED_DOCUMENT_ID = /^__.*__$/;

function hasValidUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

/** Firestore's documented document-ID constraints, without narrowing legacy custom IDs to hex. */
export function isValidSpaceToken(value: unknown): value is string {
  if (typeof value !== "string" || value === "" || value === "." || value === "..") return false;
  if (value.includes("/") || RESERVED_DOCUMENT_ID.test(value) || !hasValidUtf16(value))
    return false;
  return new TextEncoder().encode(value).byteLength <= MAX_DOCUMENT_ID_BYTES;
}
