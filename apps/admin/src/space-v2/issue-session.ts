// Local-only space V2 admin issue session (spec 081).
//
// The point of this boundary is WHOSE proof PNG gets issued. There is deliberately no
// `issue({pngBytes, ...metadata})` seam: a caller cannot hand this session an arbitrary image next
// to independently chosen metadata. Instead ONE frozen draft handle owns both — the validated C5
// catalog snapshot with its selection, orientation, logical width, colour and transform, AND the
// exporter that produces the proof bytes for exactly that composition. `issue()` takes nothing but
// the password pair.
//
//   beginDraft(source) -> copyFields() once, deep-frozen
//   issue({password, confirmation})
//     -> password exact match      (nothing spent on failure)
//     -> exportProofPng()          exactly once, from the SAME handle
//     -> prepareSpaceV2LocalIssueBundle()  exactly once (spec 072)
//     -> writer.issue()            exactly once (spec 074 port)
//
// This module is NOT wired into `App.tsx`, `main.tsx`, any route or an app barrel, so the shipped
// admin bundle is unchanged. It imports no Firebase SDK — only the injected write PORT and its
// types — and touches no network, DOM, Canvas, URL, clipboard, clock or global randomness. It does
// not claim the exporter is connected to a real render owner; that production composition is a
// later admin UI spec.

import type { SpaceV2IssueErrorCode, SpaceV2IssueWritePort } from "@denn/firebase/space-write";
import type { SpaceCryptoPort, SpaceSha256Port } from "@denn/spaces";
import { prepareSpaceV2LocalIssueBundle, type SpaceV2LocalIssueBundleInput } from "./issue-bundle";
import type { SpaceV2IssueUuidPort } from "./issue-token-candidate";

/** Everything the bundle needs except the two values `issue()` supplies: the bytes and the password. */
export type SpaceV2FrozenIssueFields = Omit<SpaceV2LocalIssueBundleInput, "pngBytes" | "password">;

/**
 * The single source of truth for one issue attempt. Metadata and proof bytes come from the SAME
 * handle, which is what makes "the PNG describes this composition" a structural property rather
 * than a caller promise.
 */
export interface SpaceV2FrozenIssueDraftSource {
  copyFields(): SpaceV2FrozenIssueFields;
  exportProofPng(): Promise<Uint8Array>;
}

export type SpaceV2IssueSessionStatus =
  | "empty"
  | "draft-ready"
  | "preparing"
  | "issuing"
  | "success"
  | "error"
  | "outcome-unknown"
  | "disposed";

/**
 * Which local step refused. A failure carries nothing else — no child error code, no password,
 * UUID/token value or fragment, object path, digest, bytes, UID/email, SDK message or stack.
 */
export type SpaceV2IssueSessionErrorCode =
  // the source handle, or the fields it returned, is unusable; nothing was exported or generated.
  | "SPACE_V2_SESSION_INVALID_DRAFT"
  // the request was not a usable, non-empty, exactly matching password pair. Nothing was spent.
  | "SPACE_V2_SESSION_PASSWORD_MISMATCH"
  // the frozen exporter threw, rejected, or returned something that is not PNG bytes.
  | "SPACE_V2_SESSION_PROOF_FAILED"
  // the spec 072 local bundle refused, or the write request could not be assembled. Writer: 0.
  | "SPACE_V2_SESSION_PREPARATION_FAILED";

export interface SpaceV2IssueSessionSnapshot {
  readonly status: SpaceV2IssueSessionStatus;
  readonly canIssue: boolean;
  readonly errorCode: SpaceV2IssueSessionErrorCode | SpaceV2IssueErrorCode | null;
  /** Present only after the writer confirmed success. The object path never appears here. */
  readonly confirmedToken: string | null;
}

export interface SpaceV2IssueSessionController {
  subscribe(listener: (snapshot: SpaceV2IssueSessionSnapshot) => void): () => void;
  getSnapshot(): SpaceV2IssueSessionSnapshot;
  beginDraft(source: SpaceV2FrozenIssueDraftSource): void;
  clearDraft(): void;
  issue(request: { readonly password: string; readonly confirmation: string }): Promise<void>;
  dispose(): void;
}

export interface SpaceV2IssueSessionDependencies {
  readonly uuid: SpaceV2IssueUuidPort;
  readonly crypto: SpaceCryptoPort;
  readonly sha256: SpaceSha256Port;
  /** The spec 074 port. This session knows no Firebase SDK type. */
  readonly writer: SpaceV2IssueWritePort;
  readonly createCorrelationId: () => string;
}

const SOURCE_KEYS = ["copyFields", "exportProofPng"] as const;
const REQUEST_KEYS = ["password", "confirmation"] as const;
const FIELD_KEYS = [
  "catalog",
  "selection",
  "frameOrientation",
  "logicalWidth",
  "frameColor",
  "transform",
] as const;

const OUTCOME_UNKNOWN_CODES: ReadonlySet<SpaceV2IssueErrorCode> = new Set([
  "SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN",
  "SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN",
]);

/**
 * Exact-key detached read: every property is taken ONCE into a plain object, so a hostile getter
 * cannot show one value to the guard and another to the Firebase call. Extra, missing,
 * non-enumerable or symbol keys are a rejection, never a repair.
 */
function exactSnapshot<const Keys extends readonly string[]>(
  value: unknown,
  keys: Keys,
): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string")) {
      return null;
    }
    for (const key of ownKeys) {
      if (!Reflect.getOwnPropertyDescriptor(value, key)?.enumerable) return null;
    }
    const present = new Set(ownKeys as string[]);
    if (keys.some((key) => !present.has(key))) return null;
    const source = value as Record<string, unknown>;
    const snapshot: Record<string, unknown> = {};
    for (const key of keys) snapshot[key] = source[key];
    return snapshot;
  } catch {
    return null;
  }
}

interface FrozenDraft {
  readonly fields: SpaceV2FrozenIssueFields;
  readonly exportProofPng: () => Promise<Uint8Array>;
}

/**
 * Freeze the draft: exact top-level keys, then a structured deep clone. The clone is what makes
 * "frozen" literal rather than nominal — mutating the caller's catalog, selection or transform
 * after `beginDraft` cannot reach the values this session will issue. A payload that cannot be
 * cloned (functions, symbols, hostile proxies) fails closed instead of being partially copied.
 */
function freezeFields(raw: unknown): SpaceV2FrozenIssueFields | null {
  const snapshot = exactSnapshot(raw, FIELD_KEYS);
  if (snapshot === null) return null;
  try {
    return structuredClone(snapshot) as unknown as SpaceV2FrozenIssueFields;
  } catch {
    return null;
  }
}

export function createSpaceV2IssueSession(
  dependencies: SpaceV2IssueSessionDependencies,
): SpaceV2IssueSessionController {
  const { uuid, crypto, sha256, writer, createCorrelationId } = dependencies;

  const EMPTY: SpaceV2IssueSessionSnapshot = {
    status: "empty",
    canIssue: false,
    errorCode: null,
    confirmedToken: null,
  };

  let snapshot: SpaceV2IssueSessionSnapshot = EMPTY;
  let draft: FrozenDraft | null = null;
  let disposed = false;
  let inFlight = false;
  /**
   * True once `writer.issue()` has been called for the in-flight attempt. From that moment the
   * remote outcome exists independently of this session, so abandoning the attempt must never be
   * reported as "nothing happened".
   */
  let writeStarted = false;
  /** Bumped by begin/clear/dispose, so a late completion cannot overwrite a newer state. */
  let generation = 0;
  const listeners = new Set<(snapshot: SpaceV2IssueSessionSnapshot) => void>();

  const publish = (next: SpaceV2IssueSessionSnapshot): void => {
    snapshot = next;
    for (const listener of [...listeners]) {
      try {
        listener(next);
      } catch {
        // a subscriber must never break the session, and this module prints nothing
      }
    }
  };

  const settle = (
    status: SpaceV2IssueSessionStatus,
    errorCode: SpaceV2IssueSessionSnapshot["errorCode"],
    confirmedToken: string | null = null,
  ): void => {
    publish({ status, canIssue: false, errorCode, confirmedToken });
  };

  /**
   * Abandon whatever is in flight. When the writer had already been called the remote result may
   * still land, so the session closes as `outcome-unknown` and refuses to open a new issue rather
   * than pretending the operation was cancelled.
   */
  const abandonInFlight = (): boolean => {
    if (!inFlight) return false;
    const persisted = writeStarted;
    inFlight = false;
    writeStarted = false;
    return persisted;
  };

  const beginDraft = (source: SpaceV2FrozenIssueDraftSource): void => {
    if (disposed) return;
    generation += 1;
    const persisted = abandonInFlight();
    draft = null;
    if (persisted) {
      settle("outcome-unknown", null);
      return;
    }

    const handle = exactSnapshot(source, SOURCE_KEYS);
    if (handle === null) {
      settle("error", "SPACE_V2_SESSION_INVALID_DRAFT");
      return;
    }
    const copyFields = handle.copyFields;
    const exportProofPng = handle.exportProofPng;
    if (typeof copyFields !== "function" || typeof exportProofPng !== "function") {
      settle("error", "SPACE_V2_SESSION_INVALID_DRAFT");
      return;
    }

    let raw: unknown;
    try {
      // Exactly once, at freeze time. Nothing re-reads, reloads, adopts or merges it later.
      raw = copyFields.call(source);
    } catch {
      settle("error", "SPACE_V2_SESSION_INVALID_DRAFT");
      return;
    }
    const fields = freezeFields(raw);
    if (fields === null) {
      settle("error", "SPACE_V2_SESSION_INVALID_DRAFT");
      return;
    }

    // The exporter is bound to its original receiver, read once, so the handle cannot be swapped
    // between the freeze and the export.
    draft = { fields, exportProofPng: exportProofPng.bind(source) as () => Promise<Uint8Array> };
    publish({ status: "draft-ready", canIssue: true, errorCode: null, confirmedToken: null });
  };

  const clearDraft = (): void => {
    if (disposed) return;
    generation += 1;
    const persisted = abandonInFlight();
    draft = null;
    if (persisted) {
      settle("outcome-unknown", null);
      return;
    }
    publish(EMPTY);
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    generation += 1;
    inFlight = false;
    writeStarted = false;
    draft = null;
    publish({ status: "disposed", canIssue: false, errorCode: null, confirmedToken: null });
    listeners.clear();
  };

  const run = async (
    current: number,
    frozen: FrozenDraft,
    passwordPair: { password: string },
  ): Promise<void> => {
    const isCurrent = (): boolean => !disposed && current === generation;

    // --- proof: the ONLY source of bytes is the frozen handle ---------------
    publish({ status: "preparing", canIssue: false, errorCode: null, confirmedToken: null });
    let exported: unknown;
    try {
      exported = await frozen.exportProofPng();
    } catch {
      if (isCurrent()) {
        inFlight = false;
        settle("error", "SPACE_V2_SESSION_PROOF_FAILED");
      }
      return;
    }
    if (!isCurrent()) return;
    if (!(exported instanceof Uint8Array)) {
      inFlight = false;
      settle("error", "SPACE_V2_SESSION_PROOF_FAILED");
      return;
    }
    // Copied the moment it arrives: a source that keeps mutating its buffer after the await cannot
    // change what gets hashed, encrypted and uploaded.
    const pngBytes = new Uint8Array(exported);

    // --- local bundle (spec 072) -------------------------------------------
    let prepared: Awaited<ReturnType<typeof prepareSpaceV2LocalIssueBundle>>;
    try {
      prepared = await prepareSpaceV2LocalIssueBundle(
        { ...frozen.fields, pngBytes, password: passwordPair.password },
        uuid,
        crypto,
        sha256,
      );
    } catch {
      if (isCurrent()) {
        inFlight = false;
        settle("error", "SPACE_V2_SESSION_PREPARATION_FAILED");
      }
      return;
    } finally {
      // The password is not kept past the call that needs it.
      passwordPair.password = "";
    }
    if (!isCurrent()) return;
    if (!prepared.ok) {
      // The child code stays inside spec 072; only "preparation refused" leaves this boundary.
      inFlight = false;
      settle("error", "SPACE_V2_SESSION_PREPARATION_FAILED");
      return;
    }

    // --- write (spec 074 port) ---------------------------------------------
    let correlationId: string;
    try {
      correlationId = createCorrelationId();
    } catch {
      // Local only: the writer was never called, so nothing was persisted.
      inFlight = false;
      settle("error", "SPACE_V2_SESSION_PREPARATION_FAILED");
      return;
    }

    publish({ status: "issuing", canIssue: false, errorCode: null, confirmedToken: null });
    writeStarted = true;
    let result: Awaited<ReturnType<SpaceV2IssueWritePort["issue"]>>;
    try {
      result = await writer.issue({ correlationId, bundle: prepared.value });
    } catch {
      // The port contract says it does not throw. If it does, the request had already left, so the
      // remote outcome is genuinely unknown — never reported as a failure the operator can retry.
      if (isCurrent()) {
        inFlight = false;
        writeStarted = false;
        settle("outcome-unknown", null);
      }
      return;
    }
    if (!isCurrent()) return;
    inFlight = false;
    writeStarted = false;

    if (result?.ok === true) {
      const token = result.value?.token;
      if (typeof token !== "string" || token === "") {
        settle("outcome-unknown", null);
        return;
      }
      // Only the token. The object path stays out of the UI-facing snapshot, and no URL is built.
      settle("success", null, token);
      return;
    }
    if (result?.ok === false) {
      const code = result.error?.code;
      if (typeof code === "string" && OUTCOME_UNKNOWN_CODES.has(code as SpaceV2IssueErrorCode)) {
        // Never guessed into success or failure, and `retryable` is not a licence to retry.
        settle("outcome-unknown", code as SpaceV2IssueErrorCode);
        return;
      }
      settle("error", typeof code === "string" ? (code as SpaceV2IssueErrorCode) : null);
      return;
    }
    // A malformed writer result after the request left: same reasoning as a throw.
    settle("outcome-unknown", null);
  };

  const issue = (request: {
    readonly password: string;
    readonly confirmation: string;
  }): Promise<void> => {
    if (disposed) return Promise.resolve();
    // A second call while one is running adds no export, no identity and no write.
    if (inFlight) return Promise.resolve();
    if (draft === null || snapshot.status !== "draft-ready") {
      // Every definite outcome — including a password refusal — needs a fresh frozen draft before
      // the next attempt, so an identity is never reused and the composition is re-frozen.
      if (draft === null) settle("error", "SPACE_V2_SESSION_INVALID_DRAFT");
      return Promise.resolve();
    }

    const taken = exactSnapshot(request, REQUEST_KEYS);
    const password = taken?.password;
    const confirmation = taken?.confirmation;
    if (
      taken === null ||
      typeof password !== "string" ||
      typeof confirmation !== "string" ||
      password === "" ||
      password !== confirmation
    ) {
      // Nothing is exported, generated, hashed, encrypted or written on this path.
      settle("error", "SPACE_V2_SESSION_PASSWORD_MISMATCH");
      return Promise.resolve();
    }

    inFlight = true;
    writeStarted = false;
    const current = generation;
    const frozen = draft;
    return run(current, frozen, { password }).catch(() => {
      if (disposed || current !== generation) return;
      inFlight = false;
      writeStarted = false;
      settle("error", "SPACE_V2_SESSION_PREPARATION_FAILED");
    });
  };

  return {
    subscribe: (listener) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    beginDraft,
    clearDraft,
    issue,
    dispose,
  };
}
