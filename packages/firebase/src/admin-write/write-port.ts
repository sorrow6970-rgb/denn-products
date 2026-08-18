// Rebuild admin-state write port (spec 037 §5, §6).
//
// The shape of the safety argument: the object is created at a fresh opaque path that nobody else
// holds, and the ONLY mutable thing — the Firestore head — moves by compare-and-set. So a failure
// anywhere in between leaves an unreferenced object and an unchanged head; it never overwrites
// another operator's bytes. That is not cross-service atomicity, and this module does not pretend
// it is.

import { readLegacyCatalog } from "@denn/shared";
import type { CatalogDocumentV1, CatalogItemV1, CatalogReadReport, JsonValue } from "@denn/shared";
import type { AdminStateReadPort, OperatorAuthPort } from "../admin-read/types";
import {
  CORRELATION_ID_PATTERN,
  HEAD_SCHEMA_VERSION,
  NO_HEAD_REVISION,
  REBUILD_OBJECT_CONTENT_TYPE,
  REBUILD_OBJECT_MAX_BYTES,
} from "./constants";
import {
  baselineInvalidError,
  classifyTransactionError,
  mapClaimError,
  mapBaselineReadError,
  mapUploadError,
  readError,
  writeError,
} from "./errors";
import type { AdminWriteFacade } from "./facade";
import { isValidExpectedBase, objectPathForRecId, recIdFor, validateHead } from "./head";
import type {
  AdminStateBaselineResult,
  AdminStateHead,
  AdminStateSaveRequest,
  AdminStateSaveResult,
  AdminStateWritePort,
  AdminWriteErrorCode,
} from "./types";

const isValidCorrelationId = (value: unknown): value is string =>
  typeof value === "string" && CORRELATION_ID_PATTERN.test(value);

// Aborting the transaction callback. A marker property is used instead of `instanceof` so the
// signal survives whatever wrapping the SDK does on its way back out.
const CONFLICT_SIGNAL = "denn-admin-write-conflict";
const HEAD_UNUSABLE_SIGNAL = "denn-admin-write-head-unusable";

function abortSignal(mark: string): Error {
  const error = new Error(mark);
  (error as Error & { __dennWriteSignal?: string }).__dennWriteSignal = mark;
  return error;
}

function signalOf(error: unknown): string | null {
  try {
    if (typeof error !== "object" || error === null) return null;
    const mark = (error as { __dennWriteSignal?: unknown }).__dennWriteSignal;
    return typeof mark === "string" ? mark : null;
  } catch {
    return null;
  }
}

/** Auth is checked locally first, so an unauthenticated save makes zero Storage/Firestore calls. */
function authBlocked(auth: OperatorAuthPort): boolean {
  return auth.currentOperator().status !== "authenticated";
}

type DecodedCatalog =
  | { readonly ok: true; readonly document: ReturnType<typeof readLegacyCatalog> }
  | { readonly ok: false; readonly code: "INVALID_JSON" };

/**
 * bytes -> UTF-8 -> JSON -> validated catalog.
 *
 * `fatal` so malformed UTF-8 fails instead of yielding replacement characters. The catalog RULES
 * are not re-implemented here — `readLegacyCatalog` remains the single authority.
 */
function decodeCatalog(bytes: Uint8Array): DecodedCatalog {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, code: "INVALID_JSON" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, code: "INVALID_JSON" };
  }
  return { ok: true, document: readLegacyCatalog(parsed) };
}

const NORMALIZED_PRINT_SIZE_PATH = /^frameSizes\[(\d+)\]\.wcm$/;

function promotedLegacyPrintSizeIds(
  document: CatalogDocumentV1,
  report: CatalogReadReport,
): readonly string[] {
  const sizes = document.data.frameSizes ?? [];
  const ids: string[] = [];
  for (const warning of report.warnings) {
    if (warning.code !== "LEGACY_PRINT_SIZE_NORMALIZED") continue;
    const match = NORMALIZED_PRINT_SIZE_PATH.exec(warning.path);
    if (match === null) continue;
    const index = Number(match[1]);
    const id = sizes[index]?.id;
    if (typeof id === "string" && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

const owns = (item: CatalogItemV1, key: "wcm" | "hcm"): boolean => Object.hasOwn(item, key);

function sameJsonValue(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * F-D: legacy fields are immutable and read-time promotions never enter the persisted payload.
 * The trusted provenance comes only from this port's own loadBaseline result at expectedBase.
 */
function buildPersistedCatalog(
  candidate: CatalogDocumentV1,
  expectedBase: number,
  loaded: AdminStateBaselineResult | null,
): CatalogDocumentV1 | null {
  const candidateSizes = candidate.data.frameSizes ?? [];
  const candidateHasAnyLegacy = candidateSizes.some(
    (item) => owns(item, "wcm") || owns(item, "hcm"),
  );
  const trusted = loaded?.ok && loaded.value.revision === expectedBase ? loaded.value : null;
  const baselineHasAnyLegacy =
    trusted?.catalog.data.frameSizes?.some((item) => owns(item, "wcm") || owns(item, "hcm")) ??
    false;
  if (!candidateHasAnyLegacy && !baselineHasAnyLegacy) return candidate;
  if (trusted === null) return null;

  const baselineSizes = trusted.catalog.data.frameSizes ?? [];
  const baselineById = new Map(baselineSizes.map((item) => [item.id, item] as const));
  const candidateById = new Map(candidateSizes.map((item) => [item.id, item] as const));

  for (const item of candidateSizes) {
    const baseline = baselineById.get(item.id);
    const candidateHasLegacy = owns(item, "wcm") || owns(item, "hcm");
    if (baseline === undefined) {
      if (candidateHasLegacy) return null;
      continue;
    }
    for (const key of ["wcm", "hcm"] as const) {
      if (owns(item, key) !== owns(baseline, key)) return null;
      if (owns(item, key) && !sameJsonValue(item[key], baseline[key])) return null;
    }
  }
  for (const item of baselineSizes) {
    if ((owns(item, "wcm") || owns(item, "hcm")) && !candidateById.has(item.id)) return null;
  }

  const promoted = new Set(trusted.promotedLegacyPrintSizeIds);
  return {
    ...candidate,
    data: {
      ...candidate.data,
      frameSizes: candidateSizes.map((item) => {
        if (!promoted.has(item.id)) return item;
        const clean = { ...item };
        delete clean.printWidthCm;
        delete clean.printHeightCm;
        return clean;
      }),
    },
  };
}

export interface AdminStateWritePortOptions {
  readonly facade: AdminWriteFacade;
  readonly auth: OperatorAuthPort;
  /**
   * The spec 036 read port, reused as-is for the legacy baseline.
   *
   * Reused rather than re-implemented: `admin/state.json`, its fixed path, its size ceiling and its
   * catalog validation already live there, and duplicating them would create a second set of rules
   * that can drift. `packages/firebase/src/admin-read/**` is not modified by this spec.
   */
  readonly legacyRead: AdminStateReadPort;
}

export function createAdminStateWritePort(
  options: AdminStateWritePortOptions,
): AdminStateWritePort {
  const { facade, auth, legacyRead } = options;

  // One save and one baseline load at a time. A second click reuses the running promise instead of
  // starting a second request; disabling a button is a nicety, this is the guarantee.
  let saveInFlight: Promise<AdminStateSaveResult> | null = null;
  let baselineInFlight: Promise<AdminStateBaselineResult> | null = null;
  let loadedBaseline: AdminStateBaselineResult | null = null;

  // ── loadBaseline ─────────────────────────────────────────────────────────────────────────────

  const runBaseline = async (correlationId: string): Promise<AdminStateBaselineResult> => {
    let rawHead: unknown | null;
    try {
      rawHead = await facade.getHead();
    } catch (error) {
      return { ok: false, error: readError(mapBaselineReadError(error), correlationId) };
    }

    if (rawHead === null) {
      // No head yet: the legacy document is the baseline, at logical revision 0.
      const legacy = await legacyRead.load({ correlationId });
      if (!legacy.ok) return { ok: false, error: legacy.error }; // spec 036 error, preserved verbatim
      const value = {
        catalog: legacy.value.document,
        revision: NO_HEAD_REVISION,
        source: "legacy" as const,
        promotedLegacyPrintSizeIds: promotedLegacyPrintSizeIds(
          legacy.value.document,
          legacy.value.report,
        ),
      };
      return {
        ok: true,
        value,
      };
    }

    const validated = validateHead(rawHead);
    // Only the head document's OWN violation is a baseline-invalid error.
    if (!validated.ok) return { ok: false, error: baselineInvalidError(correlationId) };

    let bytes: Uint8Array;
    try {
      bytes = await facade.readObjectBytes({
        objectPath: objectPathForRecId(validated.head.recId),
        maxDownloadSizeBytes: REBUILD_OBJECT_MAX_BYTES,
      });
    } catch (error) {
      // A missing or unreadable referenced object keeps its existing spec 036 read error.
      return { ok: false, error: readError(mapBaselineReadError(error), correlationId) };
    }

    const decoded = decodeCatalog(bytes);
    if (!decoded.ok) return { ok: false, error: readError("INVALID_JSON", correlationId) };
    if (!decoded.document.ok) {
      // only {code, path} pairs travel outwards — never the offending value
      return {
        ok: false,
        error: readError("INVALID_CATALOG", correlationId, decoded.document.errors),
      };
    }

    // A head that exists is authoritative. Falling back to legacy here would show stale data as
    // current and let the operator save on top of it — that is how work is actually lost.
    return {
      ok: true,
      value: {
        catalog: decoded.document.document,
        revision: validated.head.revision,
        source: "rebuild",
        promotedLegacyPrintSizeIds: promotedLegacyPrintSizeIds(
          decoded.document.document,
          decoded.document.report,
        ),
      },
    };
  };

  const loadBaseline = (request: {
    readonly correlationId: string;
  }): Promise<AdminStateBaselineResult> => {
    const correlationId = request?.correlationId;
    if (!isValidCorrelationId(correlationId)) {
      return Promise.resolve({ ok: false, error: readError("INVALID_REQUEST", "") });
    }
    const state = auth.currentOperator();
    if (state.status !== "authenticated") {
      const code =
        state.status === "initializing"
          ? "AUTH_NOT_READY"
          : state.status === "error" && state.code === "ANONYMOUS_NOT_ALLOWED"
            ? "ANONYMOUS_NOT_ALLOWED"
            : "AUTH_REQUIRED";
      return Promise.resolve({ ok: false, error: readError(code, correlationId) });
    }
    if (baselineInFlight !== null) return baselineInFlight;

    const pending = runBaseline(correlationId)
      .then((result) => {
        loadedBaseline = result.ok ? result : null;
        return result;
      })
      .finally(() => {
        baselineInFlight = null; // a manual retry is allowed; an automatic one is not
      });
    baselineInFlight = pending;
    return pending;
  };

  // ── save ─────────────────────────────────────────────────────────────────────────────────────

  const runSave = async (
    correlationId: string,
    expectedBase: number,
    json: string,
  ): Promise<AdminStateSaveResult> => {
    const fail = (code: AdminWriteErrorCode): AdminStateSaveResult => ({
      ok: false,
      error: writeError(code, correlationId),
    });

    // Minted once per save, BEFORE the transaction, and never re-minted — not on an SDK retry and
    // not on a callback re-run. A repeated upload therefore targets the same opaque path, where
    // `resource == null` refuses it on the server.
    const operationId = facade.randomOperationId();
    const recId = recIdFor(operationId);
    const objectPath = objectPathForRecId(recId);

    try {
      await facade.createObjectClaim({ recId, claimedBase: expectedBase });
    } catch (error) {
      // Structure A stops before Storage on every claim failure. An unknown claim outcome may have
      // left a consumed REC, but it cannot have created or overwritten object bytes.
      return fail(mapClaimError(error));
    }

    try {
      await facade.uploadJsonObject({
        objectPath,
        json,
        contentType: REBUILD_OBJECT_CONTENT_TYPE,
      });
    } catch (error) {
      // The head was never touched: the transaction has not been called yet.
      return fail(mapUploadError(error));
    }

    // Pure by contract (§5.5): no id minting, no upload, no logging, no local state change. The SDK
    // may run this several times while the app calls runHeadTransaction exactly once.
    const compute = (current: unknown | null): AdminStateHead => {
      if (current === null) {
        // A missing head is logical revision 0 — it is NOT a licence to start over. An editing
        // session based on revision 5 must not be able to write revision 1 here.
        if (expectedBase !== NO_HEAD_REVISION) throw abortSignal(CONFLICT_SIGNAL);
        return { schemaVersion: HEAD_SCHEMA_VERSION, revision: 1, recId };
      }
      const validated = validateHead(current);
      if (!validated.ok) throw abortSignal(HEAD_UNUSABLE_SIGNAL);
      // expectedBase is fixed before the call and never re-adopted, however many times this re-runs.
      if (validated.head.revision !== expectedBase) throw abortSignal(CONFLICT_SIGNAL);
      return {
        schemaVersion: HEAD_SCHEMA_VERSION,
        revision: validated.head.revision + 1,
        recId,
      };
    };

    try {
      await facade.runHeadTransaction(compute);
      return { ok: true, value: { revision: expectedBase + 1, objectPath } };
    } catch (error) {
      const mark = signalOf(error);
      if (mark === CONFLICT_SIGNAL) return fail("WRITE_CONFLICT");
      if (mark === HEAD_UNUSABLE_SIGNAL) return fail("WRITE_HEAD_FAILED");

      const outcome = classifyTransactionError(error);
      if (outcome.kind === "definite") return fail(outcome.code);

      // Indeterminate. A local timeout does NOT cancel the SDK transaction, so we cannot call this
      // a failure — one bounded read-only reconciliation decides it, or it stays undecided.
      return reconcile(correlationId, expectedBase, recId);
    }
  };

  /**
   * Read-only reconciliation for an indeterminate transaction (spec 037 §6.6).
   *
   * NOT a retry: zero re-upload, zero second transaction, at most ONE read, never inside the
   * transaction callback.
   */
  const reconcile = async (
    correlationId: string,
    expectedBase: number,
    recId: string,
  ): Promise<AdminStateSaveResult> => {
    const unknownOutcome: AdminStateSaveResult = {
      ok: false,
      error: writeError("WRITE_COMMIT_OUTCOME_UNKNOWN", correlationId),
    };

    let rawHead: unknown | null;
    try {
      rawHead = await facade.getHead();
    } catch {
      return unknownOutcome;
    }

    // Still at the logical base. This says "not yet", NOT "never": the original transaction may
    // still land on the server. So it stays undecided, and the object is not called an orphan.
    if (rawHead === null) return unknownOutcome;

    const validated = validateHead(rawHead);
    if (!validated.ok) return unknownOutcome;
    const head = validated.head;

    if (head.revision === expectedBase + 1) {
      if (head.recId === recId) {
        // Our commit landed. A write-once REC makes this recId unique to this transition.
        return {
          ok: true,
          value: { revision: head.revision, objectPath: objectPathForRecId(recId) },
        };
      }
      // Another writer won. The head is no longer `expectedBase`, and a revision only advances, so
      // this operation's late commit can never win the CAS — the uploaded object is an orphan.
      return { ok: false, error: writeError("WRITE_CONFLICT", correlationId) };
    }

    // `head.revision === expectedBase` -> late commit still possible.
    // `head.revision > expectedBase + 1` -> we cannot tell whether we were an intermediate step.
    return unknownOutcome;
  };

  const save = (request: AdminStateSaveRequest): Promise<AdminStateSaveResult> => {
    const correlationId = request?.correlationId;
    if (!isValidCorrelationId(correlationId)) {
      return Promise.resolve({ ok: false, error: writeError("WRITE_INVALID_INPUT", "") });
    }
    const invalid = (): Promise<AdminStateSaveResult> =>
      Promise.resolve({ ok: false, error: writeError("WRITE_INVALID_INPUT", correlationId) });

    // Validated FIRST: an invalid base must never create an object.
    if (!isValidExpectedBase(request?.expectedBase)) return invalid();

    // The payload is re-validated at runtime against the SAME authority the read path uses.
    // `CatalogDocumentV1` is only a compile-time claim, and an immutable object is permanent — an
    // unreadable one would sit at the head forever. Everything downstream serialises the VALIDATED
    // document, never the caller's object, so a hostile getter cannot swap the bytes afterwards.
    let validated: ReturnType<typeof readLegacyCatalog>;
    try {
      validated = readLegacyCatalog(request?.catalog);
    } catch {
      return invalid(); // circular or otherwise hostile input
    }
    if (!validated.ok) return invalid();

    if (authBlocked(auth)) {
      // Nothing is uploaded and no transaction runs in this branch.
      return Promise.resolve({
        ok: false,
        error: writeError("WRITE_AUTH_REQUIRED", correlationId),
      });
    }

    // expectedBase is not caller lore: it must be the exact revision this port loaded. Besides
    // preventing fabricated bases, this is what makes F-D provenance authoritative even when a
    // candidate removed every legacy field and would otherwise look like a legacy-free catalog.
    if (
      loadedBaseline === null ||
      !loadedBaseline.ok ||
      loadedBaseline.value.revision !== request.expectedBase
    ) {
      return invalid();
    }

    const persisted = buildPersistedCatalog(
      validated.document,
      request.expectedBase,
      loadedBaseline,
    );
    if (persisted === null) return invalid();

    let json: string;
    try {
      // Do not stringify validated.document directly: readLegacyCatalog intentionally promotes
      // legacy wcm/hcm in memory, while F-D forbids that promotion from becoming a write-back.
      json = JSON.stringify(persisted);
    } catch {
      return invalid();
    }
    if (typeof json !== "string") return invalid(); // stringify yields undefined for non-JSON input

    let byteLength: number;
    try {
      byteLength = new TextEncoder().encode(json).byteLength;
    } catch {
      return invalid();
    }
    if (byteLength > REBUILD_OBJECT_MAX_BYTES) return invalid();

    if (saveInFlight !== null) return saveInFlight;

    const pending = runSave(correlationId, request.expectedBase, json).finally(() => {
      saveInFlight = null; // a manual retry is allowed; an automatic one is not
    });
    saveInFlight = pending;
    return pending;
  };

  return { loadBaseline, save };
}
