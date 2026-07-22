// @denn/shared — harmless constants and Result/ID-level types only.
// No other @denn package is imported here (dependency root). Legacy schemas are NOT guessed.

export const BRAND = "DENN PRODUCTS" as const;

/** Stable app identifiers for the two rebuild shells (must stay distinct). */
export const APP_IDS = {
  mockup: "denn-mockup-rebuild",
  admin: "denn-admin-rebuild",
} as const;

export type AppId = (typeof APP_IDS)[keyof typeof APP_IDS];

/** Generic success/failure result used across framework-independent packages. */
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

/** Nominal id helper (branding only; no runtime cost). */
export type Id<Brand extends string> = string & { readonly __idBrand: Brand };
