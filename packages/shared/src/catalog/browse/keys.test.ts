import { describe, expect, it } from "vitest";
import type { JsonObject } from "../json";
import {
  ALL_SIZE_SENTINELS,
  isAllSizeKey,
  normalizeSizeKey,
  sizeItemKeys,
  templateSizeKeys,
} from "./keys";

describe("normalizeSizeKey", () => {
  const cases: Array<[string, unknown, string | null]> = [
    ["trims + lowercases", "  A4 ", "a4"],
    ["korean untouched (with space)", "전체 사이즈 공용", "전체 사이즈 공용"],
    ["finite integer → string", 4, "4"],
    ["finite float → string", 1.5, "1.5"],
    ["NaN → null", Number.NaN, null],
    ["Infinity → null", Number.POSITIVE_INFINITY, null],
    ["boolean → null", true, null],
    ["null → null", null, null],
    ["undefined → null", undefined, null],
    ["object → null (never [object Object])", {}, null],
    ["array → null", [], null],
    ["empty string → null", "", null],
    ["blank string → null", "   ", null],
  ];
  for (const [label, input, expected] of cases) {
    it(label, () => {
      expect(normalizeSizeKey(input)).toBe(expected);
    });
  }
});

describe("all-size sentinels", () => {
  it("lists exactly the six sentinels", () => {
    expect([...ALL_SIZE_SENTINELS]).toEqual([
      "__denn_all_frame_sizes__",
      "__all_frame_sizes__",
      "all",
      "*",
      "전체 사이즈 공용",
      "전체사이즈공용",
    ]);
  });
  for (const s of ALL_SIZE_SENTINELS) {
    it(`isAllSizeKey("${s}") is true`, () => {
      expect(isAllSizeKey(s)).toBe(true);
    });
  }
  it("a real key is not a sentinel", () => {
    expect(isAllSizeKey("a4")).toBe(false);
  });
});

describe("sizeItemKeys (size side)", () => {
  it("collects id/name/sub/sizeId/frameSizeId, deduped in order", () => {
    const item: JsonObject = {
      id: "a4",
      name: "A4",
      sub: "21x29",
      sizeId: "s_a4",
      frameSizeId: "fs_a4",
    };
    expect(sizeItemKeys(item)).toEqual(["a4", "21x29", "s_a4", "fs_a4"]);
  });
  it("skips non-scalar / empty fields", () => {
    const item: JsonObject = { id: "x", name: "", sub: null, sizeId: "x", frameSizeId: "y" };
    expect(sizeItemKeys(item)).toEqual(["x", "y"]);
  });
});

describe("templateSizeKeys (template side) — every alias", () => {
  const single = [
    "sizeId",
    "frameSizeId",
    "frameSize",
    "targetSizeId",
    "targetFrameSizeId",
    "sizeKey",
    "frameSizeKey",
  ];
  for (const field of single) {
    it(`single field ${field}`, () => {
      expect(templateSizeKeys({ [field]: "S1" })).toEqual(["s1"]);
    });
  }

  const arrays = ["sizeIds", "frameSizeIds", "targetSizeIds", "frameTargetSizeIds"];
  for (const field of arrays) {
    it(`array field ${field}`, () => {
      expect(templateSizeKeys({ [field]: ["S1", "S2"] })).toEqual(["s1", "s2"]);
    });
  }

  it("nested size.{id,sizeId,frameSizeId,name,sub}", () => {
    expect(
      templateSizeKeys({ size: { id: "a", sizeId: "b", frameSizeId: "c", name: "d", sub: "e" } }),
    ).toEqual(["a", "b", "c", "d", "e"]);
  });

  const allFlags: Array<[string, JsonObject]> = [
    ["allFrameSizes===true", { allFrameSizes: true, sizeId: "x" }],
    ['sizeScope==="all"', { sizeScope: "all", sizeId: "x" }],
    ['sizeMode==="all"', { sizeMode: "all", sizeId: "x" }],
  ];
  for (const [label, item] of allFlags) {
    it(`${label} → [] (all)`, () => {
      expect(templateSizeKeys(item)).toEqual([]);
    });
  }

  for (const sentinel of ALL_SIZE_SENTINELS) {
    it(`sentinel key "${sentinel}" → [] (all)`, () => {
      expect(templateSizeKeys({ sizeId: sentinel })).toEqual([]);
    });
  }

  it("no size keys → [] (all)", () => {
    expect(templateSizeKeys({ id: "t", name: "T" })).toEqual([]);
  });

  it("dedupes across single + array, first order", () => {
    expect(templateSizeKeys({ sizeId: "A", frameSizeId: "a", sizeIds: ["A", "B"] })).toEqual([
      "a",
      "b",
    ]);
  });
});
