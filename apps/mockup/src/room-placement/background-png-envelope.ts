import type { BackgroundInputCode, EnvelopeResult } from "./background-input";

const malformed = (): EnvelopeResult => ({ ok: false, code: "ROOM_BACKGROUND_MALFORMED_INPUT" });
const failed = (code: BackgroundInputCode): EnvelopeResult => ({ ok: false, code });

function u32(bytes: Uint8Array, at: number): number {
  return bytes[at] * 0x1000000 + (bytes[at + 1] << 16) + (bytes[at + 2] << 8) + bytes[at + 3];
}

function crc(bytes: Uint8Array, from: number, to: number): number {
  let value = 0xffffffff;
  for (let i = from; i < to; i++) {
    value ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

/** Internal: caller already checked signature, non-resizable view, byte cap and maxEdge. No inflate. */
export function inspectPngEnvelope(bytes: Uint8Array, maxEdge: number): EnvelopeResult {
  let at = 8;
  let count = 0;
  let width = 0;
  let height = 0;
  let color = -1;
  let depth = 0;
  let palette = false;
  let sawData = false;
  let dataEnded = false;
  let dataBytes = 0;
  while (at < bytes.length) {
    if (++count > 4096) return failed("ROOM_BACKGROUND_SCAN_LIMIT");
    if (bytes.length - at < 12) return malformed();
    const length = u32(bytes, at);
    if (length > 0x7fffffff || length > bytes.length - at - 12) return malformed();
    const type = u32(bytes, at + 4);
    const data = at + 8;
    const end = data + length;
    for (let i = at + 4; i < data; i++) {
      const c = bytes[i];
      if (!((c >= 65 && c <= 90) || (c >= 97 && c <= 122))) return malformed();
    }
    if ((bytes[at + 6] & 32) !== 0) return malformed();
    if (type === 0x6163544c || type === 0x6663544c || type === 0x66644154) {
      return failed("ROOM_BACKGROUND_ANIMATED_INPUT");
    }
    const ihdr = type === 0x49484452;
    const plte = type === 0x504c5445;
    const idat = type === 0x49444154;
    const iend = type === 0x49454e44;
    if (!ihdr && !plte && !idat && !iend && (bytes[at + 4] & 32) === 0) {
      return failed("ROOM_BACKGROUND_UNSUPPORTED_STRUCTURE");
    }
    if (crc(bytes, at + 4, end) !== u32(bytes, end)) return malformed();
    if (count === 1 && !ihdr) return malformed();
    if (ihdr) {
      if (count !== 1 || length !== 13) return malformed();
      width = u32(bytes, data);
      height = u32(bytes, data + 4);
      depth = bytes[data + 8];
      color = bytes[data + 9];
      const validDepth =
        (color === 0 &&
          (depth === 1 || depth === 2 || depth === 4 || depth === 8 || depth === 16)) ||
        (color === 3 && (depth === 1 || depth === 2 || depth === 4 || depth === 8)) ||
        ((color === 2 || color === 4 || color === 6) && (depth === 8 || depth === 16));
      if (
        width === 0 ||
        height === 0 ||
        width > 0x7fffffff ||
        height > 0x7fffffff ||
        !validDepth ||
        bytes[data + 10] !== 0 ||
        bytes[data + 11] !== 0 ||
        bytes[data + 12] > 1
      ) {
        return malformed();
      }
      if (width > maxEdge || height > maxEdge) return failed("ROOM_BACKGROUND_EDGE_LIMIT");
      if (width > Math.floor(40_000_000 / height)) return failed("ROOM_BACKGROUND_PIXEL_LIMIT");
    } else if (plte) {
      if (
        palette ||
        sawData ||
        color === 0 ||
        color === 4 ||
        length === 0 ||
        length % 3 !== 0 ||
        length > 768 ||
        (color === 3 && length / 3 > 2 ** depth)
      ) {
        return malformed();
      }
      palette = true;
    } else if (idat) {
      if (dataEnded || (color === 3 && !palette)) return malformed();
      sawData = true;
      dataBytes += length;
    } else if (iend) {
      if (length !== 0 || !sawData || dataBytes === 0 || end + 4 !== bytes.length)
        return malformed();
      return { ok: true, width, height };
    } else if (sawData) {
      dataEnded = true;
    }
    at = end + 4;
  }
  return malformed();
}
