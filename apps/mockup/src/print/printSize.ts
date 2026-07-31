// Print pixel size for one frame, derived ONLY from the operator-authored centimetres (spec 033).
//
// Pure: no DOM, no Canvas, no clock, no randomness. Every result is a function of its arguments, so
// the whole contract is unit-testable and a later constant change cannot silently alter behaviour.
//
// The legacy `framePrintSize` guessed a size from `aspect` whenever it could not find centimetres
// (`fallbackLongSide = 3508`) and clamped to a floor of 900. Neither is reproduced: spec 032 P-2
// says a size without declared centimetres is simply NOT printed, and a floor that fights the
// pixel ceiling is how you get a file that satisfies neither constraint.

/**
 * Provisional output constants (spec 032 P-4a).
 *
 * These are LEGACY OBSERVATIONS, not print-shop requirements — nothing in the repository confirms
 * them. They live here alone so that confirming the real numbers is a one-line change, and they are
 * never shown to the customer (E-6).
 */
export const PROVISIONAL_PRINT = {
  /** dots per inch used to convert centimetres to pixels. */
  dpi: 300,
  /** the long edge is upscaled to at least this many pixels. */
  minLongSide: 3000,
  /** total pixels may not exceed this. */
  maxPixels: 36_000_000,
} as const;

/** Centimetres per inch. Exact by definition, so this is a constant and not a measurement. */
const CM_PER_INCH = 2.54;

export interface PrintPixelSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Why no size could be produced. Identity-free: never a centimetre value, a catalog id, a name or
 * an exception message (spec 031/032 error discipline).
 */
export type PrintSizeErrorCode =
  // the centimetres were absent, non-finite, zero or negative — nothing is inferred (P-2).
  | "INVALID_PHYSICAL_SIZE"
  // the conversion produced a non-finite or non-positive pixel count.
  | "INVALID_PIXEL_SIZE"
  // `minLongSide` and `maxPixels` cannot both hold for this aspect; we do not pick a winner (E-3).
  | "CONSTRAINTS_UNSATISFIABLE";

export type PrintSizeResult =
  | { readonly ok: true; readonly value: PrintPixelSize }
  | { readonly ok: false; readonly code: PrintSizeErrorCode };

const fail = (code: PrintSizeErrorCode): PrintSizeResult => ({ ok: false, code });

const isPositiveFinite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** A usable pixel count: a positive, finite integer. */
const isPixelCount = (value: number): boolean =>
  Number.isFinite(value) && Number.isInteger(value) && value > 0;

/**
 * Convert an operator-authored physical size to the pixel size of the print file.
 *
 * The centimetres must already come from `projectFramePrintPhysicalSize` (spec 032). A `null`
 * projection means "this size cannot be printed yet" and must not reach here — passing anything
 * unusable fails closed rather than being repaired.
 *
 * Order: cm → px, upscale to `minLongSide`, downscale to `maxPixels`, then RE-CHECK both. The
 * re-check matters because the two adjustments pull in opposite directions: for an extreme aspect
 * ratio, upscaling the long edge to 3000 can push the total past 36 MP, and scaling back down
 * drops the long edge under 3000 again. Legacy never re-checked and simply returned a size that
 * honoured neither rule.
 */
export function computeFramePrintPixelSize(physical: {
  readonly widthCm: number;
  readonly heightCm: number;
}): PrintSizeResult {
  // read each field exactly once so a hostile getter cannot change what was validated
  const widthCm = physical?.widthCm;
  const heightCm = physical?.heightCm;
  if (!isPositiveFinite(widthCm) || !isPositiveFinite(heightCm))
    return fail("INVALID_PHYSICAL_SIZE");

  const pxPerCm = PROVISIONAL_PRINT.dpi / CM_PER_INCH;
  let width = Math.round(widthCm * pxPerCm);
  let height = Math.round(heightCm * pxPerCm);
  if (!isPixelCount(width) || !isPixelCount(height)) return fail("INVALID_PIXEL_SIZE");

  const longSide = Math.max(width, height);
  if (longSide < PROVISIONAL_PRINT.minLongSide) {
    const up = PROVISIONAL_PRINT.minLongSide / longSide;
    width = Math.round(width * up);
    height = Math.round(height * up);
  }

  const pixels = width * height;
  if (pixels > PROVISIONAL_PRINT.maxPixels) {
    const down = Math.sqrt(PROVISIONAL_PRINT.maxPixels / pixels);
    width = Math.round(width * down);
    height = Math.round(height * down);
  }

  if (!isPixelCount(width) || !isPixelCount(height)) return fail("INVALID_PIXEL_SIZE");
  // E-3: both constraints, re-checked on the FINAL integers. No silent compromise.
  if (Math.max(width, height) < PROVISIONAL_PRINT.minLongSide)
    return fail("CONSTRAINTS_UNSATISFIABLE");
  if (width * height > PROVISIONAL_PRINT.maxPixels) return fail("CONSTRAINTS_UNSATISFIABLE");

  return { ok: true, value: { width, height } };
}

// --- file name (E-4) ---------------------------------------------------------

/**
 * Format one centimetre value for a file name: up to 2 decimals, trailing zeros removed.
 *
 * `21` stays `21` and `29.70` becomes `29.7`, so the same physical size always produces the same
 * string. The decimal separator is `.` — a comma would break on some upload forms.
 */
export function formatCmForFileName(value: number): string | null {
  if (!isPositiveFinite(value)) return null;
  const rounded = Math.round(value * 100) / 100;
  if (!isPositiveFinite(rounded)) return null;
  return String(rounded);
}

const pad = (value: number, length: number): string => String(value).padStart(length, "0");

/**
 * Format a local timestamp as `YYYYMMDD-HHmmss`.
 *
 * LOCAL time on purpose: the operator and the customer both read this in their own timezone, and a
 * UTC stamp would look an hour or nine off the moment they downloaded. Legacy used `Date.now()`
 * epoch milliseconds, which nobody can read and which does not sort usefully in a file listing.
 *
 * The `Date` is passed in rather than read here, so this stays a pure function.
 */
export function formatLocalStamp(now: Date): string | null {
  if (!(now instanceof Date)) return null;
  const ms = now.getTime();
  if (!Number.isFinite(ms)) return null; // Invalid Date
  return (
    `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}` +
    `-${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`
  );
}

/**
 * Build the print file name (spec 033 E-4): `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png`.
 *
 * It carries the CENTIMETRES, never the size's name — an operator can rename a size, and then the
 * same physical product would produce a different file name. It carries no customer text, catalog
 * id or token: a file name is itself storage and transmission, so P-5c applies to it.
 *
 * Returns `null` rather than a partial name when anything is unusable.
 */
export function buildPrintFileName(
  physical: { readonly widthCm: number; readonly heightCm: number },
  now: Date,
): string | null {
  const width = formatCmForFileName(physical?.widthCm);
  const height = formatCmForFileName(physical?.heightCm);
  const stamp = formatLocalStamp(now);
  if (width === null || height === null || stamp === null) return null;
  return `denn-frame-${width}x${height}cm-${stamp}.png`;
}
