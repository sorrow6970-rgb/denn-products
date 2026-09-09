export type TiffOrientationCode =
  | "TIFF_ORIENTATION_INVALID_INPUT"
  | "TIFF_ORIENTATION_BYTE_LIMIT"
  | "TIFF_ORIENTATION_MALFORMED"
  | "TIFF_ORIENTATION_SCAN_LIMIT"
  | "TIFF_ORIENTATION_UNSUPPORTED_TYPE";

export type TiffOrientationResult =
  | Readonly<{
      ok: true;
      kind: "orientation-tag-only";
      presence: "present" | "absent";
      value: number | null;
      imageOrientation: "NOT_VERIFIED";
      profileValidation: "PARTIAL";
      decodeAllowed: false;
    }>
  | Readonly<{ ok: false; code: TiffOrientationCode }>;

const typed = Object.getPrototypeOf(Uint8Array.prototype);
const bufferGetter = Object.getOwnPropertyDescriptor(typed, "buffer")?.get;
const offsetGetter = Object.getOwnPropertyDescriptor(typed, "byteOffset")?.get;
const lengthGetter = Object.getOwnPropertyDescriptor(typed, "byteLength")?.get;
const tagGetter = Object.getOwnPropertyDescriptor(typed, Symbol.toStringTag)?.get;
const sizeGetter = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength")?.get;
const resizableGetter = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;

const fail = (code: TiffOrientationCode): TiffOrientationResult =>
  Object.freeze({ ok: false, code });
const malformed = () => fail("TIFF_ORIENTATION_MALFORMED");

function elementSize(type: number): number {
  if (type === 1 || type === 2 || type === 7 || type === 129) return 1;
  if (type === 3) return 2;
  if (type === 4 || type === 9) return 4;
  if (type === 5 || type === 10) return 8;
  return 0;
}

/** Spec107: only 0th IFD tag/storage evidence. Never validates a full profile or permits decode. */
export function inspectTiffOrientation(request: unknown): TiffOrientationResult {
  try {
    if (request === null || typeof request !== "object" || Array.isArray(request)) {
      return fail("TIFF_ORIENTATION_INVALID_INPUT");
    }
    const input: unknown = (request as { bytes?: unknown }).bytes;
    if (
      !ArrayBuffer.isView(input) ||
      Object.getPrototypeOf(input) !== Uint8Array.prototype ||
      !bufferGetter ||
      !offsetGetter ||
      !lengthGetter ||
      !tagGetter ||
      !sizeGetter ||
      !resizableGetter ||
      Reflect.apply(tagGetter, input, []) !== "Uint8Array"
    ) {
      return fail("TIFF_ORIENTATION_INVALID_INPUT");
    }
    const buffer: unknown = Reflect.apply(bufferGetter, input, []);
    const offset: number = Reflect.apply(offsetGetter, input, []);
    const length: number = Reflect.apply(lengthGetter, input, []);
    const size: number = Reflect.apply(sizeGetter, buffer, []);
    if (
      Object.getPrototypeOf(buffer) !== ArrayBuffer.prototype ||
      Reflect.apply(resizableGetter, buffer, []) !== false ||
      length === 0 ||
      offset > size ||
      length > size - offset
    ) {
      return fail("TIFF_ORIENTATION_INVALID_INPUT");
    }
    if (length > 20_000_000) return fail("TIFF_ORIENTATION_BYTE_LIMIT");
    // View only, not a byte copy; no external calls or asynchronous work during parsing.
    const bytes = new Uint8Array(buffer as ArrayBuffer, offset, length);
    if (length < 8) return malformed();
    const little = bytes[0] === 73 && bytes[1] === 73;
    if (!little && !(bytes[0] === 77 && bytes[1] === 77)) return malformed();
    const u16 = (at: number): number =>
      little ? bytes[at] + bytes[at + 1] * 256 : bytes[at] * 256 + bytes[at + 1];
    const u32 = (at: number): number =>
      little ? u16(at) + u16(at + 2) * 65536 : u16(at) * 65536 + u16(at + 2);
    if (u16(2) !== 42) return malformed();
    const first = u32(4);
    if (first < 8 || first > length - 2) return malformed();
    const count = u16(first);
    if (count > 256) return fail("TIFF_ORIENTATION_SCAN_LIMIT");
    const tableSize = 2 + 12 * count + 4;
    if (tableSize > length - first) return malformed();
    const tableEnd = first + tableSize;
    let previous = -1;
    let value: number | null = null;
    for (let i = 0; i < count; i++) {
      const entry = first + 2 + 12 * i;
      const tag = u16(entry);
      if (tag <= previous) return malformed();
      previous = tag;
      const type = u16(entry + 2);
      const unit = elementSize(type);
      if (unit === 0) return fail("TIFF_ORIENTATION_UNSUPPORTED_TYPE");
      const amount = u32(entry + 4);
      if (amount === 0) return malformed();
      // uint32 count * at most 8 is exactly representable. Bounds precede any value access.
      const storage = amount * unit;
      if (storage > 4) {
        const start = u32(entry + 8);
        if (
          start < 8 ||
          start > length ||
          storage > length - start ||
          (start < tableEnd && start + storage > first)
        ) {
          return malformed();
        }
      }
      if (tag === 274) {
        if (type !== 3 || amount !== 1) return malformed();
        value = u16(entry + 8);
        if (value < 1 || value > 8) return malformed();
      }
    }
    const next = u32(tableEnd - 4);
    if (next !== 0 && (next < 8 || next > length - 2 || (next < tableEnd && next + 2 > first))) {
      return malformed();
    }
    // Non-primary IFDs and pointers in other tags remain uninterpreted, including their graphs.
    return Object.freeze({
      ok: true,
      kind: "orientation-tag-only",
      presence: value === null ? "absent" : "present",
      value,
      imageOrientation: "NOT_VERIFIED",
      profileValidation: "PARTIAL",
      decodeAllowed: false,
    });
  } catch {
    return fail("TIFF_ORIENTATION_INVALID_INPUT");
  }
}
