import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectRoomBackgroundContainer as inspect } from "./background-container";
import * as inputReader from "./background-input";
import * as tagReader from "./background-orientation";

const join = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};
const raw = (...values: number[]) => new Uint8Array(values);
function tiff(value = 6, little = true, present = true) {
  const bytes = new Uint8Array(present ? 26 : 14);
  const v = new DataView(bytes.buffer);
  bytes.set(little ? [73, 73] : [77, 77]);
  v.setUint16(2, 42, little);
  v.setUint32(4, 8, little);
  v.setUint16(8, present ? 1 : 0, little);
  if (present) {
    v.setUint16(10, 274, little);
    v.setUint16(12, 3, little);
    v.setUint32(14, 1, little);
    v.setUint16(18, value, little);
  }
  return bytes;
}
const segment = (marker: number, data = raw()) =>
  join(raw(255, marker, (data.length + 2) >> 8, (data.length + 2) & 255), data);
const exif = (bytes = tiff()) => segment(225, join(raw(69, 120, 105, 102, 0, 0), bytes));
const scan = raw(255, 218, 0, 8, 1, 1, 0, 0, 63, 0);
function jpeg(extra = raw(), width = 3, height = 2, entropy = raw(17)) {
  return join(
    raw(255, 216),
    extra,
    raw(255, 192, 0, 11, 8, height >> 8, height & 255, width >> 8, width & 255, 1, 1, 17, 0),
    scan,
    entropy,
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
function png(extra = raw(), after = raw(), width = 3, height = 2) {
  const header = raw(0, 0, 0, 0, 0, 0, 0, 0, 8, 2, 0, 0, 0);
  const v = new DataView(header.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  // Envelope-only synthetic data, deliberately not a decoded photograph or an inflate proof.
  return join(
    raw(137, 80, 78, 71, 13, 10, 26, 10),
    chunk("IHDR", header),
    extra,
    chunk("IDAT", raw(1)),
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

describe("spec108 same-byte envelope evidence, never decode permission", () => {
  it.each(
    ["jpeg", "png"].flatMap((format) =>
      [true, false].flatMap((little) =>
        Array.from({ length: 8 }, (_, i) => [format, little, i + 1] as const),
      ),
    ),
  )("finds %s endian%s tag%i", (format, little, value) => {
    const bytes =
      format === "jpeg" ? jpeg(exif(tiff(value, little))) : png(chunk("eXIf", tiff(value, little)));
    expect(check(bytes)).toEqual({
      ok: true,
      kind: "container-orientation-evidence",
      format,
      byteLength: bytes.length,
      encodedWidth: 3,
      encodedHeight: 2,
      encodedPixels: 6,
      exifPresence: "present",
      tagPresence: "present",
      value,
      profileValidation: "PARTIAL",
      imageOrientation: "NOT_VERIFIED",
      decodeAllowed: false,
    });
  });
  it.each(["jpeg", "png"])(
    "distinguishes profile absent, tag absent, explicit1 in %s",
    (format) => {
      const build = (profile?: Uint8Array<ArrayBuffer>) =>
        format === "jpeg"
          ? jpeg(profile ? exif(profile) : raw())
          : png(profile ? chunk("eXIf", profile) : raw());
      expect(check(build())).toMatchObject({
        exifPresence: "absent",
        tagPresence: "unavailable",
        value: null,
      });
      expect(check(build(tiff(1, true, false)))).toMatchObject({
        exifPresence: "present",
        tagPresence: "absent",
        value: null,
      });
      expect(check(build(tiff(1)))).toMatchObject({
        exifPresence: "present",
        tagPresence: "present",
        value: 1,
      });
    },
  );
  it.each(["jpeg", "png"])("rejects duplicate profiles, including equal ones, in %s", (format) => {
    const bytes =
      format === "jpeg"
        ? jpeg(join(exif(), exif()))
        : png(join(chunk("eXIf", tiff()), chunk("eXIf", tiff())));
    const reader = vi.spyOn(tagReader, "inspectTiffOrientation");
    expect(check(bytes)).toEqual(fail("METADATA_DUPLICATE"));
    expect(reader).not.toHaveBeenCalled();
  });
  it.each([0, 1, 2, 3, 4, 5])("rejects malformed Exif identifier byte%i", (at) => {
    const id = raw(69, 120, 105, 102, 0, 0);
    id[at] = 1;
    expect(check(jpeg(segment(225, join(id, tiff()))))).toEqual(fail("METADATA_UNSUPPORTED"));
  });
  it.each([
    raw(),
    raw(69),
    raw(69, 120, 105, 102, 0),
    new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\0"),
  ])("does not treat incomplete or XMP APP1 as absent Exif", (data) => {
    expect(check(jpeg(segment(225, data)))).toEqual(fail("METADATA_UNSUPPORTED"));
  });
  it("does not search inside APP0/COM/entropy for Exif markers", () => {
    const opaqueBytes = join(exif(), raw(255, 0, 225));
    expect(
      check(
        jpeg(
          join(segment(224, opaqueBytes), segment(254, opaqueBytes)),
          3,
          2,
          raw(69, 120, 105, 102, 0, 0, 255, 0, 225, 9, 255, 208, 1),
        ),
      ),
    ).toMatchObject({ ok: true, exifPresence: "absent", value: null });
  });
  it("finds APP1 at marker boundaries after a scan, and detects later duplicates", () => {
    const data = join(raw(17), exif(), scan, raw(3));
    expect(check(jpeg(raw(), 3, 2, data))).toMatchObject({ ok: true, value: 6 });
    expect(check(jpeg(exif(), 3, 2, data))).toEqual(fail("METADATA_DUPLICATE"));
    expect(check(jpeg(join(raw(255), exif())))).toMatchObject({ ok: true, value: 6 });
  });
  it("rejects PNG eXIf after IDAT and leaves opaque text as unverified metadata", () => {
    expect(check(png(raw(), chunk("eXIf", tiff())))).toEqual(fail("METADATA_ORDER"));
    expect(check(png(chunk("iTXt", tiff())))).toMatchObject({
      ok: true,
      exifPresence: "absent",
      profileValidation: "PARTIAL",
      decodeAllowed: false,
    });
  });
  it("does not remove JPEG Exif ID from a PNG eXIf payload", () => {
    expect(check(png(chunk("eXIf", join(raw(69, 120, 105, 102, 0, 0), tiff()))))).toEqual({
      ok: false,
      code: "TIFF_ORIENTATION_MALFORMED",
    });
  });
  it.each(["jpeg", "png"])(
    "never follows TIFF offsets into following envelope bytes: %s",
    (format) => {
      const data = tiff();
      new DataView(data.buffer).setUint32(4, data.length, true);
      const bytes =
        format === "jpeg"
          ? jpeg(join(exif(data), segment(254, tiff())))
          : png(join(chunk("eXIf", data), chunk("tEXt", tiff())));
      expect(check(bytes)).toEqual({ ok: false, code: "TIFF_ORIENTATION_MALFORMED" });
    },
  );
  it("passes107 type/count/value/work-limit errors without exposing content", () => {
    const data = tiff(9);
    expect(check(jpeg(exif(data)))).toEqual({ ok: false, code: "TIFF_ORIENTATION_MALFORMED" });
    const v = new DataView(data.buffer);
    v.setUint16(12, 6, true);
    expect(check(jpeg(exif(data)))).toEqual({
      ok: false,
      code: "TIFF_ORIENTATION_UNSUPPORTED_TYPE",
    });
    v.setUint16(8, 257, true);
    expect(check(jpeg(exif(data)))).toEqual({ ok: false, code: "TIFF_ORIENTATION_SCAN_LIMIT" });
  });
  it.each(["jpeg", "png"])("rejects an empty profile in %s", (format) => {
    expect(check(format === "jpeg" ? jpeg(exif(raw())) : png(chunk("eXIf")))).toEqual({
      ok: false,
      code: "TIFF_ORIENTATION_INVALID_INPUT",
    });
  });
  it("keeps primary rather than thumbnail orientation and retains PARTIAL", () => {
    const data = join(tiff(2), tiff(8).subarray(8));
    new DataView(data.buffer).setUint32(22, 26, true);
    expect(check(jpeg(exif(data)))).toMatchObject({ value: 2, profileValidation: "PARTIAL" });
  });
  it("checks104 first and uses same backing bytes with an exact no-copy TIFF view", () => {
    const data = jpeg(exif());
    const backing = join(raw(99, 98), data, raw(97));
    const bytes = backing.subarray(2, backing.length - 1);
    const before = bytes.slice();
    const tag = vi.spyOn(tagReader, "inspectTiffOrientation");
    const preflight = vi.spyOn(inputReader, "inspectRoomBackgroundInput");
    const result = check(bytes);
    expect(preflight).toHaveBeenCalledTimes(1);
    expect(tag).toHaveBeenCalledTimes(1);
    expect(preflight.mock.invocationCallOrder[0]).toBeLessThan(tag.mock.invocationCallOrder[0]);
    const profile = (tag.mock.calls[0][0] as { bytes: Uint8Array }).bytes;
    expect(profile.buffer).toBe(bytes.buffer);
    expect(profile.byteOffset).toBe(bytes.byteOffset + 12);
    expect(profile.byteLength).toBe(26);
    expect(bytes).toEqual(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(
      Object.values(result).every((value) => value === null || typeof value !== "object"),
    ).toBe(true);
    bytes.fill(0);
    expect(result).toMatchObject({ value: 6 });
  });
  it("captures caller getters once, ignores shadow methods, and sees last getter mutations", () => {
    const bytes = jpeg(exif());
    const trap = vi.fn(() => {
      throw new Error("private data");
    });
    for (const key of ["buffer", "byteOffset", "byteLength", "slice", "subarray"])
      Object.defineProperty(bytes, key, { get: trap });
    Object.defineProperty(bytes, Symbol.iterator, { get: trap });
    const getBytes = vi.fn(() => bytes);
    const edge = vi.fn(() => 10000);
    const budget = vi.fn(() => ({
      get maxEdge() {
        return edge();
      },
    }));
    expect(
      inspect({
        get bytes() {
          return getBytes();
        },
        get budget() {
          return budget();
        },
      }),
    ).toMatchObject({ ok: true, value: 6 });
    expect(getBytes).toHaveBeenCalledTimes(1);
    expect(edge).toHaveBeenCalledTimes(1);
    expect(budget).toHaveBeenCalledTimes(1);
    expect(trap).not.toHaveBeenCalled();
    const mutated = jpeg(exif());
    expect(
      inspect({
        bytes: mutated,
        budget: {
          get maxEdge() {
            mutated[0] = 0;
            return 10000;
          },
        },
      }),
    ).toEqual(fail("UNSUPPORTED_FORMAT"));
  });
  it.each(["bytes", "budget", "maxEdge"])("contains a throwing %s getter", (key) => {
    const request = { bytes: jpeg(), budget: { maxEdge: 10000 } };
    Object.defineProperty(key === "maxEdge" ? request.budget : request, key, {
      get() {
        throw new Error("private");
      },
    });
    expect(inspect(request)).toEqual(fail("INVALID_INPUT"));
  });
  it.each([
    null,
    undefined,
    1,
    [],
    {},
    { bytes: jpeg(), budget: [] },
    { bytes: jpeg(), budget: null },
  ])("rejects malformed request", (value) => expect(inspect(value)).toEqual(fail("INVALID_INPUT")));
  it.each([undefined, 0, -1, 1.5, NaN, Infinity, "10000", 40_000_001])(
    "rejects invalid budget%s",
    (edge) => {
      expect(inspect({ bytes: jpeg(), budget: { maxEdge: edge } })).toEqual(fail("INVALID_INPUT"));
    },
  );
  it("inherits104 brand and detached/shared/resizable rejection", () => {
    class Other extends Uint8Array {}
    const detached = jpeg();
    structuredClone(detached.buffer, { transfer: [detached.buffer] });
    for (const value of [
      raw(),
      new Proxy(jpeg(), {}),
      Buffer.from(jpeg()),
      new Other(26),
      runInNewContext("new Uint8Array(26)"),
      new Uint8Array(new SharedArrayBuffer(26)),
      new Uint8Array(Reflect.construct(ArrayBuffer, [26, { maxByteLength: 30 }])),
      detached,
    ]) {
      expect(check(value)).toEqual(fail("INVALID_INPUT"));
    }
  });
  it("inherits CRC/animation and size gates before tag reading", () => {
    const reader = vi.spyOn(tagReader, "inspectTiffOrientation");
    const broken = png(chunk("eXIf", tiff()));
    broken[broken.length - 1] ^= 1;
    expect(check(broken)).toEqual(fail("MALFORMED_INPUT"));
    expect(check(png(join(chunk("acTL", raw(0)), chunk("eXIf", tiff()))))).toEqual(
      fail("ANIMATED_INPUT"),
    );
    expect(check(jpeg(exif(), 4, 2), 3)).toEqual(fail("EDGE_LIMIT"));
    expect(check(jpeg(exif(), 10000, 4001))).toEqual(fail("PIXEL_LIMIT"));
    expect(check(new Uint8Array(20_000_001))).toEqual(fail("BYTE_LIMIT"));
    expect(reader).not.toHaveBeenCalled();
    expect(check(jpeg(exif(), 10000, 4000))).toMatchObject({ ok: true, encodedPixels: 40_000_000 });
  });
  it("accepts exactly20M input bytes without a copy or decode", () => {
    const bytes = jpeg(raw(), 3, 2, new Uint8Array(20_000_000 - 27));
    expect(bytes.byteLength).toBe(20_000_000);
    expect(check(bytes)).toMatchObject({ ok: true, byteLength: 20_000_000, decodeAllowed: false });
  });
  it.each(["jpeg", "png"])("keeps4096 envelope units and rejects4097: %s", (format) => {
    const units = Array.from({ length: format === "jpeg" ? 4092 : 4093 }, () =>
      format === "jpeg" ? segment(224) : chunk("tEXt"),
    );
    const build = (parts: Uint8Array[]) =>
      format === "jpeg" ? jpeg(join(...parts)) : png(join(...parts));
    expect(check(build(units))).toMatchObject({ ok: true });
    units.push(units[0]);
    expect(check(build(units))).toEqual(fail("SCAN_LIMIT"));
  });
  it("has no browser I/O at import or while locating", async () => {
    const io = vi.fn(() => {
      throw new Error("unexpected I/O");
    });
    for (const name of [
      "Blob",
      "FileReader",
      "Image",
      "fetch",
      "createImageBitmap",
      "OffscreenCanvas",
    ])
      vi.stubGlobal(name, io);
    vi.stubGlobal("document", { createElement: io });
    vi.spyOn(URL, "createObjectURL").mockImplementation(io);
    vi.resetModules();
    const fresh = await import("./background-container");
    expect(
      fresh.inspectRoomBackgroundContainer({ bytes: jpeg(exif()), budget: { maxEdge: 10000 } }),
    ).toMatchObject({ value: 6 });
    expect(io).not.toHaveBeenCalled();
  });
});
