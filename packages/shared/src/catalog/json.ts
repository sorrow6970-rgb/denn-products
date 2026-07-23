// JSON-safety primitives for the legacy catalog read boundary (spec 012).
// No dependency on any other @denn/* package, React, or Firebase.

import type { CatalogIssue } from "./types";

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** A plain (Object.prototype / null-prototype) object — not Date/Map/Blob/DOM/class instance. */
export function isPlainObject(value: unknown): value is JsonObject {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deep-clone `input` into a JSON-safe value without mutating it.
 * - Functions, symbols, bigints, undefined, and non-plain objects (Date/Map/Blob/DOM/…)
 *   are rejected via `onIssue({ code: "NON_JSON_VALUE", path })`.
 * - Circular references are rejected via `onIssue({ code: "CIRCULAR_REFERENCE", path })`.
 * - Numbers (including non-finite) are preserved as-is; positivity of specific fields is
 *   validated later by the normalizer, so it can report INVALID_NUMBER with field paths.
 * Returns the clone, or `undefined` if the value at that node was not JSON-safe. Callers
 * treat any reported issue as fatal, so a partially-substituted clone is never surfaced.
 */
export function cloneJsonSafe(
  input: unknown,
  onIssue: (issue: CatalogIssue) => void,
): JsonValue | undefined {
  const ancestors = new Set<object>();

  function walk(value: unknown, path: string): JsonValue | undefined {
    if (value === null) return null;
    const t = typeof value;
    if (t === "string" || t === "boolean" || t === "number") return value as JsonValue;
    if (t === "undefined" || t === "function" || t === "symbol" || t === "bigint") {
      onIssue({ code: "NON_JSON_VALUE", path });
      return undefined;
    }

    if (Array.isArray(value)) {
      if (ancestors.has(value)) {
        onIssue({ code: "CIRCULAR_REFERENCE", path });
        return undefined;
      }
      ancestors.add(value);
      const out: JsonValue[] = [];
      for (let i = 0; i < value.length; i++) {
        const child = walk(value[i], `${path}[${i}]`);
        // Keep index positions stable; the reported issue already fails the whole read.
        out.push(child === undefined ? null : child);
      }
      ancestors.delete(value);
      return out;
    }

    if (isPlainObject(value)) {
      if (ancestors.has(value)) {
        onIssue({ code: "CIRCULAR_REFERENCE", path });
        return undefined;
      }
      ancestors.add(value);
      const out: JsonObject = {};
      for (const key of Object.keys(value)) {
        const child = walk(value[key], path ? `${path}.${key}` : key);
        if (child !== undefined) out[key] = child;
      }
      ancestors.delete(value);
      return out;
    }

    // Non-plain object: Date, Map, Set, Blob, DOM node, class instance, …
    onIssue({ code: "NON_JSON_VALUE", path });
    return undefined;
  }

  return walk(input, "");
}
