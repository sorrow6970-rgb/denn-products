// Local-only space V2 admin issue session (spec 081).
//
// The point of this boundary is WHOSE proof PNG gets issued. There is deliberately no
// `issue({pngBytes, ...metadata})` seam: a caller cannot hand this session an arbitrary image next
// to independently chosen metadata. Instead ONE frozen draft handle owns both — the validated C5
// catalog snapshot with its selection, orientation, logical width, colour and transform, AND the
// exporter that produces the proof bytes for exactly that composition. `issue()` takes nothing but
// the password pair.
//
//   beginDraft(source) -> copyFields() once, then a SEMANTIC preflight, then frozen
//   issue({password, confirmation})
//     -> password exact match      (nothing spent on failure)
//     -> exportProofPng()          exactly once, from the SAME handle
//     -> prepareSpaceV2LocalIssueBundle()  exactly once (spec 072)
//     -> writer.issue()            exactly once (spec 074 port)
//
// The preflight matters: exact keys alone would let a structurally fine but semantically invalid
// composition (a null catalog, a selection that names nothing, a landscape orientation on a
// portrait aspect, a colour that is not `#RRGGBB`, art that cannot be proven absent) reach
// `draft-ready` and only fail after the exporter, two UUIDs, three hashes and an encryption had
// already been spent. So `beginDraft` re-uses the EXISTING boundaries — `readLegacyCatalog`, the
// shared catalog projections and the pure `encodeFrameReplayEvidenceV1` validator — before any of
// that is spent, and stores only the detached values those boundaries returned.
//
// This module is NOT wired into `App.tsx`, `main.tsx`, any route or an app barrel, so the shipped
// admin bundle is unchanged. It imports no Firebase SDK — only the injected write PORT and its
// types — and touches no network, DOM, Canvas, URL, clipboard, clock or global randomness. It does
// not claim the exporter is connected to a real render owner; that production composition is a
// later admin UI spec.

import type {
  SpaceV2IssueErrorCategory,
  SpaceV2IssueErrorCode,
  SpaceV2IssueWritePort,
} from "@denn/firebase/space-write";
import {
  type CatalogDocumentV1,
  projectCatalogTemplateImage,
  projectFramePreviewGeometry,
  readLegacyCatalog,
} from "@denn/shared";
import {
  encodeFrameReplayEvidenceV1,
  FRAME_REPLAY_CONTRACT_V1,
  type FrameReplayEvidenceV1,
  type SpaceCryptoPort,
  type SpaceSha256Port,
} from "@denn/spaces";
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

const SELECTION_KEYS = ["frameSizeId", "templateId"] as const;
const TRANSFORM_KEYS = ["scale", "x", "y", "rotationQuarterTurns"] as const;
const RESULT_SUCCESS_KEYS = ["ok", "value"] as const;
const RESULT_FAILURE_KEYS = ["ok", "error"] as const;
const ISSUE_VALUE_KEYS = ["token", "objectPath"] as const;
const ISSUE_ERROR_KEYS = ["category", "code", "retryable", "correlationId"] as const;

const OUTCOME_UNKNOWN_CODES: ReadonlySet<SpaceV2IssueErrorCode> = new Set([
  "SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN",
  "SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN",
]);

/**
 * The spec 074 failure vocabulary AND the exact metadata each code is issued with. Checking the
 * three fields independently is not enough: `AUTH_REQUIRED` carrying `category: "VALIDATION"` and
 * `retryable: false` is a combination the port never produces, so believing it would mean accepting
 * an envelope no real write attempt could have returned.
 *
 * `satisfies Record<SpaceV2IssueErrorCode, ...>` is the exhaustiveness guarantee: adding a code to
 * the union without adding it here is a compile error, so this table cannot silently fall behind.
 */
const ISSUE_ERROR_METADATA = {
  SPACE_V2_ISSUE_INVALID_INPUT: { category: "VALIDATION", retryable: false },
  SPACE_V2_ISSUE_AUTH_REQUIRED: { category: "AUTH", retryable: true },
  SPACE_V2_ISSUE_FORBIDDEN: { category: "AUTH", retryable: false },
  SPACE_V2_ISSUE_UPLOAD_FAILED: { category: "NETWORK", retryable: true },
  SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN: { category: "NETWORK", retryable: false },
  SPACE_V2_ISSUE_DOCUMENT_FAILED: { category: "VALIDATION", retryable: false },
  SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN: { category: "UNKNOWN", retryable: false },
  SPACE_V2_ISSUE_ASSET_MISMATCH: { category: "VALIDATION", retryable: false },
} as const satisfies Record<
  SpaceV2IssueErrorCode,
  { readonly category: SpaceV2IssueErrorCategory; readonly retryable: boolean }
>;

/** Own-key lookup only: a code like `toString` must not resolve through the prototype. */
function issueErrorMetadata(
  code: string,
): { readonly category: SpaceV2IssueErrorCategory; readonly retryable: boolean } | null {
  if (!Object.hasOwn(ISSUE_ERROR_METADATA, code)) return null;
  return (
    ISSUE_ERROR_METADATA as Record<
      string,
      { readonly category: SpaceV2IssueErrorCategory; readonly retryable: boolean }
    >
  )[code];
}

/**
 * Re-stated locally on purpose: this module may take only types and the injected port from
 * `@denn/firebase/space-write`. The port stays the authority on both shapes — these copies exist so
 * an unusable correlation id costs no write attempt, and so an echoed token is checked twice.
 */
const CORRELATION_ID = /^[0-9a-f]{8,64}$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Fixed by the spec 064 contract; the indexed access type makes drift a compile error. */
const TRANSFORM_ENCODING: FrameReplayEvidenceV1["transformEncoding"] = "normalized-max-pan-v1";

/**
 * A fixed, known-valid proof descriptor used ONLY to exercise the evidence validator at freeze
 * time, when the real proof does not exist yet. The validator checks `proofAsset` independently of
 * every other field, so substituting it here changes nothing about what is being verified:
 * orientation vs projected aspect, logical width, colour, geometry and transform.
 */
const PREFLIGHT_PROOF: FrameReplayEvidenceV1["proofAsset"] = {
  objectPath: "rebuild-space-assets/objects/00000000-0000-4000-8000-000000000000.png",
  sha256: `${"A".repeat(43)}=`,
  byteLength: 1,
  contentType: "image/png",
  intrinsicWidth: 1,
  intrinsicHeight: 1,
};

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
 * Freeze the draft: exact top-level keys, then a SEMANTIC preflight through the boundaries that
 * already own these rules, then keep only what those boundaries handed back.
 *
 * Nothing here re-states a range, a format or the orientation/aspect agreement — `readLegacyCatalog`
 * owns the catalog, `projectFramePreviewGeometry` owns the geometry, `projectCatalogTemplateImage`
 * owns the art verdict and `encodeFrameReplayEvidenceV1` owns the evidence contract. Duplicating any
 * of them here would let this session drift from what the issue path will actually accept.
 *
 * Every stored value is already detached: `readLegacyCatalog` returns a deep clone, the selection
 * and transform are rebuilt as fresh literals from the validated evidence, and the rest are
 * primitives. So mutating the caller's catalog, selection or transform after `beginDraft` cannot
 * reach what gets issued.
 */
function freezeFields(raw: unknown): SpaceV2FrozenIssueFields | null {
  try {
    const snapshot = exactSnapshot(raw, FIELD_KEYS);
    if (snapshot === null) return null;
    const selection = exactSnapshot(snapshot.selection, SELECTION_KEYS);
    const transform = exactSnapshot(snapshot.transform, TRANSFORM_KEYS);
    if (selection === null || transform === null) return null;
    const { frameSizeId, templateId } = selection;
    if (typeof frameSizeId !== "string" || typeof templateId !== "string") return null;

    // Detached ONCE, before anything is projected from it, so the geometry and the art verdict
    // describe the same instant even if the caller's catalog has drifting getters.
    const read = readLegacyCatalog(snapshot.catalog);
    if (!read.ok) return null;
    const document: CatalogDocumentV1 = read.document;

    const projected = projectFramePreviewGeometry(document, { frameSizeId, templateId });
    if (!projected.ok) return null;
    const geometry = projected.value;

    // The same first-capability gate the spec 065 projector applies: image only, no operator text,
    // no physical clock, and art whose absence is PROVEN (`invalid-reference` proves nothing).
    const templateImage = projectCatalogTemplateImage(document, {
      templateKind: "frame",
      templateId,
    });
    if (
      geometry.textZones.length > 0 ||
      geometry.clockPreview !== null ||
      templateImage.status === "available" ||
      templateImage.reason === "invalid-reference"
    ) {
      return null;
    }

    // Pure — no SHA-256 port, no identity, no encryption. It validates orientation vs the projected
    // aspect, the logical width, the colours, the geometry and the transform, and hands back a
    // detached, normalised copy.
    const encoded = encodeFrameReplayEvidenceV1({
      replayContract: FRAME_REPLAY_CONTRACT_V1,
      frameOrientation: snapshot.frameOrientation,
      logicalWidth: snapshot.logicalWidth,
      geometry: {
        aspect: geometry.aspect,
        borderPercentOfWidth: geometry.borderPercentOfWidth,
        matColor: geometry.matColor,
        contentInsetPx: geometry.contentInsetPx,
      },
      frameColor: snapshot.frameColor,
      transformEncoding: TRANSFORM_ENCODING,
      transform: {
        scale: transform.scale,
        x: transform.x,
        y: transform.y,
        rotationQuarterTurns: transform.rotationQuarterTurns,
      },
      proofAsset: PREFLIGHT_PROOF,
      templateArt: { kind: "none" },
      textMode: "none",
      clockMode: "off",
    });
    if (!encoded.ok) return null;
    const evidence = encoded.value.evidence;

    return {
      catalog: document,
      selection: { frameSizeId, templateId },
      frameOrientation: evidence.frameOrientation,
      logicalWidth: evidence.logicalWidth,
      frameColor: evidence.frameColor,
      transform: {
        scale: evidence.transform.scale,
        x: evidence.transform.x,
        y: evidence.transform.y,
        rotationQuarterTurns: evidence.transform.rotationQuarterTurns,
      },
    };
  } catch {
    return null;
  }
}

type WriterVerdict =
  | { readonly kind: "success" }
  | { readonly kind: "error"; readonly code: SpaceV2IssueErrorCode }
  | { readonly kind: "unknown" };

/**
 * Classify what came back from the write port, without ever copying a value out of it.
 *
 * A result is only believed when its whole envelope is exact: the top level, the success value or
 * the failure error, a code and category from the spec 074 vocabulary, a boolean `retryable`, and
 * the correlation id THIS attempt sent. A success additionally has to name the very token and
 * object path the prepared bundle already fixed — an echo that names anything else is not a
 * confirmation of this issue.
 *
 * Anything unrecognised is `unknown`, which the caller closes as `outcome-unknown` with a null
 * code: the request had already left, so it is neither a success nor a definite failure, and no
 * unvetted string from the port is allowed into the public snapshot.
 */
function classifyWriterResult(
  raw: unknown,
  expected: { token: string; objectPath: string; correlationId: string },
): WriterVerdict {
  try {
    const success = exactSnapshot(raw, RESULT_SUCCESS_KEYS);
    if (success !== null && success.ok === true) {
      const value = exactSnapshot(success.value, ISSUE_VALUE_KEYS);
      if (value === null) return { kind: "unknown" };
      if (typeof value.token !== "string" || !UUID_V4.test(value.token)) {
        return { kind: "unknown" };
      }
      if (value.token !== expected.token || value.objectPath !== expected.objectPath) {
        return { kind: "unknown" };
      }
      return { kind: "success" };
    }

    const failure = exactSnapshot(raw, RESULT_FAILURE_KEYS);
    if (failure !== null && failure.ok === false) {
      const error = exactSnapshot(failure.error, ISSUE_ERROR_KEYS);
      if (error === null) return { kind: "unknown" };
      const { category, code, retryable, correlationId } = error;
      if (typeof code !== "string") return { kind: "unknown" };
      const meta = issueErrorMetadata(code);
      if (meta === null) return { kind: "unknown" };
      // The whole triple has to be the one this code is actually issued with. The strict compare
      // against a boolean also rejects a non-boolean `retryable` without a separate check.
      if (category !== meta.category || retryable !== meta.retryable) return { kind: "unknown" };
      if (correlationId !== expected.correlationId) return { kind: "unknown" };
      return { kind: "error", code: code as SpaceV2IssueErrorCode };
    }

    return { kind: "unknown" };
  } catch {
    return { kind: "unknown" };
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
    // The token and object path this attempt is allowed to confirm are fixed HERE, before the
    // request leaves, so the writer's echo is compared against a value it cannot influence.
    let correlationId: string;
    let expectedToken: string;
    let expectedObjectPath: string;
    try {
      correlationId = createCorrelationId();
      expectedToken = prepared.value.token;
      expectedObjectPath = prepared.value.copyProofDescriptor().objectPath;
    } catch {
      // Local only: the writer was never called, so nothing was persisted.
      inFlight = false;
      settle("error", "SPACE_V2_SESSION_PREPARATION_FAILED");
      return;
    }
    if (
      typeof correlationId !== "string" ||
      !CORRELATION_ID.test(correlationId) ||
      typeof expectedObjectPath !== "string"
    ) {
      // Refused before the write rather than spending an attempt the port would reject anyway.
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

    const verdict = classifyWriterResult(result, {
      token: expectedToken,
      objectPath: expectedObjectPath,
      correlationId,
    });
    if (verdict.kind === "success") {
      // The locally prepared token, never the string the port echoed. The object path stays out of
      // the UI-facing snapshot, and no URL is built.
      settle("success", null, expectedToken);
      return;
    }
    if (verdict.kind === "error") {
      if (OUTCOME_UNKNOWN_CODES.has(verdict.code)) {
        // Never guessed into success or failure, and `retryable` is not a licence to retry.
        settle("outcome-unknown", verdict.code);
        return;
      }
      settle("error", verdict.code);
      return;
    }
    // Unrecognised envelope after the request left: same reasoning as a throw.
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
