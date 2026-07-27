import { describe, expect, it } from "vitest";
import { resolveOrientedAspect } from "./aspect";
import type { GeometryResult } from "./types";

function val<V>(r: GeometryResult<V>): V {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.code);
  return r.value;
}

describe("resolveOrientedAspect (aspect = height/width)", () => {
  it("portrait keeps the portrait aspect (4/3)", () => {
    expect(
      val(resolveOrientedAspect({ portraitAspect: 4 / 3, orientation: "portrait" })),
    ).toBeCloseTo(4 / 3, 12);
  });

  it("landscape returns the reciprocal (4/3 → 3/4)", () => {
    expect(
      val(resolveOrientedAspect({ portraitAspect: 4 / 3, orientation: "landscape" })),
    ).toBeCloseTo(3 / 4, 12);
  });

  it("square is 1 both ways", () => {
    expect(val(resolveOrientedAspect({ portraitAspect: 1, orientation: "portrait" }))).toBeCloseTo(
      1,
      12,
    );
    expect(val(resolveOrientedAspect({ portraitAspect: 1, orientation: "landscape" }))).toBeCloseTo(
      1,
      12,
    );
  });

  it("does not mutate its input across repeated calls", () => {
    const input = Object.freeze({ portraitAspect: 1.5, orientation: "landscape" as const });
    const a = val(resolveOrientedAspect(input));
    const b = val(resolveOrientedAspect(input));
    expect(a).toBeCloseTo(b, 12);
    expect(input.portraitAspect).toBe(1.5);
  });

  it.each([
    ["zero", 0, "NON_POSITIVE_ASPECT"],
    ["negative", -2, "NON_POSITIVE_ASPECT"],
    ["NaN", Number.NaN, "NON_FINITE_INPUT"],
    ["Infinity", Number.POSITIVE_INFINITY, "NON_FINITE_INPUT"],
  ])("rejects %s aspect", (_label, portraitAspect, code) => {
    const r = resolveOrientedAspect({ portraitAspect, orientation: "portrait" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(code);
  });
});
