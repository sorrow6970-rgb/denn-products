// Operator authoring for the physical print size (spec 035).
//
// This module answers ONE question: "would this pair of typed-in centimetre values survive the
// catalog contract?" It does NOT save anything — no Firebase, no Auth, no localStorage, no
// publish (Founder O-1). Everything here is pure.

import { projectFramePrintPhysicalSize } from "../preview/project";
import type { FramePrintPhysicalSize } from "../preview/types";
import { readLegacyCatalog } from "../read";

export type OperatorPrintSizeField = "width" | "height";

export type OperatorPrintSizeRejection =
  /** The other side is filled in, this one is blank. A half-declared size is unusable. */
  | "MISSING"
  /** Not plain decimal notation. Legacy `parseFloat` turned "21cm" into 21 and "abc" into 1 cm. */
  | "NOT_DECIMAL"
  /** Well-formed notation that the catalog contract itself refused (range, mostly). */
  | "REJECTED_BY_CATALOG";

export interface OperatorPrintSizeIssue {
  readonly field: OperatorPrintSizeField;
  readonly reason: OperatorPrintSizeRejection;
}

export type OperatorPrintSizeResult =
  /** Nothing typed yet. Not an error — the size simply cannot be printed yet. */
  | { readonly status: "empty" }
  | { readonly status: "ok"; readonly value: FramePrintPhysicalSize }
  | { readonly status: "rejected"; readonly issues: readonly OperatorPrintSizeIssue[] };

/**
 * Plain decimal notation only: `21`, `29.7`, `0.5`.
 *
 * Deliberately stricter than `Number()`: no sign, no exponent, no thousands separator, no
 * full-width digits, no trailing unit, no leading/trailing dot. The legacy admin used
 * `parseFloat(v('s-wcm')) || 1` (denn-admin.html:1670), which accepted `"21cm"` as 21 and stored
 * `"abc"` as **1 cm** — and 1 cm is inside the valid range, so no later validation could catch it.
 * The only place that mistake can be stopped is here, at the notation.
 */
const DECIMAL_RE = /^\d+(\.\d+)?$/;

/** The synthetic id used for the probe catalog. Never shown, never stored. */
const PROBE_ID = "draft";

/**
 * Judge an operator's typed centimetre pair by RUNNING the real catalog contract on it.
 *
 * The `> 0` / `<= 500` / all-or-nothing rules are not restated here: a probe catalog is built and
 * handed to `readLegacyCatalog`, then to `projectFramePrintPhysicalSize`. If the contract changes,
 * this answer changes with it — a UI that copied the rules would drift instead (spec 035 N-7).
 *
 * Pure: no mutation of the inputs, no I/O, no globals, same input → same output.
 */
export function evaluateOperatorPrintSizeInput(
  widthText: string,
  heightText: string,
): OperatorPrintSizeResult {
  const width = widthText.trim();
  const height = heightText.trim();
  if (width === "" && height === "") return { status: "empty" };

  const issues: OperatorPrintSizeIssue[] = [];
  for (const [field, text] of [
    ["width", width],
    ["height", height],
  ] as const) {
    if (text === "") issues.push({ field, reason: "MISSING" });
    else if (!DECIMAL_RE.test(text)) issues.push({ field, reason: "NOT_DECIMAL" });
  }
  // a value we cannot even read as a number must not be handed to the contract
  if (issues.length > 0) return { status: "rejected", issues };

  const read = readLegacyCatalog({
    // exactly the fields the contract needs: no sub, no aspect, no legacy wcm/hcm, no logical w/h
    frameSizes: [
      {
        id: PROBE_ID,
        name: PROBE_ID,
        printWidthCm: Number(width),
        printHeightCm: Number(height),
      },
    ],
  });

  if (!read.ok) {
    for (const error of read.errors) {
      if (error.path.endsWith(".printWidthCm")) {
        issues.push({ field: "width", reason: "REJECTED_BY_CATALOG" });
      } else if (error.path.endsWith(".printHeightCm")) {
        issues.push({ field: "height", reason: "REJECTED_BY_CATALOG" });
      }
    }
    return { status: "rejected", issues: issues.length > 0 ? issues : bothRejected() };
  }

  const projected = projectFramePrintPhysicalSize(read.document, PROBE_ID);
  // the returned value is the PROJECTION's, not the number we parsed: the round trip is the proof
  if (!projected.ok || projected.value === null) {
    return { status: "rejected", issues: bothRejected() };
  }
  return { status: "ok", value: projected.value };
}

/** Fallback when the contract refused the pair without naming a side — never blame one field. */
const bothRejected = (): readonly OperatorPrintSizeIssue[] => [
  { field: "width", reason: "REJECTED_BY_CATALOG" },
  { field: "height", reason: "REJECTED_BY_CATALOG" },
];
