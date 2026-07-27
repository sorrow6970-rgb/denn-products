import { describe, expect, it } from "vitest";
import { computeCoverDrawRect } from "./cover";
import type { GeometryResult } from "./types";

// Numbers are checked with toBeCloseTo (tolerance), never integer snapshots; the arithmetic for
// each expected value is written in the test comments.
function val<V>(r: GeometryResult<V>): V {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.code);
  return r.value;
}
function deepFreeze<X>(o: X): X {
  if (o && typeof o === "object") {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

describe("computeCoverDrawRect — cover math", () => {
  it("equal-ratio image/zone, scale=1 → draw rect equals the zone", () => {
    // zone=200×200@(0,0), image=100×100, scale=1
    // baseScale=max(200/100,200/100)=2 → draw=200×200; maxPan=0; origin=(0,0)
    const v = val(
      computeCoverDrawRect({
        zone: { x: 0, y: 0, width: 200, height: 200 },
        image: { width: 100, height: 100 },
        transform: { scale: 1, x: 0, y: 0 },
      }),
    );
    expect(v.baseScale).toBeCloseTo(2, 12);
    expect(v.drawScale).toBeCloseTo(2, 12);
    expect(v.drawRect.x).toBeCloseTo(0, 12);
    expect(v.drawRect.y).toBeCloseTo(0, 12);
    expect(v.drawRect.width).toBeCloseTo(200, 12);
    expect(v.drawRect.height).toBeCloseTo(200, 12);
    expect(v.maxPan.x).toBeCloseTo(0, 12);
    expect(v.maxPan.y).toBeCloseTo(0, 12);
  });

  it("wide image → covers height, crops left/right", () => {
    // zone=100×100, image=200×100 → baseScale=max(100/200,100/100)=1 → draw=200×100
    // width 200>100 (crop); maxPanX=|200-100|/2=50; origin.x=(100-200)/2=-50
    const v = val(
      computeCoverDrawRect({
        zone: { x: 0, y: 0, width: 100, height: 100 },
        image: { width: 200, height: 100 },
        transform: { scale: 1, x: 0, y: 0 },
      }),
    );
    expect(v.drawRect.width).toBeCloseTo(200, 12);
    expect(v.drawRect.height).toBeCloseTo(100, 12); // height exactly covers
    expect(v.drawRect.x).toBeCloseTo(-50, 12);
    expect(v.drawRect.y).toBeCloseTo(0, 12);
    expect(v.maxPan.x).toBeCloseTo(50, 12);
    expect(v.maxPan.y).toBeCloseTo(0, 12);
  });

  it("tall image → covers width, crops top/bottom", () => {
    // zone=100×100, image=100×200 → baseScale=max(1,0.5)=1 → draw=100×200; origin.y=(100-200)/2=-50
    const v = val(
      computeCoverDrawRect({
        zone: { x: 0, y: 0, width: 100, height: 100 },
        image: { width: 100, height: 200 },
        transform: { scale: 1, x: 0, y: 0 },
      }),
    );
    expect(v.drawRect.width).toBeCloseTo(100, 12);
    expect(v.drawRect.height).toBeCloseTo(200, 12);
    expect(v.drawRect.y).toBeCloseTo(-50, 12);
    expect(v.maxPan.y).toBeCloseTo(50, 12);
  });

  it("honours a non-zero zone origin", () => {
    // zone=200×200@(10,20), image=100×100, scale=1 → draw=200×200; origin=(10,20)
    const v = val(
      computeCoverDrawRect({
        zone: { x: 10, y: 20, width: 200, height: 200 },
        image: { width: 100, height: 100 },
        transform: { scale: 1, x: 0, y: 0 },
      }),
    );
    expect(v.drawRect.x).toBeCloseTo(10, 12);
    expect(v.drawRect.y).toBeCloseTo(20, 12);
  });

  it("scale>1 enlarges about the center", () => {
    // zone=200×200, image=100×100, scale=1.5 → baseScale=2, drawScale=3, draw=300×300
    // maxPan=|300-200|/2=50; origin=(200-300)/2=-50
    const v = val(
      computeCoverDrawRect({
        zone: { x: 0, y: 0, width: 200, height: 200 },
        image: { width: 100, height: 100 },
        transform: { scale: 1.5, x: 0, y: 0 },
      }),
    );
    expect(v.drawScale).toBeCloseTo(3, 12);
    expect(v.drawRect.width).toBeCloseTo(300, 12);
    expect(v.drawRect.x).toBeCloseTo(-50, 12);
    expect(v.maxPan.x).toBeCloseTo(50, 12);
  });

  it("scale<1 reproduces the legacy abs() pan clamp (image smaller than zone still pans ±50)", () => {
    // zone=200×200, image=100×100, scale=0.5 → baseScale=2, drawScale=1, draw=100×100 (< zone)
    // legacy maxPan=abs(100-200)/2=50 (NOT 0) → a huge input pan clamps to +50
    const v = val(
      computeCoverDrawRect({
        zone: { x: 0, y: 0, width: 200, height: 200 },
        image: { width: 100, height: 100 },
        transform: { scale: 0.5, x: 1000, y: -1000 },
      }),
    );
    expect(v.drawScale).toBeCloseTo(1, 12);
    expect(v.maxPan.x).toBeCloseTo(50, 12); // abs behaviour, documented not "fixed"
    expect(v.appliedTransform.x).toBeCloseTo(50, 12);
    expect(v.appliedTransform.y).toBeCloseTo(-50, 12);
    // origin = (200-100)/2 + 50 = 100
    expect(v.drawRect.x).toBeCloseTo(100, 12);
  });

  it("pan within the limit is applied verbatim", () => {
    // scale=1.5 case, maxPan=50, transform.x=30 (<50) → panX=30, origin.x=-50+30=-20
    const v = val(
      computeCoverDrawRect({
        zone: { x: 0, y: 0, width: 200, height: 200 },
        image: { width: 100, height: 100 },
        transform: { scale: 1.5, x: 30, y: 0 },
      }),
    );
    expect(v.appliedTransform.x).toBeCloseTo(30, 12);
    expect(v.drawRect.x).toBeCloseTo(-20, 12);
  });

  it("pan beyond ± limit is clamped both ways", () => {
    const base = {
      zone: { x: 0, y: 0, width: 200, height: 200 },
      image: { width: 100, height: 100 },
    };
    const hi = val(computeCoverDrawRect({ ...base, transform: { scale: 1.5, x: 100, y: 100 } }));
    expect(hi.appliedTransform.x).toBeCloseTo(50, 12);
    expect(hi.appliedTransform.y).toBeCloseTo(50, 12);
    const lo = val(computeCoverDrawRect({ ...base, transform: { scale: 1.5, x: -100, y: -100 } }));
    expect(lo.appliedTransform.x).toBeCloseTo(-50, 12);
    expect(lo.appliedTransform.y).toBeCloseTo(-50, 12);
  });

  it("clampPan:false applies the input pan unchanged (no clamp, no print pan-scale)", () => {
    // scale=1.5 (maxPan 50) but clampPan false → panX stays 100; origin.x=-50+100=50
    const v = val(
      computeCoverDrawRect({
        zone: { x: 0, y: 0, width: 200, height: 200 },
        image: { width: 100, height: 100 },
        transform: { scale: 1.5, x: 100, y: 0 },
        clampPan: false,
      }),
    );
    expect(v.appliedTransform.x).toBeCloseTo(100, 12);
    expect(v.drawRect.x).toBeCloseTo(50, 12);
    expect(v.maxPan.x).toBeCloseTo(50, 12); // limit still reported, just not applied
  });

  it("does not mutate a deep-frozen input", () => {
    const input = deepFreeze({
      zone: { x: 0, y: 0, width: 200, height: 200 },
      image: { width: 100, height: 100 },
      transform: { scale: 1.5, x: 100, y: 0 },
    });
    expect(() => computeCoverDrawRect(input)).not.toThrow();
    expect(input.transform.x).toBe(100); // original transform untouched
  });

  it.each([
    ["NaN size", { width: Number.NaN, height: 100 }, { scale: 1, x: 0, y: 0 }, "NON_FINITE_INPUT"],
    [
      "Infinity size",
      { width: Number.POSITIVE_INFINITY, height: 100 },
      { scale: 1, x: 0, y: 0 },
      "NON_FINITE_INPUT",
    ],
    ["zero size", { width: 0, height: 100 }, { scale: 1, x: 0, y: 0 }, "NON_POSITIVE_SIZE"],
    ["negative size", { width: -5, height: 100 }, { scale: 1, x: 0, y: 0 }, "NON_POSITIVE_SIZE"],
    ["zero scale", { width: 100, height: 100 }, { scale: 0, x: 0, y: 0 }, "NON_POSITIVE_SCALE"],
    [
      "negative scale",
      { width: 100, height: 100 },
      { scale: -1, x: 0, y: 0 },
      "NON_POSITIVE_SCALE",
    ],
    [
      "NaN scale",
      { width: 100, height: 100 },
      { scale: Number.NaN, x: 0, y: 0 },
      "NON_FINITE_INPUT",
    ],
  ])("rejects %s without throwing", (_label, image, transform, code) => {
    const r = computeCoverDrawRect({
      zone: { x: 0, y: 0, width: 200, height: 200 },
      image,
      transform,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(code);
  });
});
