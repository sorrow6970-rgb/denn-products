import { inspectJpegEnvelope } from "./background-jpeg-envelope";
import { inspectPngEnvelope } from "./background-png-envelope";

export type BackgroundInputCode =
  | "ROOM_BACKGROUND_INVALID_INPUT"
  | "ROOM_BACKGROUND_BYTE_LIMIT"
  | "ROOM_BACKGROUND_UNSUPPORTED_FORMAT"
  | "ROOM_BACKGROUND_SCAN_LIMIT"
  | "ROOM_BACKGROUND_MALFORMED_INPUT"
  | "ROOM_BACKGROUND_ANIMATED_INPUT"
  | "ROOM_BACKGROUND_UNSUPPORTED_STRUCTURE"
  | "ROOM_BACKGROUND_EDGE_LIMIT"
  | "ROOM_BACKGROUND_PIXEL_LIMIT";

// Internal envelope evidence, not a decoder or an immutable byte lease.
export type EnvelopeResult =
  | { readonly ok: true; readonly width: number; readonly height: number }
  | { readonly ok: false; readonly code: BackgroundInputCode };

export type BackgroundInputResult =
  | Readonly<{
      ok: true;
      kind: "preflight-only";
      format: "jpeg" | "png";
      byteLength: number;
      encodedWidth: number;
      encodedHeight: number;
      encodedPixels: number;
      orientation: "NOT_VERIFIED";
      decodeAllowed: false;
    }>
  | Readonly<{ ok: false; code: BackgroundInputCode }>;

const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const bufferGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, "buffer")?.get;
const offsetGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteOffset")?.get;
const lengthGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteLength")?.get;
const tagGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, Symbol.toStringTag)?.get;
const bufferLengthGetter = Object.getOwnPropertyDescriptor(
  ArrayBuffer.prototype,
  "byteLength",
)?.get;
const resizableGetter = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function failure(code: BackgroundInputCode): BackgroundInputResult {
  return Object.freeze({ ok: false, code });
}

/** Spec104. Borrows bytes synchronously; retains/copies none. Never authorizes decoding. */
export function inspectRoomBackgroundInput(request: unknown): BackgroundInputResult {
  try {
    if (!record(request)) return failure("ROOM_BACKGROUND_INVALID_INPUT");
    const input = request.bytes;
    const budget = request.budget;
    if (!record(budget)) return failure("ROOM_BACKGROUND_INVALID_INPUT");
    const maxEdge = budget.maxEdge;
    if (
      typeof maxEdge !== "number" ||
      !Number.isSafeInteger(maxEdge) ||
      maxEdge < 1 ||
      maxEdge > 40_000_000 ||
      !ArrayBuffer.isView(input) ||
      Object.getPrototypeOf(input) !== Uint8Array.prototype ||
      !bufferGetter ||
      !offsetGetter ||
      !lengthGetter ||
      !tagGetter ||
      !bufferLengthGetter ||
      !resizableGetter
    ) {
      return failure("ROOM_BACKGROUND_INVALID_INPUT");
    }
    // Intrinsics ignore shadowing getters/methods on input and backing. No user calls below.
    if (Reflect.apply(tagGetter, input, []) !== "Uint8Array") {
      return failure("ROOM_BACKGROUND_INVALID_INPUT");
    }
    const buffer: unknown = Reflect.apply(bufferGetter, input, []);
    const offset: number = Reflect.apply(offsetGetter, input, []);
    const length: number = Reflect.apply(lengthGetter, input, []);
    const bufferLength: number = Reflect.apply(bufferLengthGetter, buffer, []);
    if (
      Object.getPrototypeOf(buffer) !== ArrayBuffer.prototype ||
      Reflect.apply(resizableGetter, buffer, []) !== false ||
      length === 0 ||
      offset > bufferLength ||
      length > bufferLength - offset
    ) {
      return failure("ROOM_BACKGROUND_INVALID_INPUT");
    }
    if (length > 20_000_000) return failure("ROOM_BACKGROUND_BYTE_LIMIT");
    // A fresh view, not a byte copy. Shadowed numeric-access-independent metadata stays private.
    const bytes = new Uint8Array(buffer as ArrayBuffer, offset, length);
    let format: "png" | "jpeg";
    let result: EnvelopeResult;
    if (
      length >= 8 &&
      bytes[0] === 137 &&
      bytes[1] === 80 &&
      bytes[2] === 78 &&
      bytes[3] === 71 &&
      bytes[4] === 13 &&
      bytes[5] === 10 &&
      bytes[6] === 26 &&
      bytes[7] === 10
    ) {
      format = "png";
      result = inspectPngEnvelope(bytes, maxEdge);
    } else if (length >= 2 && bytes[0] === 255 && bytes[1] === 216) {
      format = "jpeg";
      result = inspectJpegEnvelope(bytes, maxEdge);
    } else {
      return failure("ROOM_BACKGROUND_UNSUPPORTED_FORMAT");
    }
    if (!result.ok) return failure(result.code);
    return Object.freeze({
      ok: true,
      kind: "preflight-only",
      format,
      byteLength: length,
      encodedWidth: result.width,
      encodedHeight: result.height,
      encodedPixels: result.width * result.height,
      orientation: "NOT_VERIFIED",
      decodeAllowed: false,
    });
  } catch {
    return failure("ROOM_BACKGROUND_INVALID_INPUT");
  }
}
