// Unit contract for the composer's pure decisions (spec 027 §필수 자동 검증 unit).

import type { CatalogDocumentV1 } from "@denn/shared";
import { describe, expect, it } from "vitest";
import {
  CASE_BODY_COLORS,
  FRAME_MAX_LOGICAL_WIDTH,
  PREVIEW_MESSAGES,
  readFrameColorOptions,
  resolveFrameLogicalWidth,
  zoneSlotLabel,
} from "./previewContracts";

const doc = (frameColors: unknown): CatalogDocumentV1 =>
  ({
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: { frameColors },
  }) as unknown as CatalogDocumentV1;

describe("CASE_BODY_COLORS", () => {
  it("is the evidenced legacy solid palette, exactly 8 canonical colours", () => {
    expect(CASE_BODY_COLORS.map((c) => c.value)).toEqual([
      "#1A1A1A",
      "#FFFFFF",
      "#D4C5B0",
      "#2B3A4A",
      "#7B3F3F",
      "#3A5C3A",
      "#8B4513",
      "#C8A0D0",
    ]);
    for (const option of CASE_BODY_COLORS) {
      expect(option.value).toMatch(/^#[0-9A-F]{6}$/);
      expect(option.name.length).toBeGreaterThan(0);
    }
  });

  it("has no transparent / pattern entry (the plan cannot express one)", () => {
    const serialized = JSON.stringify(CASE_BODY_COLORS);
    for (const forbidden of ["transparent", "rgba", "checker", "pattern"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

describe("readFrameColorOptions", () => {
  it("keeps only exact #RRGGBB solids with a name, canonicalised to uppercase", () => {
    const options = readFrameColorOptions(
      doc([
        { id: "black", name: "블랙", fill: "#1a1a1a" },
        { id: "white", name: "화이트", fill: "#EEEEEE" },
      ]),
    );
    expect(options).toEqual([
      { name: "블랙", value: "#1A1A1A" },
      { name: "화이트", value: "#EEEEEE" },
    ]);
  });

  it("excludes grain entries — a random wood texture is not a deterministic fill", () => {
    const options = readFrameColorOptions(
      doc([
        { id: "oak", name: "원목 오크", fill: "#A07848", grain: true },
        { id: "black", name: "블랙", fill: "#1A1A1A", grain: false },
      ]),
    );
    expect(options).toEqual([{ name: "블랙", value: "#1A1A1A" }]);
  });

  it.each([
    ["named colour", { id: "r", name: "레드", fill: "red" }],
    ["short hex", { id: "s", name: "숏", fill: "#ABC" }],
    ["alpha hex", { id: "a", name: "알파", fill: "#AABBCCDD" }],
    ["padded hex", { id: "p", name: "패딩", fill: " #AABBCC " }],
    ["missing fill", { id: "m", name: "없음" }],
    ["missing name", { id: "n", fill: "#AABBCC" }],
    ["blank name", { id: "b", name: "   ", fill: "#AABBCC" }],
    ["not an object", 42],
  ])("drops an unusable entry (%s)", (_label, item) => {
    expect(readFrameColorOptions(doc([item]))).toEqual([]);
  });

  it.each([
    ["missing", undefined],
    ["not an array", {}],
    ["null", null],
  ])("returns no option when frameColors is %s", (_label, value) => {
    expect(readFrameColorOptions(doc(value))).toEqual([]);
  });

  it("never throws and never echoes ids or raw catalog values", () => {
    const hostile = {} as Record<string, unknown>;
    Object.defineProperty(hostile, "frameColors", {
      get() {
        throw new Error("hostile getter");
      },
      enumerable: true,
    });
    const document = {
      schemaVersion: 1,
      migratedFrom: "legacy-v0",
      data: hostile,
    } as unknown as CatalogDocumentV1;

    let options: readonly unknown[] = [];
    expect(() => {
      options = readFrameColorOptions(document);
    }).not.toThrow();
    expect(options).toEqual([]);

    const serialized = JSON.stringify(
      readFrameColorOptions(doc([{ id: "SECRET_COLOR_ID", name: "블랙", fill: "#1A1A1A" }])),
    );
    expect(serialized).not.toContain("SECRET_COLOR_ID");
    expect(serialized).not.toContain("grain");
  });

  it("deduplicates by canonical value, keeping the first entry and its name", () => {
    const options = readFrameColorOptions(
      doc([
        { id: "a", name: "블랙 A", fill: "#1a1a1a" },
        { id: "b", name: "블랙 B", fill: "#1A1A1A" },
      ]),
    );
    expect(options).toEqual([{ name: "블랙 A", value: "#1A1A1A" }]);
  });

  it("collapses three entries of the same colour into one", () => {
    const options = readFrameColorOptions(
      doc([
        { id: "a", name: "첫째", fill: "#AABBCC" },
        { id: "b", name: "둘째", fill: "#aabbcc" },
        { id: "c", name: "셋째", fill: "#AaBbCc" },
      ]),
    );
    expect(options).toEqual([{ name: "첫째", value: "#AABBCC" }]);
  });

  it("keeps distinct colours in source order", () => {
    const options = readFrameColorOptions(
      doc([
        { id: "w", name: "화이트", fill: "#FFFFFF" },
        { id: "k", name: "블랙", fill: "#1A1A1A" },
        { id: "k2", name: "블랙 중복", fill: "#1a1a1a" },
        { id: "g", name: "그레이", fill: "#808080" },
      ]),
    );
    expect(options).toEqual([
      { name: "화이트", value: "#FFFFFF" },
      { name: "블랙", value: "#1A1A1A" },
      { name: "그레이", value: "#808080" },
    ]);
  });

  it("dedups only valid entries — an invalid first entry does not reserve the colour", () => {
    const options = readFrameColorOptions(
      doc([
        { id: "grain", name: "원목", fill: "#1A1A1A", grain: true },
        { id: "solid", name: "블랙", fill: "#1A1A1A" },
      ]),
    );
    expect(options).toEqual([{ name: "블랙", value: "#1A1A1A" }]);
  });

  it("does not auto-select anything (it returns options only)", () => {
    const options = readFrameColorOptions(doc([{ id: "b", name: "블랙", fill: "#1A1A1A" }]));
    expect(Object.keys(options[0])).toEqual(["name", "value"]);
  });
});

describe("resolveFrameLogicalWidth", () => {
  it("rounds the measured width and caps it at 500", () => {
    expect(resolveFrameLogicalWidth(320)).toBe(320);
    expect(resolveFrameLogicalWidth(319.4)).toBe(319);
    expect(resolveFrameLogicalWidth(319.6)).toBe(320);
    expect(resolveFrameLogicalWidth(1280)).toBe(FRAME_MAX_LOGICAL_WIDTH);
    expect(resolveFrameLogicalWidth(500.9)).toBe(500);
  });

  it("clamps a sub-pixel width to 1 rather than producing 0", () => {
    expect(resolveFrameLogicalWidth(0.4)).toBe(1);
  });

  it.each([
    ["zero", 0],
    ["negative", -320],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("has no width for a %s measurement (the caller waits)", (_label, value) => {
    expect(resolveFrameLogicalWidth(value)).toBeNull();
  });

  it("invents no default width", () => {
    expect(resolveFrameLogicalWidth(Number.NaN)).not.toBe(FRAME_MAX_LOGICAL_WIDTH);
    expect(resolveFrameLogicalWidth(Number.NaN)).not.toBe(320);
  });
});

describe("copy", () => {
  it("uses fixed customer-safe messages with no code, id, url or file name", () => {
    const serialized = JSON.stringify(PREVIEW_MESSAGES);
    for (const forbidden of ["INVALID", "MISSING", "code", "blob:", "data:", "http", ".png"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("numbers zone slots by position", () => {
    expect(zoneSlotLabel(0)).toBe("사진 1");
    expect(zoneSlotLabel(2)).toBe("사진 3");
  });
});
