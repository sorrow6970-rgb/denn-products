// @denn/shared — harmless constants, Result/ID-level types, and the legacy catalog
// read boundary. No other @denn package, React, or Firebase is imported here
// (dependency root). Only legacy fields with evidence are modeled; the rest stay opaque.

// Legacy catalog read boundary (spec 012).
export * from "./catalog";

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
