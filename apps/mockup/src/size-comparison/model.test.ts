import { describe, expect, it } from "vitest";
import { buildComparisonModel, comparePrintSizes } from "./model";

const catalog = () => ({
  frameSizes: [
    { id: "private-a", name: "작은 크기", printWidthCm: 20, printHeightCm: 30 },
    { id: "private-b", name: "큰 크기", printWidthCm: 40, printHeightCm: 50 },
    { id: "missing", name: "100x200", aspect: 2 },
  ],
});

describe("print comparison model", () => {
  it("preserves order and declared dimensions, with no raw identifiers or inferred cm", () => {
    const source = catalog();
    const before = JSON.stringify(source);
    expect(buildComparisonModel(source)).toEqual({
      status: "ready",
      omitted: true,
      sizes: [
        { key: "size-0", label: "작은 크기", widthCm: 20, heightCm: 30 },
        { key: "size-1", label: "큰 크기", widthCm: 40, heightCm: 50 },
      ],
    });
    expect(JSON.stringify(source)).toBe(before);
  });
  it("uses existing memory-only legacy normalization without writing back", () => {
    const source = { frameSizes: [{ id: "a", name: "A", wcm: 30, hcm: 20 }] };
    expect(buildComparisonModel(source)).toMatchObject({ sizes: [{ widthCm: 30, heightCm: 20 }] });
    expect(source.frameSizes[0]).not.toHaveProperty("printWidthCm");
  });
  it("does not rotate a landscape pair or use aspect to correct it", () => {
    expect(
      buildComparisonModel({
        frameSizes: [{ id: "a", name: "A", aspect: 4, printWidthCm: 30, printHeightCm: 20 }],
      }),
    ).toMatchObject({ sizes: [{ widthCm: 30, heightCm: 20 }] });
  });
  it.each([0, -1, 501, Number.NaN, Number.POSITIVE_INFINITY, "20"])(
    "fails closed for invalid cm %s",
    (value) => {
      expect(
        buildComparisonModel({
          frameSizes: [{ id: "a", name: "A", printWidthCm: value, printHeightCm: 20 }],
        }),
      ).toEqual({ status: "invalid" });
    },
  );
  it("rejects partial dimensions and duplicated catalog ids", () => {
    expect(
      buildComparisonModel({ frameSizes: [{ id: "a", name: "A", printWidthCm: 20 }] }),
    ).toEqual({ status: "invalid" });
    expect(
      buildComparisonModel({ frameSizes: [catalog().frameSizes[0], catalog().frameSizes[0]] }),
    ).toEqual({ status: "invalid" });
  });
  it("rejects hostile accessors, circular and non-JSON inputs safely", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const hostile = Object.defineProperty({}, "frameSizes", {
      enumerable: true,
      get() {
        throw new Error("SECRET");
      },
    });
    for (const value of [circular, hostile, { fn: () => undefined }, { schemaVersion: 9 }]) {
      expect(buildComparisonModel(value)).toEqual({ status: "invalid" });
    }
  });
  it("keeps an empty catalog empty", () => {
    expect(buildComparisonModel({})).toEqual({ status: "ready", sizes: [], omitted: false });
  });
  it("uses a single scale with shared left/bottom axes", () => {
    const model = buildComparisonModel(catalog());
    if (model.status !== "ready") throw new Error("test setup");
    const before = JSON.stringify(model);
    const pair = comparePrintSizes(model.sizes, "size-0", "size-1");
    expect(pair).toMatchObject([
      { x: 10, y: 42, width: 32, height: 48 },
      { x: 10, y: 10, width: 64, height: 80 },
    ]);
    expect(JSON.stringify(model)).toBe(before);
  });
  it("does not draw absent, unknown or duplicate selections", () => {
    const model = buildComparisonModel(catalog());
    if (model.status !== "ready") throw new Error("test setup");
    for (const [a, b] of [
      ["", ""],
      ["size-0", ""],
      ["size-0", "size-0"],
      ["size-0", "unknown"],
    ]) {
      expect(comparePrintSizes(model.sizes, a, b)).toBeNull();
    }
  });
});
