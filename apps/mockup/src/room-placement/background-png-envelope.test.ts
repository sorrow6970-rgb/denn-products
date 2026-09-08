import { describe, expect, it } from "vitest";
import { inspectRoomBackgroundInput as inspect } from "./background-input";

const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const fail = (code: string) => ({ ok: false, code: `ROOM_BACKGROUND_${code}` });
function join(...parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.length;
  }
  return bytes;
}
function chunk(type: string, data = new Uint8Array(0)): Uint8Array {
  const out = new Uint8Array(data.length + 12);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  let value = 0xffffffff;
  for (const c of out.subarray(4, out.length - 4)) {
    value ^= c;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  view.setUint32(out.length - 4, (value ^ 0xffffffff) >>> 0);
  return out;
}
function header(w = 3, h = 2, color = 6, depth = 8, interlace = 0): Uint8Array {
  const bytes = new Uint8Array(13);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, w);
  view.setUint32(4, h);
  bytes.set([depth, color, 0, 0, interlace], 8);
  return chunk("IHDR", bytes);
}
const data = () => chunk("IDAT", new Uint8Array([123])); // deliberately NOT a zlib stream
const end = () => chunk("IEND");
const check = (...parts: Uint8Array[]) =>
  inspect({ bytes: join(signature, ...parts), budget: { maxEdge: 40_000_000 } });

describe("spec104 PNG envelope (CRC is not inflate/decode proof)", () => {
  it("accepts a minimal envelope but never approves decode or orientation", () => {
    expect(check(header(), data(), end())).toMatchObject({
      ok: true,
      format: "png",
      decodeAllowed: false,
      orientation: "NOT_VERIFIED",
    });
    expect(Array.from(end().subarray(8))).toEqual([174, 66, 96, 130]); // independent known IEND CRC
  });
  it.each([
    [0, 1],
    [0, 2],
    [0, 4],
    [0, 8],
    [0, 16],
    [2, 8],
    [2, 16],
    [3, 1],
    [3, 2],
    [3, 4],
    [3, 8],
    [4, 8],
    [4, 16],
    [6, 8],
    [6, 16],
  ])("accepts color/depth %i/%i including interlace", (color, depth) => {
    const palette = color === 3 ? [chunk("PLTE", new Uint8Array(3))] : [];
    expect(check(header(3, 2, color, depth, 1), ...palette, data(), end()).ok).toBe(true);
  });
  it.each([
    [1, 8],
    [2, 4],
    [3, 16],
    [4, 1],
    [6, 2],
    [0, 3],
  ])("rejects color/depth %i/%i", (c, d) => {
    expect(check(header(3, 2, c, d), data(), end())).toEqual(fail("MALFORMED_INPUT"));
  });
  it.each([
    [0, 2],
    [3, 0],
    [0x80000000, 1],
  ])("rejects malformed dimensions %i/%i", (w, h) => {
    expect(check(header(w, h), data(), end())).toEqual(fail("MALFORMED_INPUT"));
  });
  it("applies exact pixel and required edge budgets", () => {
    expect(check(header(8000, 5000), data(), end()).ok).toBe(true);
    expect(check(header(8000, 5001), data(), end())).toEqual(fail("PIXEL_LIMIT"));
    expect(
      inspect({
        bytes: join(signature, header(8000, 5001), data(), end()),
        budget: { maxEdge: 7999 },
      }),
    ).toEqual(fail("EDGE_LIMIT"));
  });
  it("rejects every truncated prefix (including missing IEND) safely", () => {
    const bytes = join(signature, header(), data(), end());
    for (let n = 0; n < bytes.length; n++) {
      expect(inspect({ bytes: bytes.subarray(0, n), budget: { maxEdge: 8000 } }).ok).toBe(false);
    }
  });
  it("rejects corrupted CRC in every chunk", () => {
    for (let i = 0; i < 3; i++) {
      const parts = [header(), data(), end()];
      parts[i][parts[i].length - 1] ^= 1;
      expect(check(...parts)).toEqual(fail("MALFORMED_INPUT"));
    }
  });
  it.each(["acTL", "fcTL", "fdAT"])("rejects %s before/after data and before IHDR", (type) => {
    const animation = chunk(type, new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1]));
    expect(check(header(), animation, data(), end())).toEqual(fail("ANIMATED_INPUT"));
    expect(check(header(), data(), animation, end())).toEqual(fail("ANIMATED_INPUT"));
    expect(check(animation, header(), data(), end())).toEqual(fail("ANIMATED_INPUT"));
  });
  it("enforces IHDR/IDAT/IEND uniqueness, ordering, lengths and consumption", () => {
    const cases = [
      [data(), end()],
      [header(), header(), data(), end()],
      [header(), end()],
      [header(), chunk("IDAT"), end()],
      [header(), data(), chunk("tEXt"), data(), end()],
      [header(), data(), chunk("IEND", new Uint8Array(1))],
      [header(), data(), end(), end()],
      [chunk("IHDR", new Uint8Array(12)), data(), end()],
    ];
    for (const parts of cases) expect(check(...parts)).toEqual(fail("MALFORMED_INPUT"));
    expect(check(header(), chunk("IDAT"), data(), chunk("IDAT"), end()).ok).toBe(true);
  });
  it("validates palette restrictions and optional truecolor palette", () => {
    const palette = chunk("PLTE", new Uint8Array(3));
    expect(check(header(3, 2, 2), palette, data(), end()).ok).toBe(true);
    for (const parts of [
      [header(3, 2, 3, 1), data(), end()],
      [header(3, 2, 0), palette, data(), end()],
      [header(), palette, palette, data(), end()],
      [header(), data(), palette, end()],
      [header(), chunk("PLTE", new Uint8Array(4)), data(), end()],
      [header(), chunk("PLTE", new Uint8Array(771)), data(), end()],
      [header(3, 2, 3, 1), chunk("PLTE", new Uint8Array(9)), data(), end()],
    ])
      expect(check(...parts)).toEqual(fail("MALFORMED_INPUT"));
  });
  it("bounds lengths, type syntax, reserved bit and unsupported critical chunks", () => {
    const huge = data();
    new DataView(huge.buffer).setUint32(0, 0xffffffff);
    expect(check(header(), huge, end())).toEqual(fail("MALFORMED_INPUT"));
    for (const type of ["tExt", "t1Xt"]) {
      expect(check(header(), chunk(type), data(), end())).toEqual(fail("MALFORMED_INPUT"));
    }
    expect(check(header(), chunk("ABCD"), data(), end())).toEqual(fail("UNSUPPORTED_STRUCTURE"));
    expect(check(header(), chunk("eXIf", new Uint8Array([1, 2, 3])), data(), end())).toMatchObject({
      ok: true,
      orientation: "NOT_VERIFIED",
      decodeAllowed: false,
    });
  });
  it("bounds structure count including IEND without recursive scans", () => {
    const extra = chunk("tEXt");
    expect(check(header(), ...Array.from({ length: 4093 }, () => extra), data(), end()).ok).toBe(
      true,
    );
    expect(check(header(), ...Array.from({ length: 4094 }, () => extra), data(), end())).toEqual(
      fail("SCAN_LIMIT"),
    );
  });
  it("checks header CRC before declared size and declared size before later errors", () => {
    const corrupt = header(8000, 5001);
    corrupt[corrupt.length - 1] ^= 1;
    expect(check(corrupt, data(), end())).toEqual(fail("MALFORMED_INPUT"));
    expect(check(header(8000, 5001), chunk("acTL"), end())).toEqual(fail("PIXEL_LIMIT"));
  });
});
