import type { BackgroundInputCode, EnvelopeResult } from "./background-input";

const malformed = (): EnvelopeResult => ({ ok: false, code: "ROOM_BACKGROUND_MALFORMED_INPUT" });
const failed = (code: BackgroundInputCode): EnvelopeResult => ({ ok: false, code });
const u16 = (bytes: Uint8Array, at: number): number => bytes[at] * 256 + bytes[at + 1];

/** Internal envelope walker, NOT a Huffman/lookup/EXIF validator or pixel decoder. */
export function inspectJpegEnvelope(bytes: Uint8Array, maxEdge: number): EnvelopeResult {
  let at = 2;
  let count = 1; // The initial SOI is a marker too.
  let width = 0;
  let height = 0;
  let frameAt = -1;
  let components = 0;
  let scans = 0;
  let entropy = false;
  while (at < bytes.length) {
    if (entropy && bytes[at] !== 255) {
      at++;
      continue;
    }
    if (bytes[at] !== 255) return malformed();
    while (at < bytes.length && bytes[at] === 255) at++;
    if (at === bytes.length) return malformed();
    const marker = bytes[at++];
    if (entropy && marker === 0) continue; // stuffed data, not a marker
    if (++count > 4096) return failed("ROOM_BACKGROUND_SCAN_LIMIT");
    if (marker === 0) return malformed();
    if (marker >= 208 && marker <= 215) {
      if (!entropy) return malformed();
      continue;
    }
    entropy = false;
    if (marker === 217) {
      if (frameAt < 0 || scans === 0 || at !== bytes.length) return malformed();
      return { ok: true, width, height };
    }
    if (marker === 216) return malformed();
    if (bytes.length - at < 2) return malformed();
    const length = u16(bytes, at);
    if (length < 2 || length > bytes.length - at) return malformed();
    const data = at + 2;
    const end = at + length;
    const sof = marker === 192 || marker === 194;
    const sos = marker === 218;
    const segment =
      (marker >= 224 && marker <= 239) ||
      marker === 254 ||
      marker === 219 ||
      marker === 196 ||
      marker === 221;
    if (!sof && !sos && !segment) return failed("ROOM_BACKGROUND_UNSUPPORTED_STRUCTURE");
    if (sof) {
      if (frameAt >= 0 || length < 8) return malformed();
      components = bytes[data + 5];
      if (bytes[data] !== 8 || (components !== 1 && components !== 3)) {
        return failed("ROOM_BACKGROUND_UNSUPPORTED_STRUCTURE");
      }
      if (length !== 8 + 3 * components) return malformed();
      height = u16(bytes, data + 1);
      width = u16(bytes, data + 3);
      if (width === 0 || height === 0) return malformed();
      frameAt = data + 6;
      for (let i = 0; i < components; i++) {
        const offset = frameAt + i * 3;
        const sampling = bytes[offset + 1];
        if (
          sampling >> 4 < 1 ||
          sampling >> 4 > 4 ||
          (sampling & 15) < 1 ||
          (sampling & 15) > 4 ||
          bytes[offset + 2] > 3
        ) {
          return malformed();
        }
        for (let j = 0; j < i; j++) {
          if (bytes[offset] === bytes[frameAt + j * 3]) return malformed();
        }
      }
      if (width > maxEdge || height > maxEdge) return failed("ROOM_BACKGROUND_EDGE_LIMIT");
      if (width > Math.floor(40_000_000 / height)) return failed("ROOM_BACKGROUND_PIXEL_LIMIT");
    } else if (sos) {
      if (frameAt < 0 || length < 6) return malformed();
      const scanComponents = bytes[data];
      if (scanComponents < 1 || scanComponents > components || length !== 6 + 2 * scanComponents) {
        return malformed();
      }
      for (let i = 0; i < scanComponents; i++) {
        const offset = data + 1 + i * 2;
        const id = bytes[offset];
        const tables = bytes[offset + 1];
        if (tables >> 4 > 3 || (tables & 15) > 3) return malformed();
        let found = false;
        for (let j = 0; j < components; j++) {
          if (id === bytes[frameAt + j * 3]) found = true;
        }
        if (!found) return malformed();
        for (let j = 0; j < i; j++) {
          if (id === bytes[data + 1 + j * 2]) return malformed();
        }
      }
      scans++;
      entropy = true;
    } else if (marker === 221 && length !== 4) {
      return malformed();
    }
    at = end;
  }
  return malformed();
}
