// Space V2 proof-asset byte reader (spec 079 §2-§4).
//
// Read-only by construction: there is no upload / delete / list / update / getDownloadURL surface
// here, and no automatic retry, coalescing, cache or fallback. Every validation runs BEFORE the
// next Firebase call, so a malformed request or a metadata mismatch costs zero byte downloads.

import type { SpaceV2ProofObjectMetadata, SpaceV2ProofReadFirebaseFacade } from "./proof-facade";

/**
 * ONE wall-clock budget for `readMetadata` + `readBytes` + verification (Founder MM-4=A).
 * Deliberately not per-step: two 20s steps would silently double the worst case.
 */
export const SPACE_V2_PROOF_READ_TIMEOUT_MS = 20_000;

/** 20 * 1024 * 1024 - 1, the same ceiling the spec 078 controller passes in. */
export const SPACE_V2_PROOF_READ_MAX_BYTES = 20_971_519;

const PROOF_CONTENT_TYPE = "image/png";

/**
 * The ONLY shape this reader will fetch. Anchored end to end, so a URL, a `gs://` reference, a
 * different public Storage prefix, `..` traversal, an uppercase UUID or a `?query`/`#hash` suffix
 * can never match — this must not become a general-purpose bucket reader.
 */
const PROOF_OBJECT_PATH =
  /^rebuild-space-assets\/objects\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/;

const REQUEST_KEYS = ["objectPath", "maxBytes"] as const;

export type SpaceV2ProofReadErrorCode =
  | "SPACE_V2_PROOF_READ_INVALID_REQUEST"
  | "SPACE_V2_PROOF_READ_INVALID_FACADE"
  | "SPACE_V2_PROOF_READ_METADATA_UNAVAILABLE"
  | "SPACE_V2_PROOF_READ_METADATA_REJECTED"
  | "SPACE_V2_PROOF_READ_BYTES_UNAVAILABLE"
  | "SPACE_V2_PROOF_READ_BYTES_REJECTED"
  | "SPACE_V2_PROOF_READ_TIMEOUT";

/**
 * Internal-only failure signal. The customer-facing contract stays the spec 078 controller's
 * single `SPACE_V2_REPLAY_PROOF_LOAD_FAILED`, so no object path, bucket, config, token, UID,
 * metadata, byte content or raw SDK code/message is ever carried out of this module.
 */
export interface SafeSpaceV2ProofReadError extends Error {
  readonly code: SpaceV2ProofReadErrorCode;
}

export interface SpaceV2ProofBytesReader {
  read(request: {
    readonly objectPath: string;
    readonly maxBytes: number;
  }): Promise<{ readonly bytes: Uint8Array; readonly contentType: "image/png" }>;
}

function safeError(code: SpaceV2ProofReadErrorCode): SafeSpaceV2ProofReadError {
  const error = new Error(code) as Error & { code: SpaceV2ProofReadErrorCode };
  error.name = "SpaceV2ProofReadError";
  error.code = code;
  return error;
}

/** Own-enumerable-key-exact snapshot: extra or missing keys are a rejected request, not a warning. */
function exactRequest(input: unknown): { objectPath: unknown; maxBytes: unknown } | null {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
    const ownKeys = Reflect.ownKeys(input);
    if (ownKeys.length !== REQUEST_KEYS.length) return null;
    for (const key of ownKeys) {
      if (typeof key !== "string") return null;
      if (!Reflect.getOwnPropertyDescriptor(input, key)?.enumerable) return null;
    }
    const present = new Set(ownKeys as string[]);
    if (REQUEST_KEYS.some((key) => !present.has(key))) return null;
    const source = input as Record<string, unknown>;
    // Each field is read exactly once; a getter cannot return one value to the guard and another
    // to the Firebase call.
    return { objectPath: source.objectPath, maxBytes: source.maxBytes };
  } catch {
    return null;
  }
}

interface BoundFacade {
  readonly readMetadata: (objectPath: string) => Promise<SpaceV2ProofObjectMetadata>;
  readonly readBytes: (objectPath: string, maxBytes: number) => Promise<ArrayBuffer>;
}

function bindFacade(facade: unknown): BoundFacade | null {
  try {
    if (facade === null || typeof facade !== "object") return null;
    const source = facade as Partial<SpaceV2ProofReadFirebaseFacade>;
    const readMetadata = source.readMetadata;
    const readBytes = source.readBytes;
    if (typeof readMetadata !== "function" || typeof readBytes !== "function") return null;
    return { readMetadata: readMetadata.bind(source), readBytes: readBytes.bind(source) };
  } catch {
    return null;
  }
}

type Outcome<T> =
  | { readonly kind: "value"; readonly value: T }
  | { readonly kind: "rejected" }
  | { readonly kind: "timeout" };

interface ReadBudget {
  race<T>(start: () => Promise<T>): Promise<Outcome<T>>;
  expired(): boolean;
  stop(): void;
}

/**
 * Abandons the wait; it does NOT cancel the underlying request. The public Firebase Storage read
 * API exposes no abort contract, so the guarantee is only that a late result is discarded — and
 * because the handlers below are always attached, a late rejection never becomes an unhandled one.
 */
function startBudget(timeoutMs: number): ReadBudget {
  let expired = false;
  const waiters = new Set<() => void>();
  const timer = setTimeout(() => {
    expired = true;
    const pending = [...waiters];
    waiters.clear();
    for (const notify of pending) notify();
  }, timeoutMs);

  return {
    expired: () => expired,
    stop: () => clearTimeout(timer),
    race<T>(start: () => Promise<T>): Promise<Outcome<T>> {
      return new Promise<Outcome<T>>((resolve) => {
        let settled = false;
        const notify = () => {
          if (settled) return;
          settled = true;
          resolve({ kind: "timeout" });
        };
        const finish = (outcome: Outcome<T>) => {
          if (settled) return;
          settled = true;
          waiters.delete(notify);
          resolve(outcome);
        };
        if (expired) {
          settled = true;
          resolve({ kind: "timeout" });
          return;
        }
        waiters.add(notify);
        let pending: Promise<T>;
        try {
          pending = Promise.resolve(start());
        } catch {
          finish({ kind: "rejected" });
          return;
        }
        pending.then(
          (value) => finish({ kind: "value", value }),
          () => finish({ kind: "rejected" }),
        );
      });
    },
  };
}

/**
 * Snapshots the three metadata fields once and returns the verified size, or null when any check
 * fails. `fullPath` is compared against the requested path so a redirected or substituted object
 * cannot be accepted.
 */
function verifiedMetadataSize(metadata: unknown, objectPath: string): number | null {
  try {
    if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const source = metadata as Record<string, unknown>;
    const fullPath = source.fullPath;
    const contentType = source.contentType;
    const size = source.size;
    if (fullPath !== objectPath) return null;
    if (contentType !== PROOF_CONTENT_TYPE) return null;
    if (typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0) return null;
    return size;
  } catch {
    return null;
  }
}

/** Fresh copy: the caller may mutate the result without reaching the facade's own buffer. */
function copyExactBytes(value: unknown, expectedSize: number): Uint8Array | null {
  if (!(value instanceof ArrayBuffer)) return null;
  const copy = new Uint8Array(value.byteLength);
  copy.set(new Uint8Array(value));
  return copy.byteLength === expectedSize ? copy : null;
}

/** INTERNAL test seam. Not exported from `./index`, so the contract budget cannot be reshaped. */
export function createSpaceV2ProofBytesReaderWithTimeout(
  facade: SpaceV2ProofReadFirebaseFacade,
  timeoutMs: number,
): SpaceV2ProofBytesReader {
  return {
    async read(request) {
      const snapshot = exactRequest(request);
      if (snapshot === null) throw safeError("SPACE_V2_PROOF_READ_INVALID_REQUEST");
      const { objectPath, maxBytes } = snapshot;
      if (typeof objectPath !== "string" || !PROOF_OBJECT_PATH.test(objectPath)) {
        throw safeError("SPACE_V2_PROOF_READ_INVALID_REQUEST");
      }
      if (
        typeof maxBytes !== "number" ||
        !Number.isSafeInteger(maxBytes) ||
        maxBytes <= 0 ||
        maxBytes > SPACE_V2_PROOF_READ_MAX_BYTES
      ) {
        throw safeError("SPACE_V2_PROOF_READ_INVALID_REQUEST");
      }
      const bound = bindFacade(facade);
      if (bound === null) throw safeError("SPACE_V2_PROOF_READ_INVALID_FACADE");

      const budget = startBudget(timeoutMs);
      try {
        const metadata = await budget.race(() => bound.readMetadata(objectPath));
        if (metadata.kind === "timeout") throw safeError("SPACE_V2_PROOF_READ_TIMEOUT");
        if (metadata.kind === "rejected") {
          throw safeError("SPACE_V2_PROOF_READ_METADATA_UNAVAILABLE");
        }
        const size = verifiedMetadataSize(metadata.value, objectPath);
        // An oversized object is refused here, so the download never starts.
        if (size === null || size > maxBytes) {
          throw safeError("SPACE_V2_PROOF_READ_METADATA_REJECTED");
        }

        const bytes = await budget.race(() => bound.readBytes(objectPath, maxBytes));
        if (bytes.kind === "timeout") throw safeError("SPACE_V2_PROOF_READ_TIMEOUT");
        if (bytes.kind === "rejected") throw safeError("SPACE_V2_PROOF_READ_BYTES_UNAVAILABLE");
        const copied = copyExactBytes(bytes.value, size);
        if (copied === null) throw safeError("SPACE_V2_PROOF_READ_BYTES_REJECTED");
        if (budget.expired()) throw safeError("SPACE_V2_PROOF_READ_TIMEOUT");

        return { bytes: copied, contentType: PROOF_CONTENT_TYPE };
      } finally {
        budget.stop();
      }
    },
  };
}

/** Public factory. The budget is the contract constant and is deliberately not a parameter. */
export function createSpaceV2ProofBytesReader(
  facade: SpaceV2ProofReadFirebaseFacade,
): SpaceV2ProofBytesReader {
  return createSpaceV2ProofBytesReaderWithTimeout(facade, SPACE_V2_PROOF_READ_TIMEOUT_MS);
}
