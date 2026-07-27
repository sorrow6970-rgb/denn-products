// Internal validation helpers (spec 019 §1). Not part of the public geometry API.
// Reject NaN/Infinity as NON_FINITE_INPUT; positivity is checked separately with a specific code.

import type { GeometryErrorCode, GeometryResult } from "./types";

export const ok = <T>(value: T): GeometryResult<T> => ({ ok: true, value });
export const err = (code: GeometryErrorCode): GeometryResult<never> => ({ ok: false, code });

/** All values must be finite numbers, else NON_FINITE_INPUT. */
export function allFinite(values: readonly number[]): boolean {
  for (const v of values) if (!Number.isFinite(v)) return false;
  return true;
}

/** A finite value strictly greater than 0. */
export function isPositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

/** Clamp v to [lo, hi]. Callers pass already-validated finite bounds with lo <= hi. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
