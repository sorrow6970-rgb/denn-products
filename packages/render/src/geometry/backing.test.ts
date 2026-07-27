import { describe, expect, it } from "vitest";
import { computeBackingStoreSize } from "./backing";
import type { GeometryResult } from "./types";

function val<V>(r: GeometryResult<V>): V {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.code);
  return r.value;
}

describe("computeBackingStoreSize (backing = max(1, round(css * min(dpr, cap))))", () => {
  it("CSS 320×240, DPR 1, cap 2 → 320×240 (effectiveDpr 1)", () => {
    const v = val(
      computeBackingStoreSize({ cssSize: { width: 320, height: 240 }, deviceDpr: 1, dprCap: 2 }),
    );
    expect(v.effectiveDpr).toBeCloseTo(1, 12);
    expect(v.backingSize).toEqual({ width: 320, height: 240 });
    expect(v.cssSize).toEqual({ width: 320, height: 240 });
  });

  it("DPR 2, cap 2 → 640×480", () => {
    const v = val(
      computeBackingStoreSize({ cssSize: { width: 320, height: 240 }, deviceDpr: 2, dprCap: 2 }),
    );
    expect(v.effectiveDpr).toBeCloseTo(2, 12);
    expect(v.backingSize).toEqual({ width: 640, height: 480 });
  });

  it("DPR 3.5, cap 2 → capped to 2 → 640×480", () => {
    const v = val(
      computeBackingStoreSize({ cssSize: { width: 320, height: 240 }, deviceDpr: 3.5, dprCap: 2 }),
    );
    expect(v.effectiveDpr).toBeCloseTo(2, 12);
    expect(v.backingSize).toEqual({ width: 640, height: 480 });
  });

  it("DPR 1.25 with fractional CSS rounds (round(100.5*1.25)=round(125.625)=126)", () => {
    // 100.5*1.25 = 125.625 (exact in binary) → round → 126 ; 240*1.25 = 300 → 300
    const v = val(
      computeBackingStoreSize({
        cssSize: { width: 100.5, height: 240 },
        deviceDpr: 1.25,
        dprCap: 2,
      }),
    );
    expect(v.backingSize.width).toBe(126);
    expect(v.backingSize.height).toBe(300);
  });

  it("very small positive CSS → backing floor of 1", () => {
    // 0.1 * 1 = 0.1 → round → 0 → max(1,0)=1
    const v = val(
      computeBackingStoreSize({ cssSize: { width: 0.1, height: 0.1 }, deviceDpr: 1, dprCap: 2 }),
    );
    expect(v.backingSize).toEqual({ width: 1, height: 1 });
  });

  it("cap 4 is COMPUTED but is not a product policy (recorded as an input case only)", () => {
    // DPR 3, cap 4 → effective 3 → 960×720. cap 4 is exercised, NOT declared the product cap.
    const v = val(
      computeBackingStoreSize({ cssSize: { width: 320, height: 240 }, deviceDpr: 3, dprCap: 4 }),
    );
    expect(v.effectiveDpr).toBeCloseTo(3, 12);
    expect(v.backingSize).toEqual({ width: 960, height: 720 });
  });

  it.each([
    ["zero css", { width: 0, height: 240 }, 2, 2, "NON_POSITIVE_SIZE"],
    ["negative css", { width: -320, height: 240 }, 2, 2, "NON_POSITIVE_SIZE"],
    ["zero dpr", { width: 320, height: 240 }, 0, 2, "NON_POSITIVE_DPR"],
    ["negative cap", { width: 320, height: 240 }, 2, -1, "NON_POSITIVE_DPR"],
    ["NaN dpr", { width: 320, height: 240 }, Number.NaN, 2, "NON_FINITE_INPUT"],
    ["Infinity cap", { width: 320, height: 240 }, 2, Number.POSITIVE_INFINITY, "NON_FINITE_INPUT"],
  ])("rejects %s", (_label, cssSize, deviceDpr, dprCap, code) => {
    const r = computeBackingStoreSize({ cssSize, deviceDpr, dprCap });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(code);
  });

  it("does not mutate its input", () => {
    const input = { cssSize: Object.freeze({ width: 320, height: 240 }), deviceDpr: 2, dprCap: 2 };
    expect(() => computeBackingStoreSize(input)).not.toThrow();
    expect(input.cssSize.width).toBe(320);
  });

  it("finite inputs that overflow (MAX_VALUE * dpr) → NON_FINITE_RESULT (never ok)", () => {
    const r = computeBackingStoreSize({
      cssSize: { width: Number.MAX_VALUE, height: 240 },
      deviceDpr: 2,
      dprCap: 2,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NON_FINITE_RESULT");
  });
});
