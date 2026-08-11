// Head document and revision validation (spec 037 §4.3, §5.7).
//
// Every value is read exactly once into a plain snapshot before it is judged, so a hostile getter
// cannot let a validated value differ from the value that is later used.

import {
  HEAD_ALLOWED_KEYS,
  HEAD_SCHEMA_VERSION,
  REBUILD_OBJECT_PATH_PATTERN,
  REBUILD_OBJECT_PREFIX,
} from "./constants";
import type { AdminStateHead } from "./types";

/**
 * A request's `expectedBase`: non-negative safe integer.
 *
 * `0` is legal and meaningful — it is the "there is no head yet" base.
 */
export function isValidExpectedBase(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/**
 * A persisted head revision: safe integer >= 1 whose increment is STILL a safe integer.
 *
 * The increment check is not pedantry. `Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2`,
 * so without it the revision could stop advancing and the compare-and-set would silently stop
 * discriminating between writers.
 */
export function isValidPersistedRevision(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    Number.isSafeInteger(value + 1)
  );
}

export function isValidObjectPath(value: unknown): value is string {
  return typeof value === "string" && REBUILD_OBJECT_PATH_PATTERN.test(value);
}

export function objectPathFor(operationId: string): string {
  return `${REBUILD_OBJECT_PREFIX}${operationId}.json`;
}

export type HeadValidation =
  | { readonly ok: true; readonly head: AdminStateHead }
  | { readonly ok: false };

/**
 * Validates a raw head document.
 *
 * Rejects a fourth key: the schema is exactly three keys, and an unexpected key means this build
 * does not understand what it is looking at. `firestore.rules` enforces the same set independently.
 */
export function validateHead(raw: unknown): HeadValidation {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false };

  let keys: string[];
  let schemaVersion: unknown;
  let revision: unknown;
  let objectPath: unknown;
  try {
    const source = raw as Record<string, unknown>;
    keys = Object.keys(source);
    schemaVersion = source.schemaVersion;
    revision = source.revision;
    objectPath = source.objectPath;
  } catch {
    return { ok: false };
  }

  if (keys.length !== HEAD_ALLOWED_KEYS.length) return { ok: false };
  for (const allowed of HEAD_ALLOWED_KEYS) {
    if (!keys.includes(allowed)) return { ok: false };
  }
  if (schemaVersion !== HEAD_SCHEMA_VERSION) return { ok: false };
  if (!isValidPersistedRevision(revision)) return { ok: false };
  if (!isValidObjectPath(objectPath)) return { ok: false };

  return { ok: true, head: { schemaVersion: HEAD_SCHEMA_VERSION, revision, objectPath } };
}
