import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { inspectRoomBackgroundInput as inspect } from "./background-input";

const jpeg = () =>
  new Uint8Array([
    255, 216, 255, 192, 0, 11, 8, 0, 2, 0, 3, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 17,
    255, 217,
  ]);
const check = (bytes: unknown, maxEdge: unknown = 8000) => inspect({ bytes, budget: { maxEdge } });
const fail = (code: string) => ({ ok: false, code: `ROOM_BACKGROUND_${code}` });

function paddedJpeg(size: number): Uint8Array {
  const base = jpeg();
  const bytes = new Uint8Array(size);
  bytes.set(base.subarray(0, 2));
  let at = 2;
  let remaining = size - base.length;
  while (remaining > 0) {
    let segment = Math.min(remaining, 65537);
    if (remaining > segment && remaining - segment < 4) segment -= 4;
    bytes.set([255, 254, (segment - 2) >> 8, (segment - 2) & 255], at);
    at += segment;
    remaining -= segment;
  }
  bytes.set(base.subarray(2), at);
  return bytes;
}

describe("spec104 public preflight only (not decoding or orientation proof)", () => {
  it("returns frozen scalars, retains no bytes and never authorizes decode", () => {
    const bytes = jpeg();
    const before = bytes.slice();
    const result = check(bytes);
    expect(result).toEqual({
      ok: true,
      kind: "preflight-only",
      format: "jpeg",
      byteLength: 28,
      encodedWidth: 3,
      encodedHeight: 2,
      encodedPixels: 6,
      orientation: "NOT_VERIFIED",
      decodeAllowed: false,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(bytes).toEqual(before);
    bytes.fill(0);
    expect(result.ok && result.encodedWidth).toBe(3);
    expect(Object.values(result).every((v) => typeof v !== "object")).toBe(true);
  });

  it.each([null, undefined, 1, "x", [], {}, { budget: [] }])(
    "rejects invalid request %j",
    (input) => {
      expect(inspect(input)).toEqual(fail("INVALID_INPUT"));
    },
  );
  it.each([undefined, null, 0, -1, 1.5, NaN, Infinity, "8000", 40_000_001])(
    "rejects invalid maxEdge %j without a default",
    (maxEdge) => {
      expect(inspect({ bytes: jpeg(), budget: { maxEdge } })).toEqual(fail("INVALID_INPUT"));
    },
  );
  it.each(["bytes", "budget", "maxEdge"])(
    "reads %s only once and contains thrown details",
    (key) => {
      const getter = vi.fn(() => {
        throw new Error("private photo name");
      });
      const request = { bytes: jpeg(), budget: { maxEdge: 8000 } };
      Object.defineProperty(key === "maxEdge" ? request.budget : request, key, { get: getter });
      expect(inspect(request)).toEqual(fail("INVALID_INPUT"));
      expect(getter).toHaveBeenCalledTimes(1);
    },
  );
  it("snapshots all request getters once before reading bytes", () => {
    const bytes = jpeg();
    const getters = [
      vi.fn(() => bytes),
      vi.fn(() => ({
        get maxEdge() {
          return edge();
        },
      })),
    ];
    const edge = vi.fn(() => 8000);
    expect(
      inspect({
        get bytes() {
          return getters[0]();
        },
        get budget() {
          return getters[1]();
        },
      }).ok,
    ).toBe(true);
    expect(getters[0]).toHaveBeenCalledTimes(1);
    expect(getters[1]).toHaveBeenCalledTimes(1);
    expect(edge).toHaveBeenCalledTimes(1);
  });
  it("sees detachment performed by the last external getter", () => {
    const bytes = jpeg();
    expect(
      inspect({
        bytes,
        budget: {
          get maxEdge() {
            structuredClone(bytes.buffer, { transfer: [bytes.buffer] });
            return 8000;
          },
        },
      }),
    ).toEqual(fail("INVALID_INPUT"));
  });
  it("rejects Proxy without running its prototype/property traps", () => {
    const trap = vi.fn(() => {
      throw new Error("trap");
    });
    const proxy = new Proxy(jpeg(), { get: trap, getPrototypeOf: trap });
    expect(check(proxy)).toEqual(fail("INVALID_INPUT"));
    expect(trap).not.toHaveBeenCalled();
  });
  it("rejects impostors, other brands, subclasses, shared, resizable and detached views", () => {
    class Sub extends Uint8Array {}
    const detached = jpeg();
    structuredClone(detached.buffer, { transfer: [detached.buffer] });
    const impostor = new Uint16Array(10);
    Object.setPrototypeOf(impostor, Uint8Array.prototype);
    const inputs = [
      Object.create(Uint8Array.prototype),
      new Uint16Array(10),
      new DataView(new ArrayBuffer(10)),
      new Sub(jpeg()),
      Buffer.from(jpeg()),
      runInNewContext("new Uint8Array([255,216])"),
      new Uint8Array(new SharedArrayBuffer(28)),
      new Uint8Array(Reflect.construct(ArrayBuffer, [28, { maxByteLength: 56 }])),
      detached,
      impostor,
    ];
    for (const input of inputs) expect(check(input)).toEqual(fail("INVALID_INPUT"));
  });
  it("ignores shadowed getters, iterators and copy methods", () => {
    const bytes = jpeg();
    const trap = vi.fn(() => {
      throw new Error("must not run");
    });
    for (const key of ["buffer", "byteOffset", "byteLength", "length", "slice", "subarray"]) {
      Object.defineProperty(bytes, key, { get: trap });
    }
    Object.defineProperty(bytes, Symbol.iterator, { get: trap });
    Object.defineProperty(bytes, Symbol.toStringTag, { get: trap });
    expect(check(bytes).ok).toBe(true);
    expect(trap).not.toHaveBeenCalled();
  });
  it("inspects only the offset view, not adjacent backing bytes", () => {
    const bytes = new Uint8Array(40).fill(123);
    bytes.set(jpeg(), 5);
    expect(check(bytes.subarray(5, 33)).ok).toBe(true);
    expect(check(bytes.subarray(5, 32))).toEqual(fail("MALFORMED_INPUT"));
    expect(check(bytes)).toEqual(fail("UNSUPPORTED_FORMAT"));
  });
  it("enforces empty and byte cap before format inspection", () => {
    expect(check(new Uint8Array(0))).toEqual(fail("INVALID_INPUT"));
    expect(check(new Uint8Array(20_000_001))).toEqual(fail("BYTE_LIMIT"));
    expect(check(paddedJpeg(20_000_000)).ok).toBe(true);
  });
  it.each([
    [8000, 5000, true],
    [8000, 5001, false],
  ])("checks %i x %i pixels", (w, h, ok) => {
    const bytes = jpeg();
    bytes.set([h >> 8, h & 255, w >> 8, w & 255], 7);
    const result = check(bytes);
    expect(result.ok).toBe(ok);
    if (!ok) expect(result).toEqual(fail("PIXEL_LIMIT"));
  });
  it("checks inclusive edge and edge before pixel failure", () => {
    expect(check(jpeg(), 3).ok).toBe(true);
    expect(check(jpeg(), 2)).toEqual(fail("EDGE_LIMIT"));
    const bytes = jpeg();
    bytes.set([255, 255, 255, 255], 7);
    expect(check(bytes, 8000)).toEqual(fail("EDGE_LIMIT"));
  });
  it.each(["GIF89a", "RIFFabcdWEBP", "<svg>", "ftypheic", "not-a-photo"])(
    "rejects unsupported signature %s even with a misleading MIME",
    (text) => {
      expect(
        inspect({
          bytes: new TextEncoder().encode(text),
          budget: { maxEdge: 10 },
          type: "image/png",
        }),
      ).toEqual(fail("UNSUPPORTED_FORMAT"));
    },
  );
  it("has no browser/network/log calls on success or failure, including import", async () => {
    const forbidden = vi.fn(() => {
      throw new Error("forbidden");
    });
    const log = vi.spyOn(console, "log").mockImplementation(forbidden);
    const error = vi.spyOn(console, "error").mockImplementation(forbidden);
    const warn = vi.spyOn(console, "warn").mockImplementation(forbidden);
    const createUrl = vi.spyOn(URL, "createObjectURL").mockImplementation(forbidden);
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(forbidden);
    for (const name of ["fetch", "File", "Blob", "Image", "document", "createImageBitmap"]) {
      vi.stubGlobal(name, forbidden);
    }
    try {
      vi.resetModules();
      const module = await import("./background-input");
      expect(
        module.inspectRoomBackgroundInput({ bytes: jpeg(), budget: { maxEdge: 8000 } }).ok,
      ).toBe(true);
      expect(module.inspectRoomBackgroundInput(null)).toEqual(fail("INVALID_INPUT"));
      expect(forbidden).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      log.mockRestore();
      error.mockRestore();
      warn.mockRestore();
      createUrl.mockRestore();
      revokeUrl.mockRestore();
    }
  });
});
