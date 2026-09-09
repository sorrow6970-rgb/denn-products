import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { inspectTiffOrientation as inspect } from "./background-orientation";

function profile(
  value = 1,
  little = true,
  count = 1,
  first = 8,
  size = first + 2 + count * 12 + 4,
) {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  bytes.set(little ? [73, 73] : [77, 77]);
  view.setUint16(2, 42, little);
  view.setUint32(4, first, little);
  view.setUint16(first, count, little);
  for (let i = 0; i < count; i++) {
    const at = first + 2 + i * 12;
    view.setUint16(at, count === 1 ? 274 : i + 1, little);
    view.setUint16(at + 2, 3, little);
    view.setUint32(at + 4, 1, little);
    view.setUint16(at + 8, value, little);
  }
  return bytes;
}
const check = (bytes: unknown) => inspect({ bytes });
const fail = (suffix: string) => ({ ok: false, code: `TIFF_ORIENTATION_${suffix}` });
const expected = (value: number | null) => ({
  ok: true,
  kind: "orientation-tag-only",
  presence: value === null ? "absent" : "present",
  value,
  imageOrientation: "NOT_VERIFIED",
  profileValidation: "PARTIAL",
  decodeAllowed: false,
});

describe("spec107 partial TIFF 0th IFD evidence, never image/decode proof", () => {
  it.each(
    [true, false].flatMap((little) =>
      Array.from({ length: 8 }, (_, i) => [little, i + 1] as const),
    ),
  )("reads endian %s orientation %i", (little, value) =>
    expect(check(profile(value, little))).toEqual(expected(value)),
  );
  it("distinguishes absence from explicit1 and does not manufacture a default", () => {
    expect(check(profile(1, true, 0))).toEqual(expected(null));
    expect(check(profile())).toEqual(expected(1));
  });
  it("retains no bytes, mutates none, and freezes scalar evidence", () => {
    const bytes = profile(8);
    const before = bytes.slice();
    const result = check(bytes);
    expect(bytes).toEqual(before);
    expect(Object.isFrozen(result)).toBe(true);
    bytes.fill(0);
    expect(result).toEqual(expected(8));
    expect(Object.values(result).every((x) => x === null || typeof x !== "object")).toBe(true);
    expect(Object.isFrozen(check(null))).toBe(true);
  });
  it("accepts a padded first IFD and a subview without reading outside it", () => {
    const data = profile(7, false, 1, 16);
    const backing = new Uint8Array(data.length + 6).fill(255);
    backing.set(data, 3);
    expect(check(backing.subarray(3, 3 + data.length))).toEqual(expected(7));
    expect(check(backing.subarray(3, 3 + data.length - 1))).toEqual(fail("MALFORMED"));
  });
  it.each([undefined, null, [], 1, "x", {}, new Uint16Array(20), new DataView(new ArrayBuffer(8))])(
    "rejects invalid bytes %s",
    (value) => expect(check(value)).toEqual(fail("INVALID_INPUT")),
  );
  it.each([null, undefined, [], 1, "x"])("rejects request %s", (value) => {
    expect(inspect(value)).toEqual(fail("INVALID_INPUT"));
  });
  it("captures getter once, contains exceptions, ignores shadow metadata/methods", () => {
    const bytes = profile(2);
    const getter = vi.fn(() => bytes);
    const trap = vi.fn(() => {
      throw new Error("private metadata");
    });
    for (const key of ["buffer", "byteOffset", "byteLength", "slice", "subarray"]) {
      Object.defineProperty(bytes, key, { get: trap });
    }
    Object.defineProperty(bytes, Symbol.iterator, { get: trap });
    expect(
      inspect({
        get bytes() {
          return getter();
        },
      }),
    ).toEqual(expected(2));
    expect(getter).toHaveBeenCalledTimes(1);
    expect(trap).not.toHaveBeenCalled();
    expect(
      inspect({
        get bytes() {
          return trap();
        },
      }),
    ).toEqual(fail("INVALID_INPUT"));
  });
  it("rejects proxy, subclass, foreign realm, shared, resizable and detached inputs", () => {
    class Other extends Uint8Array {}
    const detached = profile();
    structuredClone(detached.buffer, { transfer: [detached.buffer] });
    const invalid = [
      new Proxy(profile(), {}),
      new Other(26),
      Buffer.from(profile()),
      runInNewContext("new Uint8Array(26)"),
      new Uint8Array(new SharedArrayBuffer(26)),
      new Uint8Array(Reflect.construct(ArrayBuffer, [26, { maxByteLength: 30 }])),
      detached,
    ];
    for (const value of invalid) expect(check(value)).toEqual(fail("INVALID_INPUT"));
  });
  it("enforces byte limit before signature scanning", () => {
    const bytes = profile(1, true, 1, 8, 20_000_000);
    expect(check(bytes)).toEqual(expected(1));
    expect(check(new Uint8Array(20_000_001))).toEqual(fail("BYTE_LIMIT"));
  });
  it.each(Array.from({ length: 26 }, (_, i) => i))("rejects truncation at byte%i", (size) => {
    expect(check(profile().subarray(0, size))).toEqual(
      fail(size === 0 ? "INVALID_INPUT" : "MALFORMED"),
    );
  });
  it.each([0, 9, 65535])("rejects reserved orientation%i", (value) => {
    expect(check(profile(value))).toEqual(fail("MALFORMED"));
  });
  it.each([0, 7, 25, 0xffffffff])("bounds first IFD offset%i", (offset) => {
    const bytes = profile();
    new DataView(bytes.buffer).setUint32(4, offset, true);
    expect(check(bytes)).toEqual(fail("MALFORMED"));
  });
  it.each([
    [0, 0],
    [1, 77],
    [2, 43],
  ])("rejects header mutation %i/%i", (at, value) => {
    const bytes = profile();
    bytes[at] = value;
    expect(check(bytes)).toEqual(fail("MALFORMED"));
  });
  it.each([0, 2, 0xffffffff])("rejects orientation count%i", (count) => {
    const bytes = profile();
    new DataView(bytes.buffer).setUint32(14, count, true);
    expect(check(bytes)).toEqual(fail("MALFORMED"));
  });
  it("rejects wrong known orientation type and unsupported field type", () => {
    const bytes = profile();
    const v = new DataView(bytes.buffer);
    v.setUint16(12, 4, true);
    expect(check(bytes)).toEqual(fail("MALFORMED"));
    v.setUint16(12, 6, true);
    expect(check(bytes)).toEqual(fail("UNSUPPORTED_TYPE"));
  });
  it("enforces256 fields, rejects257 and unsorted/duplicate fields", () => {
    expect(check(profile(1, true, 256))).toEqual(expected(null));
    expect(check(profile(1, true, 257))).toEqual(fail("SCAN_LIMIT"));
    const bytes = profile(1, true, 2);
    const v = new DataView(bytes.buffer);
    v.setUint16(22, 1, true);
    expect(check(bytes)).toEqual(fail("MALFORMED"));
    v.setUint16(22, 0, true);
    expect(check(bytes)).toEqual(fail("MALFORMED"));
  });
  it.each([1, 2, 3, 4, 5, 7, 9, 10, 129])(
    "checks storage type%i without interpreting its content",
    (type) => {
      const bytes = profile(1, true, 1, 8, 34);
      const v = new DataView(bytes.buffer);
      v.setUint16(10, 200, true);
      v.setUint16(12, type, true);
      v.setUint32(18, 26, true);
      expect(check(bytes)).toEqual(expected(null));
    },
  );
  it.each([0, 7, 8, 20, 27, 0xffffffff])("rejects invalid external storage offset%i", (at) => {
    const bytes = profile(1, true, 1, 8, 34);
    const v = new DataView(bytes.buffer);
    v.setUint16(10, 200, true);
    v.setUint16(12, 5, true);
    v.setUint32(18, at, true);
    expect(check(bytes)).toEqual(fail("MALFORMED"));
  });
  it("accepts value storage before a padded IFD without overlapping its directory", () => {
    const bytes = profile(1, false, 1, 16);
    const v = new DataView(bytes.buffer);
    v.setUint16(18, 200);
    v.setUint16(20, 5);
    v.setUint32(26, 8);
    expect(check(bytes)).toEqual(expected(null));
  });
  it.each([1, 7, 8, 21, 25, 0xffffffff])("bounds next IFD offset%i", (next) => {
    const bytes = profile();
    new DataView(bytes.buffer).setUint32(22, next, true);
    expect(check(bytes)).toEqual(fail("MALFORMED"));
  });
  it("does not walk thumbnail or other pointer graphs; evidence explicitly remains PARTIAL", () => {
    const bytes = profile(6, true, 1, 8, 28);
    const v = new DataView(bytes.buffer);
    v.setUint32(22, 26, true);
    v.setUint16(26, 65535, true);
    expect(check(bytes)).toEqual(expected(6));
    v.setUint16(10, 34665, true);
    v.setUint16(12, 4, true);
    v.setUint32(18, 0xffffffff, true);
    expect(check(bytes)).toEqual(expected(null));
  });
  it("rejects a next IFD count overlapping the first directory by one byte", () => {
    const bytes = profile(1, true, 1, 16);
    new DataView(bytes.buffer).setUint32(30, 15, true);
    expect(check(bytes)).toEqual(fail("MALFORMED"));
  });
  it("performs no browser I/O at import or while inspecting", async () => {
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
    ]) {
      vi.stubGlobal(name, io);
    }
    vi.stubGlobal("document", { createElement: io });
    const url = vi.spyOn(URL, "createObjectURL").mockImplementation(io);
    try {
      vi.resetModules();
      const fresh = await import("./background-orientation");
      expect(fresh.inspectTiffOrientation({ bytes: profile() })).toEqual(expected(1));
      expect(io).not.toHaveBeenCalled();
    } finally {
      url.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
