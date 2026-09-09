import { type BackgroundInputCode, inspectRoomBackgroundInput } from "./background-input";
import { inspectTiffOrientation, type TiffOrientationCode } from "./background-orientation";

type ContainerCode =
  | BackgroundInputCode
  | TiffOrientationCode
  | "ROOM_BACKGROUND_METADATA_DUPLICATE"
  | "ROOM_BACKGROUND_METADATA_ORDER"
  | "ROOM_BACKGROUND_METADATA_UNSUPPORTED";
type Failure = Readonly<{ ok: false; code: ContainerCode }>;
export type BackgroundContainerResult =
  | Failure
  | Readonly<{
      ok: true;
      kind: "container-orientation-evidence";
      format: "jpeg" | "png";
      byteLength: number;
      encodedWidth: number;
      encodedHeight: number;
      encodedPixels: number;
      exifPresence: "present" | "absent";
      tagPresence: "present" | "absent" | "unavailable";
      value: number | null;
      profileValidation: "PARTIAL";
      imageOrientation: "NOT_VERIFIED";
      decodeAllowed: false;
    }>;

type Location = { ok: true; start: number; length: number } | Failure;
const fail = (code: ContainerCode): Failure => Object.freeze({ ok: false, code });
const malformed = () => fail("ROOM_BACKGROUND_MALFORMED_INPUT");
const u16 = (bytes: Uint8Array, at: number) => bytes[at] * 256 + bytes[at + 1];
const u32 = (bytes: Uint8Array, at: number) => u16(bytes, at) * 65536 + u16(bytes, at + 2);
const typed = Object.getPrototypeOf(Uint8Array.prototype);
const bufferGetter = Object.getOwnPropertyDescriptor(typed, "buffer")?.get;
const offsetGetter = Object.getOwnPropertyDescriptor(typed, "byteOffset")?.get;
const lengthGetter = Object.getOwnPropertyDescriptor(typed, "byteLength")?.get;

function locatePng(bytes: Uint8Array): Location {
  let at = 8;
  let count = 0;
  let start = -1;
  let length = 0;
  let sawData = false;
  while (at < bytes.length) {
    if (++count > 4096) return fail("ROOM_BACKGROUND_SCAN_LIMIT");
    if (bytes.length - at < 12) return malformed();
    const size = u32(bytes, at);
    if (size > bytes.length - at - 12) return malformed();
    const type = u32(bytes, at + 4);
    if (type === 0x49444154) sawData = true;
    if (type === 0x65584966) {
      if (start !== -1) return fail("ROOM_BACKGROUND_METADATA_DUPLICATE");
      if (sawData) return fail("ROOM_BACKGROUND_METADATA_ORDER");
      start = at + 8;
      length = size;
    }
    at += size + 12;
  }
  return { ok: true, start, length };
}

function locateJpeg(bytes: Uint8Array): Location {
  let at = 2;
  let count = 1;
  let entropy = false;
  let start = -1;
  let length = 0;
  while (at < bytes.length) {
    if (entropy && bytes[at] !== 255) {
      at++;
      continue;
    }
    if (bytes[at] !== 255) return malformed();
    while (at < bytes.length && bytes[at] === 255) at++;
    if (at === bytes.length) return malformed();
    const marker = bytes[at++];
    if (entropy && marker === 0) continue;
    if (++count > 4096) return fail("ROOM_BACKGROUND_SCAN_LIMIT");
    if (marker >= 208 && marker <= 215 && entropy) continue;
    entropy = false;
    if (marker === 217) return { ok: true, start, length };
    if (bytes.length - at < 2) return malformed();
    const size = u16(bytes, at);
    if (size < 2 || size > bytes.length - at) return malformed();
    const data = at + 2;
    if (marker === 225) {
      if (
        size < 8 ||
        bytes[data] !== 69 ||
        bytes[data + 1] !== 120 ||
        bytes[data + 2] !== 105 ||
        bytes[data + 3] !== 102 ||
        bytes[data + 4] !== 0 ||
        bytes[data + 5] !== 0
      ) {
        return fail("ROOM_BACKGROUND_METADATA_UNSUPPORTED");
      }
      if (start !== -1) return fail("ROOM_BACKGROUND_METADATA_DUPLICATE");
      start = data + 6;
      length = size - 8;
    }
    at += size;
    if (marker === 218) entropy = true;
  }
  return malformed();
}

/** Spec108. Synchronous partial evidence only, never an immutable lease or decode authorization. */
export function inspectRoomBackgroundContainer(request: unknown): BackgroundContainerResult {
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
    // Finish caller access first; 104 validates a plain local request and the actual native view.
    const preflight = inspectRoomBackgroundInput({ bytes: input, budget: { maxEdge } });
    if (!preflight.ok) return preflight;
    if (!bufferGetter || !offsetGetter || !lengthGetter)
      return fail("ROOM_BACKGROUND_INVALID_INPUT");
    const buffer = Reflect.apply(bufferGetter, input, []) as ArrayBuffer;
    const offset: number = Reflect.apply(offsetGetter, input, []);
    const length: number = Reflect.apply(lengthGetter, input, []);
    const bytes = new Uint8Array(buffer, offset, length);
    const location = preflight.format === "png" ? locatePng(bytes) : locateJpeg(bytes);
    if (!location.ok) return location;
    let tagPresence: "present" | "absent" | "unavailable" = "unavailable";
    let value: number | null = null;
    if (location.start !== -1) {
      // Only the exact profile, excluding prefix, CRC, following chunks and surrounding backing.
      const profile = new Uint8Array(buffer, offset + location.start, location.length);
      const tag = inspectTiffOrientation({ bytes: profile });
      if (!tag.ok) return tag;
      tagPresence = tag.presence;
      value = tag.value;
    }
    return Object.freeze({
      ok: true,
      kind: "container-orientation-evidence",
      format: preflight.format,
      byteLength: preflight.byteLength,
      encodedWidth: preflight.encodedWidth,
      encodedHeight: preflight.encodedHeight,
      encodedPixels: preflight.encodedPixels,
      exifPresence: location.start === -1 ? "absent" : "present",
      tagPresence,
      value,
      profileValidation: "PARTIAL",
      imageOrientation: "NOT_VERIFIED",
      decodeAllowed: false,
    });
  } catch {
    return fail("ROOM_BACKGROUND_INVALID_INPUT");
  }
}
