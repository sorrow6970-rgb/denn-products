import { describe, expect, it } from "vitest";
import { clientPointToLogical } from "./point";
import type { GeometryResult } from "./types";

function val<V>(r: GeometryResult<V>): V {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.code);
  return r.value;
}

describe("clientPointToLogical", () => {
  it("maps the rect top-left to logical (0,0)", () => {
    const v = val(
      clientPointToLogical({
        client: { x: 30, y: 40 },
        clientRect: { x: 30, y: 40, width: 300, height: 400 },
        logicalSize: { width: 300, height: 400 },
      }),
    );
    expect(v.x).toBeCloseTo(0, 12);
    expect(v.y).toBeCloseTo(0, 12);
  });

  it("maps the rect center to the logical center", () => {
    // client=(180,240) rect@(30,40) 300×400 → ((180-30)*300/300, (240-40)*400/400)=(150,200)
    const v = val(
      clientPointToLogical({
        client: { x: 180, y: 240 },
        clientRect: { x: 30, y: 40, width: 300, height: 400 },
        logicalSize: { width: 300, height: 400 },
      }),
    );
    expect(v.x).toBeCloseTo(150, 12);
    expect(v.y).toBeCloseTo(200, 12);
  });

  it("scales when the CSS box is smaller/larger than the logical size", () => {
    // rect 150×200 (CSS shrunk) but logical 300×400 → factor ×2
    // client=(75,100) from rect origin (0,0) → (75*300/150, 100*400/200)=(150,200)
    const v = val(
      clientPointToLogical({
        client: { x: 75, y: 100 },
        clientRect: { x: 0, y: 0, width: 150, height: 200 },
        logicalSize: { width: 300, height: 400 },
      }),
    );
    expect(v.x).toBeCloseTo(150, 12);
    expect(v.y).toBeCloseTo(200, 12);
  });

  it("is independent of DPR / backing size (same rect+logical → same result)", () => {
    // The function takes NO backing/DPR input; two callers imagining different backing stores
    // (e.g. DPR 2 vs 3) must get identical logical coordinates for the same rect+logicalSize.
    const args = {
      client: { x: 90, y: 120 },
      clientRect: { x: 0, y: 0, width: 300, height: 400 },
      logicalSize: { width: 300, height: 400 },
    };
    expect(val(clientPointToLogical(args))).toEqual(val(clientPointToLogical(args)));
    // and equals the plain CSS delta since rect==logical here
    expect(val(clientPointToLogical(args))).toEqual({ x: 90, y: 120 });
  });

  it("does NOT clamp points outside the rect (negative / beyond)", () => {
    const v = val(
      clientPointToLogical({
        client: { x: -30, y: 440 },
        clientRect: { x: 0, y: 0, width: 300, height: 400 },
        logicalSize: { width: 300, height: 400 },
      }),
    );
    expect(v.x).toBeCloseTo(-30, 12);
    expect(v.y).toBeCloseTo(440, 12);
  });

  it.each([
    [
      "zero rect width",
      { x: 0, y: 0, width: 0, height: 400 },
      { width: 300, height: 400 },
      "NON_POSITIVE_SIZE",
    ],
    [
      "zero logical height",
      { x: 0, y: 0, width: 300, height: 400 },
      { width: 300, height: 0 },
      "NON_POSITIVE_SIZE",
    ],
    [
      "NaN client rect",
      { x: Number.NaN, y: 0, width: 300, height: 400 },
      { width: 300, height: 400 },
      "NON_FINITE_INPUT",
    ],
  ])("rejects %s", (_label, clientRect, logicalSize, code) => {
    const r = clientPointToLogical({ client: { x: 10, y: 10 }, clientRect, logicalSize });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(code);
  });

  it("finite inputs that overflow (huge delta × huge logical / tiny rect) → NON_FINITE_RESULT", () => {
    // x = (1000 - 0) * MAX_VALUE / 1 = Infinity
    const r = clientPointToLogical({
      client: { x: 1000, y: 10 },
      clientRect: { x: 0, y: 0, width: 1, height: 400 },
      logicalSize: { width: Number.MAX_VALUE, height: 400 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NON_FINITE_RESULT");
  });
});
