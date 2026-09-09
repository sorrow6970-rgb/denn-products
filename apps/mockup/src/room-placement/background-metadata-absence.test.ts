import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectRoomBackgroundContainer } from "./background-container";
import * as inputReader from "./background-input";
import { inspectRoomBackgroundMetadataAbsence as inspect } from "./background-metadata-absence";

const raw = (...values: number[]) => new Uint8Array(values);
const join = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};
const segment = (marker: number, data = raw()) =>
  join(raw(255, marker, (data.length + 2) >> 8, (data.length + 2) & 255), data);
const scan = raw(255, 218, 0, 8, 1, 1, 0, 0, 63, 0);
// Structural specimens only: neither Huffman nor deflate/native decoding is proved here.
function jpeg(extra = raw(), tail = raw(17), width = 3, height = 2, sof = 192) {
  return join(
    raw(255, 216),
    extra,
    raw(255, sof, 0, 11, 8, height >> 8, height & 255, width >> 8, width & 255, 1, 1, 17, 0),
    scan,
    tail,
    raw(255, 217),
  );
}
function chunk(name: string, data = raw()) {
  const bytes = new Uint8Array(data.length + 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) bytes[4 + i] = name.charCodeAt(i);
  bytes.set(data, 8);
  let crc = 0xffffffff;
  for (let at = 4; at < bytes.length - 4; at++) {
    crc ^= bytes[at];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  view.setUint32(bytes.length - 4, (crc ^ 0xffffffff) >>> 0);
  return bytes;
}
function png(extra = raw(), after = raw(), data = raw(1)) {
  return join(
    raw(137, 80, 78, 71, 13, 10, 26, 10),
    chunk("IHDR", raw(0, 0, 0, 3, 0, 0, 0, 2, 8, 2, 0, 0, 0)),
    extra,
    chunk("IDAT", data),
    after,
    chunk("IEND"),
  );
}
const check = (bytes: unknown, maxEdge: unknown = 10000) => inspect({ bytes, budget: { maxEdge } });
const fail = (suffix: string) => ({ ok: false, code: `ROOM_BACKGROUND_${suffix}` });
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("spec118 core-only metadata absence, never decode permission", () => {
  it.each(["jpeg", "png"])("classifies %s without mutating or retaining input", (format) => {
    const bytes = format === "jpeg" ? jpeg() : png();
    const before = bytes.slice();
    const result = check(bytes);
    expect(result).toEqual({
      ok: true,
      kind: "metadata-absence-evidence",
      format,
      byteLength: bytes.length,
      encodedWidth: 3,
      encodedHeight: 2,
      encodedPixels: 6,
      metadataPolicy: "core-only-v1",
      orientationBasis: "encoded-pixels",
      validation: "METADATA_ABSENCE_ONLY",
      decodeAllowed: false,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(bytes).toEqual(before);
    bytes.fill(0);
    expect(result).not.toHaveProperty("bytes");
    expect(result).not.toHaveProperty("value");
  });
  it.each(Array.from({ length: 17 }, (_, i) => (i === 16 ? 254 : 224 + i)))(
    "rejects APP/COM marker %i before and after SOS",
    (marker) => {
      expect(check(jpeg(segment(marker)))).toEqual(fail("METADATA_UNVERIFIED"));
      expect(check(jpeg(raw(), join(raw(17), segment(marker))))).toEqual(
        fail("METADATA_UNVERIFIED"),
      );
    },
  );
  it.each(["eXIf", "iTXt", "tEXt", "zTXt", "iCCP", "sRGB", "gAMA", "pHYs", "tRNS", "vpAg"])(
    "rejects ancillary %s both before and after IDAT",
    (type) => {
      expect(check(png(chunk(type)))).toEqual(fail("METADATA_UNVERIFIED"));
      expect(check(png(raw(), chunk(type)))).toEqual(fail("METADATA_UNVERIFIED"));
    },
  );
  it("does not promote108 Exif absence in a file containing other metadata", () => {
    for (const bytes of [jpeg(segment(224)), jpeg(segment(254)), png(chunk("tEXt"))]) {
      const evidence = inspectRoomBackgroundContainer({ bytes, budget: { maxEdge: 10 } });
      expect(evidence).toMatchObject({ ok: true, exifPresence: "absent", decodeAllowed: false });
      expect(check(bytes)).toEqual(fail("METADATA_UNVERIFIED"));
    }
  });
  it.each(["absent-tag", "one", "broken"])("does not infer absence from Exif %s", (kind) => {
    const tiff = new Uint8Array(kind === "one" ? 26 : 14);
    tiff.set([73, 73, 42, 0, 8, 0, 0, 0]);
    if (kind === "one") tiff.set([1, 0, 18, 1, 3, 0, 1, 0, 0, 0, 1, 0], 8);
    if (kind === "broken") tiff[0] = 0;
    expect(check(jpeg(segment(225, join(raw(69, 120, 105, 102, 0, 0), tiff))))).toEqual(
      fail("METADATA_UNVERIFIED"),
    );
    expect(check(png(chunk("eXIf", tiff)))).toEqual(fail("METADATA_UNVERIFIED"));
  });
  it("accepts PLTE and consecutive IDAT but does not inspect compressed payload strings", () => {
    expect(check(png(chunk("PLTE", raw(1, 2, 3)), chunk("IDAT"), chunk("eXIf")))).toMatchObject({
      ok: true,
      decodeAllowed: false,
    });
  });
  it("walks progressive/multiple scans, stuffing, restart and marker fill", () => {
    const coding = join(segment(219, segment(225)), segment(196), segment(221, raw(0, 1)));
    const tail = join(raw(69, 120, 105, 102, 255, 0, 225, 255, 208, 255), scan, raw(1));
    expect(check(jpeg(coding, tail, 3, 2, 194))).toMatchObject({ ok: true });
    expect(check(jpeg(coding, join(tail, segment(225)), 3, 2, 194))).toEqual(
      fail("METADATA_UNVERIFIED"),
    );
  });
  it.each(["jpeg", "png"])("inherits104 malformed/trailing checks for %s", (format) => {
    const bytes = format === "jpeg" ? jpeg() : png();
    expect(check(bytes.subarray(0, bytes.length - 1))).toEqual(fail("MALFORMED_INPUT"));
    expect(check(join(bytes, raw(1)))).toEqual(fail("MALFORMED_INPUT"));
  });
  it("inherits CRC and animation rejection before metadata classification", () => {
    const bytes = png(chunk("eXIf"));
    bytes[bytes.length - 1] ^= 1;
    expect(check(bytes)).toEqual(fail("MALFORMED_INPUT"));
    expect(check(png(chunk("acTL")))).toEqual(fail("ANIMATED_INPUT"));
  });
  it("inherits byte, edge and pixel limits including the pixel boundary", () => {
    expect(check(new Uint8Array(20_000_001))).toEqual(fail("BYTE_LIMIT"));
    expect(check(jpeg(), 2)).toEqual(fail("EDGE_LIMIT"));
    expect(check(jpeg(raw(), raw(1), 10000, 4000))).toMatchObject({ ok: true });
    expect(check(jpeg(raw(), raw(1), 10000, 4001))).toEqual(fail("PIXEL_LIMIT"));
  });
  it("limits JPEG and PNG walks without silently truncating the search", () => {
    const markers = Array.from({ length: 4092 }, () => segment(219));
    expect(check(jpeg(join(...markers)))).toMatchObject({ ok: true });
    expect(check(jpeg(join(...markers, segment(219))))).toEqual(fail("SCAN_LIMIT"));
    const chunks = Array.from({ length: 4093 }, () => chunk("IDAT"));
    expect(check(png(raw(), join(...chunks)))).toMatchObject({ ok: true });
    expect(check(png(raw(), join(...chunks, chunk("IDAT"))))).toEqual(fail("SCAN_LIMIT"));
  });
  it("captures each caller field once and validates104 once after all getters", () => {
    const bytes = jpeg();
    const bytesGet = vi.fn(() => bytes);
    const edgeGet = vi.fn(() => 10);
    const budgetGet = vi.fn(() => ({
      get maxEdge() {
        return edgeGet();
      },
    }));
    const preflight = vi.spyOn(inputReader, "inspectRoomBackgroundInput");
    expect(
      inspect({
        get bytes() {
          return bytesGet();
        },
        get budget() {
          return budgetGet();
        },
      }),
    ).toMatchObject({ ok: true });
    for (const spy of [bytesGet, budgetGet, edgeGet, preflight])
      expect(spy).toHaveBeenCalledTimes(1);
    expect(preflight).toHaveBeenCalledWith({ bytes, budget: { maxEdge: 10 } });
  });
  it("validates bytes after caller getter mutations, not an earlier preflight", () => {
    const bytes = jpeg();
    expect(
      inspect({
        bytes,
        budget: {
          get maxEdge() {
            bytes.fill(0);
            return 10;
          },
        },
      }),
    ).toEqual(fail("UNSUPPORTED_FORMAT"));
  });
  it("respects subview bounds and bypasses shadow properties/methods", () => {
    const encoded = jpeg();
    const backing = join(segment(225), encoded, segment(225));
    const bytes = backing.subarray(4, 4 + encoded.length);
    const forbidden = vi.fn(() => {
      throw new Error("private");
    });
    for (const name of ["buffer", "byteOffset", "byteLength", "length", "slice", "subarray"])
      Object.defineProperty(bytes, name, { get: forbidden });
    expect(check(bytes)).toMatchObject({ ok: true, byteLength: encoded.length });
    expect(forbidden).not.toHaveBeenCalled();
  });
  it("rejects non-fixed, detached, proxy and non-Uint8Array input", () => {
    const detached = jpeg();
    structuredClone(detached.buffer, { transfer: [detached.buffer] });
    for (const bytes of [
      detached,
      new Uint8Array(new SharedArrayBuffer(32)),
      new Uint8Array(Reflect.construct(ArrayBuffer, [32, { maxByteLength: 64 }])),
      new Proxy(jpeg(), {}),
      new Uint16Array(32),
      [],
      null,
    ])
      expect(check(bytes)).toEqual(fail("INVALID_INPUT"));
  });
  it("sanitizes getter errors and makes no browser or network calls", () => {
    const forbidden = vi.fn(() => {
      throw new Error("private");
    });
    for (const name of ["Blob", "FileReader", "createImageBitmap", "Image", "fetch", "document"])
      vi.stubGlobal(name, forbidden);
    expect(check(jpeg())).toMatchObject({ ok: true, decodeAllowed: false });
    const result = inspect({
      get bytes() {
        throw new Error("private bytes");
      },
    });
    expect(result).toEqual(fail("INVALID_INPUT"));
    expect(Object.isFrozen(result)).toBe(true);
    expect(forbidden).not.toHaveBeenCalled();
  });
});
