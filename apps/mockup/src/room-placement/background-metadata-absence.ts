import { type BackgroundInputCode, inspectRoomBackgroundInput } from "./background-input";

type AbsenceCode = BackgroundInputCode | "ROOM_BACKGROUND_METADATA_UNVERIFIED";
type Failure = Readonly<{ ok: false; code: AbsenceCode }>;
export type BackgroundMetadataAbsenceResult =
  | Failure
  | Readonly<{
      ok: true;
      kind: "metadata-absence-evidence";
      format: "jpeg" | "png";
      byteLength: number;
      encodedWidth: number;
      encodedHeight: number;
      encodedPixels: number;
      metadataPolicy: "core-only-v1";
      orientationBasis: "encoded-pixels";
      validation: "METADATA_ABSENCE_ONLY";
      decodeAllowed: false;
    }>;

const typed = Object.getPrototypeOf(Uint8Array.prototype);
const bufferGetter = Object.getOwnPropertyDescriptor(typed, "buffer")?.get;
const offsetGetter = Object.getOwnPropertyDescriptor(typed, "byteOffset")?.get;
const lengthGetter = Object.getOwnPropertyDescriptor(typed, "byteLength")?.get;
const fail = (code: AbsenceCode): Failure => Object.freeze({ ok: false, code });
const u16 = (bytes: Uint8Array, at: number) => bytes[at] * 256 + bytes[at + 1];
const u32 = (bytes: Uint8Array, at: number) => u16(bytes, at) * 65536 + u16(bytes, at + 2);

// Called only after104 validates this exact, fixed-buffer view synchronously.
function pngAbsence(bytes: Uint8Array): Failure | null {
  let at = 8;
  let count = 0;
  while (at < bytes.length) {
    if (++count > 4096) return fail("ROOM_BACKGROUND_SCAN_LIMIT");
    const type = u32(bytes, at + 4);
    if (
      type !== 0x49484452 && // IHDR
      type !== 0x504c5445 && // PLTE
      type !== 0x49444154 && // IDAT
      type !== 0x49454e44 // IEND
    ) {
      return fail("ROOM_BACKGROUND_METADATA_UNVERIFIED");
    }
    at += u32(bytes, at) + 12;
  }
  return null;
}

function jpegAbsence(bytes: Uint8Array): Failure | null {
  let at = 2;
  let count = 1;
  let entropy = false;
  while (at < bytes.length) {
    if (entropy && bytes[at] !== 255) {
      at++;
      continue;
    }
    if (bytes[at] !== 255) return fail("ROOM_BACKGROUND_MALFORMED_INPUT");
    while (at < bytes.length && bytes[at] === 255) at++;
    if (at === bytes.length) return fail("ROOM_BACKGROUND_MALFORMED_INPUT");
    const marker = bytes[at++];
    if (entropy && marker === 0) continue;
    if (++count > 4096) return fail("ROOM_BACKGROUND_SCAN_LIMIT");
    if (entropy && marker >= 208 && marker <= 215) continue;
    entropy = false;
    if (marker === 217) return null;
    if (
      marker !== 192 && // SOF0
      marker !== 194 && // SOF2
      marker !== 218 && // SOS
      marker !== 219 && // DQT
      marker !== 196 && // DHT
      marker !== 221 // DRI
    ) {
      return fail("ROOM_BACKGROUND_METADATA_UNVERIFIED");
    }
    at += u16(bytes, at);
    if (marker === 218) entropy = true;
  }
  return fail("ROOM_BACKGROUND_MALFORMED_INPUT");
}

/** Spec118: synchronous borrowed-byte evidence, NOT a lease or decode authorization.
 * Even valid APP/COM/ancillary metadata is outside this deliberately narrow subset.
 * Does not validate compressed pixels, infer an Exif value, strip metadata or retain bytes.
 */
export function inspectRoomBackgroundMetadataAbsence(
  request: unknown,
): BackgroundMetadataAbsenceResult {
  try {
    if (request === null || typeof request !== "object" || Array.isArray(request)) {
      return fail("ROOM_BACKGROUND_INVALID_INPUT");
    }
    const record = request as { bytes?: unknown; budget?: unknown };
    const input = record.bytes;
    const budget = record.budget;
    if (budget === null || typeof budget !== "object" || Array.isArray(budget)) {
      return fail("ROOM_BACKGROUND_INVALID_INPUT");
    }
    const maxEdge = (budget as { maxEdge?: unknown }).maxEdge;
    // Finish all caller access before104. No external calls between the two byte walks.
    const preflight = inspectRoomBackgroundInput({ bytes: input, budget: { maxEdge } });
    if (!preflight.ok) return preflight;
    if (!bufferGetter || !offsetGetter || !lengthGetter) {
      return fail("ROOM_BACKGROUND_INVALID_INPUT");
    }
    const buffer = Reflect.apply(bufferGetter, input, []) as ArrayBuffer;
    const offset: number = Reflect.apply(offsetGetter, input, []);
    const length: number = Reflect.apply(lengthGetter, input, []);
    const bytes = new Uint8Array(buffer, offset, length);
    const error = preflight.format === "png" ? pngAbsence(bytes) : jpegAbsence(bytes);
    if (error) return error;
    return Object.freeze({
      ok: true,
      kind: "metadata-absence-evidence",
      format: preflight.format,
      byteLength: preflight.byteLength,
      encodedWidth: preflight.encodedWidth,
      encodedHeight: preflight.encodedHeight,
      encodedPixels: preflight.encodedPixels,
      metadataPolicy: "core-only-v1",
      orientationBasis: "encoded-pixels",
      validation: "METADATA_ABSENCE_ONLY",
      decodeAllowed: false,
    });
  } catch {
    return fail("ROOM_BACKGROUND_INVALID_INPUT");
  }
}
