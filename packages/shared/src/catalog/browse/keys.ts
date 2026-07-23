// Frame-size key normalization + all-size sentinels (spec 016 §9-10).
// Evidence: denn-mockup-tool.html frameSizeKey / isAllFrameSizeKey / templateFrameSizeKeys /
// currentFrameSizeKeys. The spec adds the targetSizeIds / frameTargetSizeIds array aliases.

import { isPlainObject, type JsonObject } from "../json";

/** Keys (already normalized) that mean "applies to all sizes". */
export const ALL_SIZE_SENTINELS: readonly string[] = [
  "__denn_all_frame_sizes__",
  "__all_frame_sizes__",
  "all",
  "*",
  "전체 사이즈 공용",
  "전체사이즈공용",
];
const SENTINEL_SET = new Set(ALL_SIZE_SENTINELS);

/**
 * Normalize a size key: `String(value).trim().toLowerCase()` but ONLY for JSON scalar strings or
 * finite numbers. Objects/arrays/booleans/null/undefined and empty results yield null (never
 * "[object Object]").
 */
export function normalizeSizeKey(value: unknown): string | null {
  let source: string;
  if (typeof value === "string") source = value;
  else if (typeof value === "number" && Number.isFinite(value)) source = String(value);
  else return null;
  const key = source.trim().toLowerCase();
  return key.length > 0 ? key : null;
}

export function isAllSizeKey(key: string): boolean {
  return SENTINEL_SET.has(key);
}

/** Deduplicate keeping first occurrence order. */
function dedupeFirst(keys: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

const SIZE_SIDE_FIELDS = ["id", "name", "sub", "sizeId", "frameSizeId"] as const;

/** Keys a frame-size item exposes for matching (evidence: currentFrameSizeKeys). */
export function sizeItemKeys(item: JsonObject): string[] {
  const keys: string[] = [];
  for (const field of SIZE_SIDE_FIELDS) {
    const key = normalizeSizeKey(item[field]);
    if (key) keys.push(key);
  }
  return dedupeFirst(keys);
}

const TEMPLATE_SINGLE_FIELDS = [
  "sizeId",
  "frameSizeId",
  "frameSize",
  "targetSizeId",
  "targetFrameSizeId",
  "sizeKey",
  "frameSizeKey",
] as const;
const TEMPLATE_ARRAY_FIELDS = [
  "sizeIds",
  "frameSizeIds",
  "targetSizeIds",
  "frameTargetSizeIds",
] as const;
const TEMPLATE_SIZE_OBJECT_FIELDS = ["id", "sizeId", "frameSizeId", "name", "sub"] as const;

/**
 * Keys a frame template targets. Returns `[]` when it applies to ALL sizes: an explicit all flag
 * (`allFrameSizes===true` / `sizeScope==="all"` / `sizeMode==="all"`), any all-size sentinel key,
 * or no size keys at all (evidence: templateFrameSizeKeys).
 */
export function templateSizeKeys(item: JsonObject): string[] {
  if (item.allFrameSizes === true || item.sizeScope === "all" || item.sizeMode === "all") return [];
  const raw: string[] = [];
  for (const field of TEMPLATE_SINGLE_FIELDS) {
    const key = normalizeSizeKey(item[field]);
    if (key) raw.push(key);
  }
  for (const field of TEMPLATE_ARRAY_FIELDS) {
    const arr = item[field];
    if (Array.isArray(arr)) {
      for (const element of arr) {
        const key = normalizeSizeKey(element);
        if (key) raw.push(key);
      }
    }
  }
  const sizeObject = item.size;
  if (isPlainObject(sizeObject)) {
    for (const field of TEMPLATE_SIZE_OBJECT_FIELDS) {
      const key = normalizeSizeKey(sizeObject[field]);
      if (key) raw.push(key);
    }
  }
  if (raw.some(isAllSizeKey)) return [];
  return dedupeFirst(raw);
}
