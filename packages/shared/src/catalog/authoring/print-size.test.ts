// Unit contract for operator print-size authoring (spec 035). Synthetic input only — no network,
// no storage, no real catalog. The legacy defects this fixes are quoted in the assertions.

import { describe, expect, it } from "vitest";
import { evaluateOperatorPrintSizeInput } from "./print-size";

const reasons = (widthText: string, heightText: string) => {
  const result = evaluateOperatorPrintSizeInput(widthText, heightText);
  return result.status === "rejected" ? result.issues : [];
};

describe("evaluateOperatorPrintSizeInput — accepted", () => {
  it("accepts a normal pair and returns the PROJECTED centimetres", () => {
    const result = evaluateOperatorPrintSizeInput("21", "29.7");
    expect(result).toEqual({ status: "ok", value: { widthCm: 21, heightCm: 29.7 } });
  });

  it("accepts the range boundaries the contract allows", () => {
    for (const pair of [
      ["0.1", "0.1"],
      ["500", "500"],
    ] as const) {
      expect(evaluateOperatorPrintSizeInput(pair[0], pair[1]).status, pair.join("x")).toBe("ok");
    }
  });

  it("treats surrounding whitespace as typing, not as a value", () => {
    expect(evaluateOperatorPrintSizeInput("  21  ", " 29.7 ")).toEqual({
      status: "ok",
      value: { widthCm: 21, heightCm: 29.7 },
    });
  });
});

describe("evaluateOperatorPrintSizeInput — nothing typed", () => {
  it("reports an empty form as empty, NOT as an error", () => {
    expect(evaluateOperatorPrintSizeInput("", "")).toEqual({ status: "empty" });
    expect(evaluateOperatorPrintSizeInput("   ", "")).toEqual({ status: "empty" });
  });
});

describe("evaluateOperatorPrintSizeInput — rejected", () => {
  it("rejects half a pair and names the blank side", () => {
    expect(reasons("21", "")).toEqual([{ field: "height", reason: "MISSING" }]);
    expect(reasons("", "29.7")).toEqual([{ field: "width", reason: "MISSING" }]);
  });

  it("rejects everything that is not plain decimal notation", () => {
    const bad = [
      "21cm",
      "abc",
      "-5",
      "+5",
      "1e2",
      "1,5",
      "２１",
      "21.",
      ".5",
      "0x10",
      "21 29",
      "Infinity",
      "NaN",
      "",
    ];
    for (const text of bad) {
      const issues = reasons(text, "29.7");
      expect(issues.length, JSON.stringify(text)).toBe(1);
      expect(issues[0]?.field).toBe("width");
      expect(issues[0]?.reason, JSON.stringify(text)).toBe(text === "" ? "MISSING" : "NOT_DECIMAL");
    }
  });

  it("reports BOTH sides when both are unusable", () => {
    expect(reasons("abc", "def")).toEqual([
      { field: "width", reason: "NOT_DECIMAL" },
      { field: "height", reason: "NOT_DECIMAL" },
    ]);
  });

  it("lets the catalog contract reject out-of-range values (rules are not restated here)", () => {
    for (const text of ["0", "0.0", "500.1", "501", "1000"]) {
      const issues = reasons(text, "29.7");
      expect(issues, JSON.stringify(text)).toEqual([
        { field: "width", reason: "REJECTED_BY_CATALOG" },
      ]);
    }
    expect(reasons("21", "501")).toEqual([{ field: "height", reason: "REJECTED_BY_CATALOG" }]);
  });
});

describe("evaluateOperatorPrintSizeInput — legacy defects that must NOT come back", () => {
  it("never turns an unreadable value into 1 cm (legacy `parseFloat(...) || 1`)", () => {
    const result = evaluateOperatorPrintSizeInput("abc", "29.7");
    expect(result.status).toBe("rejected");
    expect(JSON.stringify(result)).not.toContain("widthCm");
  });

  it('never strips a unit suffix into a silent number (legacy accepted "21cm" as 21)', () => {
    expect(reasons("21cm", "29.7")).toEqual([{ field: "width", reason: "NOT_DECIMAL" }]);
  });

  it("never invents 21 cm for an empty form (legacy `editSz` prefill)", () => {
    const result = evaluateOperatorPrintSizeInput("", "");
    expect(result).toEqual({ status: "empty" });
    expect(JSON.stringify(result)).not.toContain("21");
  });

  it("never derives one side from the other", () => {
    expect(evaluateOperatorPrintSizeInput("21", "").status).toBe("rejected");
    expect(reasons("21", "")).toEqual([{ field: "height", reason: "MISSING" }]);
  });
});

describe("evaluateOperatorPrintSizeInput — purity", () => {
  it("is deterministic and returns JSON-safe values", () => {
    const first = evaluateOperatorPrintSizeInput("21", "29.7");
    const second = evaluateOperatorPrintSizeInput("21", "29.7");
    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it("returns only widthCm/heightCm — no id, name or probe leakage", () => {
    const result = evaluateOperatorPrintSizeInput("21", "29.7");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(Object.keys(result.value).sort()).toEqual(["heightCm", "widthCm"]);
    expect(JSON.stringify(result)).not.toContain("draft");
  });
});
