import { describe, expect, it } from "vitest";
import { computeRoomPlacement, roomPointFromClient } from "./geometry";

const input = () => ({
  viewport: { width: 400, height: 400 },
  background: { width: 800, height: 400 },
  placement: { u: 0.5, v: 0.5, widthRatio: 0.25, aspect: 2 },
});
const point = () => ({
  ...input(),
  clientRect: { x: 10, y: 20, width: 200, height: 200 },
  client: { x: 110, y: 120 },
});
const invalid = { ok: false, code: "ROOM_INVALID_INPUT" };

describe("room reference geometry", () => {
  it("contains a square background and keeps numeric-limit results finite and bounded", () => {
    expect(
      computeRoomPlacement({ ...input(), background: { width: 400, height: 400 } }),
    ).toMatchObject({ value: { backgroundRect: { x: 0, y: 0, width: 400, height: 400 } } });
    for (const width of [1, 400, 1_000_000]) {
      for (const height of [1, 800, 1_000_000]) {
        const aspect = width / height;
        const result = computeRoomPlacement({
          viewport: { width: height, height: width },
          background: { width, height },
          placement: { u: 0, v: 1, widthRatio: 0.000001, aspect },
        });
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("setup");
        const { frameRect: f, backgroundRect: b } = result.value;
        expect(Object.values(f).every(Number.isFinite)).toBe(true);
        expect(f.width).toBeGreaterThan(0);
        expect(f.height).toBeGreaterThan(0);
        expect(f.x).toBeGreaterThanOrEqual(b.x - 1e-8);
        expect(f.y + f.height).toBeLessThanOrEqual(b.y + b.height + 1e-8);
      }
    }
  });
  it("contains a landscape background and uses image-relative frame dimensions", () => {
    const source = input();
    const before = JSON.stringify(source);
    expect(computeRoomPlacement(source)).toEqual({
      ok: true,
      value: {
        backgroundRect: { x: 0, y: 100, width: 400, height: 200 },
        frameRect: { x: 150, y: 175, width: 100, height: 50 },
        placement: source.placement,
      },
    });
    expect(JSON.stringify(source)).toBe(before);
  });
  it("contains a portrait background without swapping axes", () => {
    const result = computeRoomPlacement({ ...input(), background: { width: 400, height: 800 } });
    expect(result).toMatchObject({
      value: {
        backgroundRect: { x: 100, y: 0, width: 200, height: 400 },
        frameRect: { x: 175, y: 187.5, width: 50, height: 25 },
      },
    });
  });
  it("clamps the complete frame and reports the applied normalized centre", () => {
    const source = input();
    for (const edge of [0, 1]) {
      const result = computeRoomPlacement({
        ...source,
        placement: { ...source.placement, u: edge, v: edge },
      });
      expect(result).toMatchObject({
        value: {
          placement: { u: edge === 0 ? 0.125 : 0.875, v: edge === 0 ? 0.125 : 0.875 },
          frameRect: { x: edge === 0 ? 0 : 300, y: edge === 0 ? 100 : 250 },
        },
      });
    }
    expect(source.placement.u).toBe(0.5);
  });
  it("accepts an exact fit and rejects too-tall frames without shrinking", () => {
    const source = input();
    expect(
      computeRoomPlacement({ ...source, placement: { u: 0, v: 1, widthRatio: 1, aspect: 2 } }),
    ).toMatchObject({ value: { frameRect: { x: 0, y: 100, width: 400, height: 200 } } });
    expect(
      computeRoomPlacement({ ...source, placement: { ...source.placement, aspect: 0.1 } }),
    ).toEqual({ ok: false, code: "ROOM_FRAME_TOO_LARGE" });
  });
  it("preserves normalized placement and aspect across different viewport ratios", () => {
    const source = input();
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 1280, height: 800 },
    ]) {
      const result = computeRoomPlacement({ ...source, viewport });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("setup");
      const { backgroundRect: bg, frameRect: frame, placement } = result.value;
      expect(placement).toEqual(source.placement);
      expect(frame.width / frame.height).toBeCloseTo(2);
      expect((frame.x + frame.width / 2 - bg.x) / bg.width).toBeCloseTo(0.5);
      expect((frame.y + frame.height / 2 - bg.y) / bg.height).toBeCloseTo(0.5);
    }
  });
  it.each([0, -1, 1_000_001, NaN, Infinity, "400", null])("rejects viewport width %s", (width) => {
    expect(computeRoomPlacement({ ...input(), viewport: { width, height: 400 } })).toEqual(invalid);
  });
  it.each([
    { u: -0.1 },
    { v: 1.1 },
    { widthRatio: 0 },
    { widthRatio: 0.0000001 },
    { widthRatio: 1.1 },
    { aspect: 0 },
    { aspect: Infinity },
    { aspect: 1_000_001 },
  ])("rejects invalid placement %j", (patch) => {
    expect(
      computeRoomPlacement({ ...input(), placement: { ...input().placement, ...patch } }),
    ).toEqual(invalid);
  });
  it("rejects missing, arrays, throwing/revoked proxies without raw errors", () => {
    const hostile = {
      get viewport() {
        throw new Error("SECRET");
      },
    };
    const proxy = Proxy.revocable({}, {});
    proxy.revoke();
    for (const value of [null, [], {}, hostile, proxy.proxy]) {
      expect(computeRoomPlacement(value)).toEqual(invalid);
      expect(roomPointFromClient(value)).toEqual(invalid);
    }
  });
  it("reads numeric accessors once and detaches the result", () => {
    let reads = 0;
    const source = input();
    Object.defineProperty(source.placement, "u", {
      get() {
        reads++;
        return 0.5;
      },
    });
    const result = computeRoomPlacement(source);
    expect(reads).toBe(1);
    source.background.width = 999;
    expect(result).toMatchObject({ value: { backgroundRect: { width: 400, height: 200 } } });
  });
  it("maps CSS to logical to image coordinates with no backing/DPR input", () => {
    expect(roomPointFromClient(point())).toEqual({ ok: true, value: { u: 0.5, v: 0.5 } });
    expect(roomPointFromClient({ ...point(), client: { x: 10, y: 70 } })).toEqual({
      ok: true,
      value: { u: 0, v: 0 },
    });
    expect(roomPointFromClient({ ...point(), client: { x: 210, y: 170 } })).toEqual({
      ok: true,
      value: { u: 1, v: 1 },
    });
  });
  it("rejects letterbox and out-of-surface clicks", () => {
    for (const client of [
      { x: 110, y: 30 },
      { x: -1, y: 120 },
      { x: 110, y: 220 },
    ]) {
      expect(roomPointFromClient({ ...point(), client })).toEqual({
        ok: false,
        code: "ROOM_POINT_OUTSIDE",
      });
    }
  });
  it("rejects zero client rect and overflow instead of producing non-finite coordinates", () => {
    expect(
      roomPointFromClient({ ...point(), clientRect: { x: 0, y: 0, width: 0, height: 1 } }),
    ).toEqual(invalid);
    expect(
      roomPointFromClient({
        ...point(),
        client: { x: Number.MAX_VALUE, y: 0 },
        clientRect: { x: -Number.MAX_VALUE, y: 0, width: 1, height: 1 },
      }),
    ).toEqual(invalid);
  });
  it("round-trips un-clamped placement centres through a scaled CSS surface", () => {
    const source = { ...input(), placement: { ...input().placement, u: 0.3, v: 0.7 } };
    const result = computeRoomPlacement(source);
    if (!result.ok) throw new Error("setup");
    const f = result.value.frameRect;
    const mapped = roomPointFromClient({
      ...point(),
      client: {
        x: 10 + (f.x + f.width / 2) / 2,
        y: 20 + (f.y + f.height / 2) / 2,
      },
    });
    expect(mapped).toEqual({ ok: true, value: { u: 0.3, v: 0.7 } });
  });
});
