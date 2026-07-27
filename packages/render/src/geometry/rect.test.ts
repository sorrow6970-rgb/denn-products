import { describe, expect, it } from "vitest";
import { percentRectToLogical } from "./rect";
import type { GeometryResult } from "./types";

function val<V>(r: GeometryResult<V>): V {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.code);
  return r.value;
}

describe("percentRectToLogical", () => {
  it("0/0/100/100 → the whole container", () => {
    const v = val(
      percentRectToLogical(
        { x: 0, y: 0, width: 400, height: 300 },
        { x: 0, y: 0, width: 100, height: 100 },
      ),
    );
    expect(v).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });

  it("honours a non-zero container origin", () => {
    // container@(10,20) 400×300, percent 0/0/100/100 → origin stays (10,20)
    const v = val(
      percentRectToLogical(
        { x: 10, y: 20, width: 400, height: 300 },
        { x: 0, y: 0, width: 100, height: 100 },
      ),
    );
    expect(v).toEqual({ x: 10, y: 20, width: 400, height: 300 });
  });

  it("25/10/50/40 computes exactly", () => {
    // x=0+25/100*400=100, y=0+10/100*300=30, w=50/100*400=200, h=40/100*300=120
    const v = val(
      percentRectToLogical(
        { x: 0, y: 0, width: 400, height: 300 },
        { x: 25, y: 10, width: 50, height: 40 },
      ),
    );
    expect(v.x).toBeCloseTo(100, 12);
    expect(v.y).toBeCloseTo(30, 12);
    expect(v.width).toBeCloseTo(200, 12);
    expect(v.height).toBeCloseTo(120, 12);
  });

  it("does NOT clamp negative or >100 percent x/y", () => {
    // x=-10 → 0+(-10/100)*400=-40 ; y=120 → 0+(120/100)*300=360
    const v = val(
      percentRectToLogical(
        { x: 0, y: 0, width: 400, height: 300 },
        { x: -10, y: 120, width: 10, height: 10 },
      ),
    );
    expect(v.x).toBeCloseTo(-40, 12);
    expect(v.y).toBeCloseTo(360, 12);
  });

  it.each([
    ["zero width", { x: 0, y: 0, width: 0, height: 10 }, "NON_POSITIVE_SIZE"],
    ["negative height", { x: 0, y: 0, width: 10, height: -1 }, "NON_POSITIVE_SIZE"],
    ["NaN percent", { x: Number.NaN, y: 0, width: 10, height: 10 }, "NON_FINITE_INPUT"],
    [
      "Infinity width",
      { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 10 },
      "NON_FINITE_INPUT",
    ],
  ])("rejects %s", (_label, percent, code) => {
    const r = percentRectToLogical({ x: 0, y: 0, width: 400, height: 300 }, percent);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(code);
  });

  it("finite inputs that overflow (huge percent × huge container) → NON_FINITE_RESULT", () => {
    // width = 1000/100 * MAX_VALUE = 10 * MAX_VALUE = Infinity
    const r = percentRectToLogical(
      { x: 0, y: 0, width: Number.MAX_VALUE, height: 300 },
      { x: 0, y: 0, width: 1000, height: 40 },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NON_FINITE_RESULT");
  });

  it("does not mutate its inputs", () => {
    const container = Object.freeze({ x: 0, y: 0, width: 400, height: 300 });
    const percent = Object.freeze({ x: 25, y: 10, width: 50, height: 40 });
    expect(() => percentRectToLogical(container, percent)).not.toThrow();
    expect(percent.x).toBe(25);
  });
});
