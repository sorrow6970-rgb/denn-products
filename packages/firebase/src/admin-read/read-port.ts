// Private admin-state read port (spec 036 §5). Read-only by construction: this module has no
// write / upload / delete / getDownloadURL / published surface at all.

import { readLegacyCatalog } from "@denn/shared";
import {
  ADMIN_STATE_MAX_BYTES,
  ADMIN_STATE_OBJECT_PATH,
  ADMIN_STATE_READ_TIMEOUT_MS,
  CORRELATION_ID_PATTERN,
} from "./constants";
import { mapStorageError, safeError } from "./errors";
import type { AdminFirebaseFacade } from "./facade";
import type {
  AdminReadErrorCode,
  AdminStateLoadResult,
  AdminStateReadPort,
  OperatorAuthPort,
} from "./types";

const isValidCorrelationId = (value: unknown): value is string =>
  typeof value === "string" && CORRELATION_ID_PATTERN.test(value);

/** Auth gate: the read is refused locally before any Storage call is made. */
function authBlockedCode(auth: OperatorAuthPort): AdminReadErrorCode | null {
  const state = auth.currentOperator();
  switch (state.status) {
    case "authenticated":
      return null;
    case "initializing":
      return "AUTH_NOT_READY";
    case "signed-out":
      return "AUTH_REQUIRED";
    default:
      return state.code === "ANONYMOUS_NOT_ALLOWED" ? "ANONYMOUS_NOT_ALLOWED" : "AUTH_REQUIRED";
  }
}

type TimedOutcome<T> = { readonly kind: "value"; readonly value: T } | { readonly kind: "timeout" };

/**
 * Abandons the wait after `timeoutMs`. This does NOT cancel the underlying SDK request — the
 * contract only promises that a late result is discarded, never that the network call stopped.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<TimedOutcome<T>> {
  return new Promise<TimedOutcome<T>>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ kind: "timeout" });
    }, timeoutMs);
    promise.then(
      (value) => {
        if (settled) return; // late success after a timeout: discarded, never surfaced
        settled = true;
        clearTimeout(timer);
        resolve({ kind: "value", value });
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export interface AdminStateReadPortOptions {
  readonly facade: AdminFirebaseFacade;
  readonly auth: OperatorAuthPort;
  /** Overridable for deterministic tests only; production uses the contract constant. */
  readonly timeoutMs?: number;
}

export function createAdminStateReadPort(options: AdminStateReadPortOptions): AdminStateReadPort {
  const { facade, auth } = options;
  const timeoutMs = options.timeoutMs ?? ADMIN_STATE_READ_TIMEOUT_MS;
  // A second click while a read is running reuses the running promise instead of starting a
  // second request. Disabling the button is a UI nicety; this is the actual guarantee.
  let inFlight: Promise<AdminStateLoadResult> | null = null;

  const run = async (correlationId: string): Promise<AdminStateLoadResult> => {
    let bytes: Uint8Array;
    try {
      const outcome = await withTimeout(
        facade.readObjectBytes({
          objectPath: ADMIN_STATE_OBJECT_PATH,
          maxDownloadSizeBytes: ADMIN_STATE_MAX_BYTES,
        }),
        timeoutMs,
      );
      if (outcome.kind === "timeout") {
        return { ok: false, error: safeError("NETWORK_TIMEOUT", correlationId) };
      }
      bytes = outcome.value;
    } catch (error) {
      return { ok: false, error: safeError(mapStorageError(error), correlationId) };
    }

    let text: string;
    try {
      // `fatal` so malformed UTF-8 fails instead of producing replacement characters
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return { ok: false, error: safeError("INVALID_JSON", correlationId) };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: safeError("INVALID_JSON", correlationId) };
    }

    const read = readLegacyCatalog(parsed);
    if (!read.ok) {
      // only {code, path} pairs travel outwards — never the offending value
      return {
        ok: false,
        error: safeError("INVALID_CATALOG", correlationId, read.errors),
      };
    }

    return {
      ok: true,
      value: {
        document: read.document,
        report: read.report,
        byteLength: bytes.byteLength,
        correlationId,
      },
    };
  };

  const load = (request: { readonly correlationId: string }): Promise<AdminStateLoadResult> => {
    const correlationId = request?.correlationId;
    if (!isValidCorrelationId(correlationId)) {
      return Promise.resolve({ ok: false, error: safeError("INVALID_REQUEST", "") });
    }
    const blocked = authBlockedCode(auth);
    if (blocked !== null) {
      // no Storage call is made in this branch
      return Promise.resolve({ ok: false, error: safeError(blocked, correlationId) });
    }
    if (inFlight !== null) return inFlight;

    const pending = run(correlationId).finally(() => {
      inFlight = null; // a manual retry is allowed; an automatic one is not
    });
    inFlight = pending;
    return pending;
  };

  return { load };
}
