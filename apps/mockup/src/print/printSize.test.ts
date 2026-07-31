// Unit contract for the pure print size + file name calculation (spec 033).
// Synthetic values only — no real catalog, no product names, no DOM, no Canvas, no network.

import { describe, expect, it } from "vitest";
import {
  buildPrintFileName,
  computeFramePrintPixelSize,
  formatCmForFileName,
  formatLocalStamp,
  PROVISIONAL_PRINT,
} from "./printSize";

const size = (widthCm: number, heightCm: number) => ({ widthCm, heightCm });
const ok = (result: ReturnType<typeof computeFramePrintPixelSize>) => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected ok");
  return result.value;
};

describe("computeFramePrintPixelSize — supported sizes", () => {
  it("converts centimetres at the provisional dpi", () => {
    // A4 portrait: 21 x 29.7 cm at 300dpi = 2480 x 3508 px, then upscaled to a 3000 long side
    const value = ok(computeFramePrintPixelSize(size(21, 29.7)));
    expect(value.height).toBeGreaterThanOrEqual(PROVISIONAL_PRINT.minLongSide);
    // the aspect survives the conversion
    expect(value.width / value.height).toBeCloseTo(21 / 29.7, 3);
  });

  it("handles landscape as well as portrait", () => {
    const portrait = ok(computeFramePrintPixelSize(size(21, 29.7)));
    const landscape = ok(computeFramePrintPixelSize(size(29.7, 21)));
    expect(landscape.width).toBe(portrait.height);
    expect(landscape.height).toBe(portrait.width);
  });

  it("accepts fractional centimetres", () => {
    const value = ok(computeFramePrintPixelSize(size(10.5, 14.85)));
    expect(Number.isInteger(value.width)).toBe(true);
    expect(Number.isInteger(value.height)).toBe(true);
  });

  it("always returns positive integers", () => {
    for (const pair of [size(1, 1), size(21, 29.7), size(30, 30), size(500, 500), size(0.5, 0.5)]) {
      const result = computeFramePrintPixelSize(pair);
      if (!result.ok) continue;
      expect(Number.isInteger(result.value.width)).toBe(true);
      expect(Number.isInteger(result.value.height)).toBe(true);
      expect(result.value.width).toBeGreaterThan(0);
      expect(result.value.height).toBeGreaterThan(0);
    }
  });
});

describe("computeFramePrintPixelSize — the two constraints", () => {
  it("upscales a small size until the long edge reaches minLongSide", () => {
    // 5 x 5 cm at 300dpi is only ~591 px, well under the floor
    const value = ok(computeFramePrintPixelSize(size(5, 5)));
    expect(Math.max(value.width, value.height)).toBeGreaterThanOrEqual(
      PROVISIONAL_PRINT.minLongSide,
    );
  });

  it("downscales a large size until the total fits maxPixels", () => {
    // 100 x 100 cm at 300dpi is ~11811^2 = ~139 MP, far past the ceiling
    const value = ok(computeFramePrintPixelSize(size(100, 100)));
    expect(value.width * value.height).toBeLessThanOrEqual(PROVISIONAL_PRINT.maxPixels);
    expect(Math.max(value.width, value.height)).toBeGreaterThanOrEqual(
      PROVISIONAL_PRINT.minLongSide,
    );
  });

  it("never returns a size that violates either constraint", () => {
    for (let cm = 1; cm <= 500; cm += 7) {
      for (const other of [cm, cm * 2, cm / 2]) {
        if (other <= 0 || other > 500) continue;
        const result = computeFramePrintPixelSize(size(cm, other));
        if (!result.ok) continue;
        const { width, height } = result.value;
        expect(Math.max(width, height), `${cm}x${other}`).toBeGreaterThanOrEqual(
          PROVISIONAL_PRINT.minLongSide,
        );
        expect(width * height, `${cm}x${other}`).toBeLessThanOrEqual(PROVISIONAL_PRINT.maxPixels);
      }
    }
  });

  /**
   * The E-3 guard is a real check, but with the CURRENT provisional constants it is unreachable,
   * and that is worth pinning rather than pretending otherwise:
   *
   *  - upscale path: the long edge becomes 3000, so the total is at most 3000 x 3000 = 9 MP,
   *    which can never exceed the 36 MP ceiling;
   *  - downscale path: the total becomes 36 MP, so the long edge is at least sqrt(36 MP) = 6000,
   *    which can never fall under the 3000 floor.
   *
   * So no centimetre pair can make both rules fail. The guard stays because it is what stops a
   * future constant change (a higher floor, a lower ceiling) from silently shipping a file that
   * honours neither — which is exactly what legacy did by never re-checking.
   */
  it("cannot be made unsatisfiable by the current constants, and says so explicitly", () => {
    expect(PROVISIONAL_PRINT.minLongSide ** 2).toBeLessThanOrEqual(PROVISIONAL_PRINT.maxPixels);
    expect(Math.sqrt(PROVISIONAL_PRINT.maxPixels)).toBeGreaterThanOrEqual(
      PROVISIONAL_PRINT.minLongSide,
    );

    // extreme ratios at both ends of the catalog's 0 < cm <= 500 range still succeed
    for (const pair of [size(500, 0.01), size(0.01, 500), size(500, 500), size(0.01, 0.01)]) {
      const result = computeFramePrintPixelSize(pair);
      expect(result.ok, JSON.stringify(pair)).toBe(true);
    }
  });
});

describe("computeFramePrintPixelSize — fail-closed", () => {
  it("REJECTS an unusable centimetre value instead of inferring one", () => {
    const bad = [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for (const value of bad) {
      expect(computeFramePrintPixelSize(size(value, 29.7)).ok, String(value)).toBe(false);
      expect(computeFramePrintPixelSize(size(21, value)).ok, String(value)).toBe(false);
    }
  });

  it("REJECTS a non-number, a missing field and a missing object", () => {
    const cases: unknown[] = [
      { widthCm: "21", heightCm: 29.7 },
      { widthCm: 21 },
      { heightCm: 29.7 },
      {},
      null,
      undefined,
    ];
    for (const input of cases) {
      const result = computeFramePrintPixelSize(input as { widthCm: number; heightCm: number });
      expect(result.ok, JSON.stringify(input)).toBe(false);
      if (!result.ok) expect(result.code).toBe("INVALID_PHYSICAL_SIZE");
    }
  });

  it("carries no raw value in the failure", () => {
    const result = computeFramePrintPixelSize(size(9999, -1));
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized.includes("9999")).toBe(false);
    expect(Object.keys(result).sort()).toEqual(["code", "ok"]);
  });

  it("survives a hostile getter without throwing and reads each field once", () => {
    let reads = 0;
    const hostile = {
      heightCm: 29.7,
      get widthCm(): number {
        reads += 1;
        return reads === 1 ? 21 : -1; // a second read would see a different value
      },
    };
    const result = computeFramePrintPixelSize(hostile);
    expect(result.ok).toBe(true);
    expect(reads).toBe(1);

    const throwing = {
      heightCm: 29.7,
      get widthCm(): number {
        throw new Error("boom");
      },
    };
    expect(() => computeFramePrintPixelSize(throwing)).toThrow(); // caller owns the boundary
  });
});

describe("computeFramePrintPixelSize — purity", () => {
  it("is deterministic and does not mutate its input", () => {
    const input = Object.freeze(size(21, 29.7));
    const first = computeFramePrintPixelSize(input);
    const second = computeFramePrintPixelSize(input);
    expect(first).toEqual(second);
    expect(input).toEqual({ widthCm: 21, heightCm: 29.7 });
  });

  it("keeps the provisional constants in one place with the documented values", () => {
    expect(PROVISIONAL_PRINT).toEqual({ dpi: 300, minLongSide: 3000, maxPixels: 36_000_000 });
    // the legacy fallback long side and the 900 floor are deliberately NOT reproduced
    expect(Object.values(PROVISIONAL_PRINT)).not.toContain(3508);
    expect(Object.values(PROVISIONAL_PRINT)).not.toContain(900);
  });
});

// --- file name ---------------------------------------------------------------

describe("formatCmForFileName", () => {
  it("drops trailing zeros and keeps up to two decimals", () => {
    expect(formatCmForFileName(21)).toBe("21");
    expect(formatCmForFileName(29.7)).toBe("29.7");
    expect(formatCmForFileName(29.7)).toBe(formatCmForFileName(29.7));
    expect(formatCmForFileName(14.85)).toBe("14.85");
    expect(formatCmForFileName(10.001)).toBe("10");
  });

  it("returns null for an unusable value", () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(formatCmForFileName(value), String(value)).toBeNull();
    }
  });
});

describe("formatLocalStamp", () => {
  it("formats local time as YYYYMMDD-HHmmss with zero padding", () => {
    expect(formatLocalStamp(new Date(2026, 6, 31, 15, 30, 42))).toBe("20260731-153042");
    expect(formatLocalStamp(new Date(2026, 0, 5, 4, 3, 2))).toBe("20260105-040302");
  });

  it("returns null for an invalid or non-Date input", () => {
    expect(formatLocalStamp(new Date(Number.NaN))).toBeNull();
    expect(formatLocalStamp("2026-07-31" as unknown as Date)).toBeNull();
  });
});

describe("buildPrintFileName", () => {
  it("builds the approved shape", () => {
    expect(buildPrintFileName(size(21, 29.7), new Date(2026, 6, 31, 15, 30, 42))).toBe(
      "denn-frame-21x29.7cm-20260731-153042.png",
    );
  });

  it("uses only characters that survive an upload form", () => {
    const name = buildPrintFileName(size(14.85, 21), new Date(2026, 6, 31, 15, 30, 42));
    expect(name).not.toBeNull();
    expect(name as string).toMatch(/^[a-z0-9.-]+$/);
  });

  it("never contains a size name, a customer word, an id or a token", () => {
    const name = buildPrintFileName(size(21, 29.7), new Date(2026, 6, 31, 15, 30, 42)) ?? "";
    for (const forbidden of ["A4", "사이즈", "WEDDING", "tpl", "token", "user"]) {
      expect(name.includes(forbidden), forbidden).toBe(false);
    }
  });

  it("is stable for the same size and instant", () => {
    const at = new Date(2026, 6, 31, 15, 30, 42);
    expect(buildPrintFileName(size(21, 29.7), at)).toBe(buildPrintFileName(size(21, 29.7), at));
  });

  it("returns null rather than a partial name when anything is unusable", () => {
    expect(buildPrintFileName(size(0, 29.7), new Date(2026, 6, 31))).toBeNull();
    expect(buildPrintFileName(size(21, Number.NaN), new Date(2026, 6, 31))).toBeNull();
    expect(buildPrintFileName(size(21, 29.7), new Date(Number.NaN))).toBeNull();
  });
});
