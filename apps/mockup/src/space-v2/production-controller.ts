// Versioned customer `?space=` view controller (spec 080 §3 N-1, N-3, N-4).
//
// One document read, then an exact dispatch: a top-level `schema === "space-v2"` marker goes to the
// spec 078 replay pipeline and NOWHERE else. A malformed V2 payload is never retried as V1 — the
// whole point of the marker is that the issuer said which contract this link was written under, so
// falling back would compose a screen the evidence does not support.
//
// Nothing here holds the password beyond the call, and no state, error or log carries a token, a
// path, a digest, raw bytes, an SDK code or a Firebase config value.

import type { SpaceDocumentReadPort, SpaceDocumentReadResult } from "@denn/firebase/space-read";
import type { PreviewRenderPlan } from "@denn/render";
import {
  type OpenedSpaceV1,
  SPACE_DOCUMENT_V2_VERSION,
  type SpaceOpenPort,
  type SpaceOpenResult,
} from "@denn/spaces";
import type { PreviewImageBindings } from "../canvas/types";
import type { SpaceViewErrorCode } from "../space/controller";
import { readSpaceLink } from "../space/link";
import { safeSpaceViewMessage } from "../space/messages";
import type {
  SpaceV2FrameReplayController,
  SpaceV2FrameReplayErrorCode,
} from "./replay-controller";

/** V2-only view codes. The V1 codes stay exactly as spec 063 left them. */
export type SpaceV2ViewErrorCode =
  | "SPACE_V2_VIEW_PASSWORD_REJECTED"
  | "SPACE_V2_VIEW_PROOF_UNAVAILABLE"
  | "SPACE_V2_VIEW_UNAVAILABLE";

export type SpaceVersionedViewErrorCode = SpaceViewErrorCode | SpaceV2ViewErrorCode;

const V2_MESSAGES: Record<SpaceV2ViewErrorCode, string> = {
  SPACE_V2_VIEW_PASSWORD_REJECTED: "비밀번호가 올바르지 않습니다.",
  // Deliberately general: "why" would have to name the object, the bucket or the SDK failure.
  SPACE_V2_VIEW_PROOF_UNAVAILABLE: "시안을 불러오지 못했습니다. 잠시 후 다시 시도하세요.",
  SPACE_V2_VIEW_UNAVAILABLE: "시안을 표시할 수 없습니다.",
};

export function safeSpaceVersionedViewMessage(code: SpaceVersionedViewErrorCode): string {
  return Object.hasOwn(V2_MESSAGES, code)
    ? V2_MESSAGES[code as SpaceV2ViewErrorCode]
    : safeSpaceViewMessage(code as SpaceViewErrorCode);
}

/** The V2 half of the spec 080 N-4 ready union. */
export interface SpaceV2ReadyView {
  readonly plan: PreviewRenderPlan;
  readonly imageBindings: PreviewImageBindings;
}

/**
 * The spec 080 N-4 ready union, expressed as two `status: "ready"` variants rather than a nested
 * `kind` field. That is deliberate: the V1 variant then stays IDENTICAL to the spec 063
 * `SpaceViewState` ready shape, so the existing password gate and its V1 fixtures keep working
 * against the same seam instead of being rewritten around a new discriminator. The public meaning
 * is exactly "either an opened V1 space or a V2 plan plus its drawable lookup" — nothing wider.
 */
export type SpaceVersionedViewState =
  | { readonly status: "inactive" }
  | { readonly status: "invalid-link" }
  | { readonly status: "awaiting-password" }
  | { readonly status: "loading"; readonly requestId: number }
  | {
      readonly status: "error";
      readonly requestId: number;
      readonly code: SpaceVersionedViewErrorCode;
      readonly retryable: boolean;
    }
  | { readonly status: "ready"; readonly requestId: number; readonly value: OpenedSpaceV1 }
  | { readonly status: "ready"; readonly requestId: number; readonly v2: SpaceV2ReadyView };

/**
 * What the password gate needs from a controller. Structural on purpose: the spec 063
 * `SpaceLinkOpenController` satisfies it unchanged (its state is a subset of the union above), so
 * the V1-only fixtures are not dragged into this spec.
 */
export interface SpaceGateController {
  getState(): SpaceVersionedViewState;
  subscribe(listener: () => void): () => void;
  attach(): void;
  detach(): void;
  submitPassword(password: unknown): void;
}

/**
 * The lazily built V2 side: the replay controller plus the drawable lookup its decoder owns. The
 * factory is only ever invoked for a document that already carries the V2 marker, so a V1 link
 * never constructs a Firebase Storage service, a Blob, an Image or a Canvas binding.
 */
export interface SpaceV2ReplayBundle {
  readonly controller: SpaceV2FrameReplayController;
  readonly imageBindings: PreviewImageBindings;
  clear(): void;
}

export type SpaceV2ReplayFactory = () => Promise<SpaceV2ReplayBundle | null>;

const CORRELATION_PREFIX = "mockup-space";

/** Read ONCE, hostile-getter safe. A throwing or non-string marker is simply "not V2". */
function readSchemaMarker(document: unknown): string | null {
  try {
    if (document === null || typeof document !== "object") return null;
    const schema = (document as { schema?: unknown }).schema;
    return typeof schema === "string" ? schema : null;
  } catch {
    return null;
  }
}

function v2ViewError(code: SpaceV2FrameReplayErrorCode): SpaceV2ViewErrorCode {
  if (code === "SPACE_V2_REPLAY_PASSWORD_REJECTED") return "SPACE_V2_VIEW_PASSWORD_REJECTED";
  if (code === "SPACE_V2_REPLAY_PROOF_LOAD_FAILED") return "SPACE_V2_VIEW_PROOF_UNAVAILABLE";
  // Evidence/proof mismatch, decode, dimension and plan failures are all permanent for this link:
  // retrying cannot turn an unproven composition into a proven one.
  return "SPACE_V2_VIEW_UNAVAILABLE";
}

export class SpaceVersionedViewController {
  private readonly token: string | null;
  private readonly initialState: SpaceVersionedViewState;
  private state: SpaceVersionedViewState;
  private generation = 0;
  private active = true;
  private inFlight = false;
  private cachedDocument: unknown | null = null;
  private v2Bundle: SpaceV2ReplayBundle | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    search: unknown,
    private readonly reader: SpaceDocumentReadPort,
    private readonly opener: SpaceOpenPort,
    private readonly createV2Replay?: SpaceV2ReplayFactory,
  ) {
    const link = readSpaceLink(search);
    this.token = link.kind === "valid" ? link.token : null;
    this.initialState =
      link.kind === "inactive"
        ? { status: "inactive" }
        : link.kind === "invalid"
          ? { status: "invalid-link" }
          : { status: "awaiting-password" };
    this.state = this.initialState;
  }

  readonly getState = (): SpaceVersionedViewState => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly attach = (): void => {
    if (this.active) return;
    this.active = true;
    this.generation += 1;
    this.inFlight = false;
    this.cachedDocument = null;
    this.releaseV2();
    this.setState(this.initialState);
  };

  readonly submitPassword = (password: unknown): void => {
    if (!this.active || this.token === null || this.inFlight) return;
    if (
      this.state.status === "inactive" ||
      this.state.status === "invalid-link" ||
      this.state.status === "ready"
    )
      return;
    if (this.state.status === "error" && !this.state.retryable) return;
    const generation = ++this.generation;
    this.inFlight = true;
    this.setState({ status: "loading", requestId: generation });
    void this.run(generation, password).catch(() => {
      if (!this.isCurrent(generation)) return;
      this.inFlight = false;
      this.cachedDocument = null;
      this.releaseV2();
      this.setState({
        status: "error",
        requestId: generation,
        code: "SPACE_VIEW_LOAD_FAILED",
        retryable: false,
      });
    });
  };

  readonly detach = (): void => {
    this.active = false;
    this.generation += 1;
    this.inFlight = false;
    this.cachedDocument = null;
    this.releaseV2();
    this.listeners.clear();
  };

  private async run(generation: number, password: unknown): Promise<void> {
    let document = this.cachedDocument;
    if (document === null) {
      const read = await this.reader.load({
        token: this.token,
        correlationId: `${CORRELATION_PREFIX}-${generation}`,
      });
      if (!this.isCurrent(generation)) return;
      if (!read.ok) {
        this.inFlight = false;
        this.setState(this.readError(generation, read));
        return;
      }
      document = read.value.document;
      this.cachedDocument = document;
    }

    if (readSchemaMarker(document) === SPACE_DOCUMENT_V2_VERSION) {
      await this.runV2(generation, document, password);
      return;
    }
    await this.runV1(generation, document, password);
  }

  private async runV1(generation: number, document: unknown, password: unknown): Promise<void> {
    const opened = await this.opener.open(document, password);
    if (!this.isCurrent(generation)) return;
    this.inFlight = false;
    if (!opened.ok) {
      if (
        opened.code !== "SPACE_OPEN_DECRYPT_FAILED" &&
        opened.code !== "SPACE_OPEN_INVALID_INPUT"
      ) {
        this.cachedDocument = null;
      }
      this.setState(this.openError(generation, opened));
      return;
    }
    this.cachedDocument = null;
    this.setState({ status: "ready", requestId: generation, value: opened.value });
  }

  private async runV2(generation: number, document: unknown, password: unknown): Promise<void> {
    let bundle: SpaceV2ReplayBundle | null = null;
    try {
      bundle = this.createV2Replay === undefined ? null : await this.createV2Replay();
    } catch {
      bundle = null;
    }
    if (!this.isCurrent(generation)) return;
    if (bundle === null) {
      this.inFlight = false;
      this.cachedDocument = null;
      this.setState({
        status: "error",
        requestId: generation,
        code: "SPACE_V2_VIEW_UNAVAILABLE",
        retryable: false,
      });
      return;
    }
    this.v2Bundle = bundle;

    const result = await bundle.controller.prepare({
      document,
      password,
      correlationId: `${CORRELATION_PREFIX}-${generation}`,
    });
    if (!this.isCurrent(generation)) {
      // A detach/re-submit happened while the pipeline ran: drop the drawable it produced rather
      // than leaving a stale binding reachable.
      bundle.clear();
      return;
    }
    this.inFlight = false;
    if (result.ok) {
      this.cachedDocument = null;
      this.setState({
        status: "ready",
        requestId: generation,
        v2: { plan: result.value.plan, imageBindings: bundle.imageBindings },
      });
      return;
    }

    const code = v2ViewError(result.error.code);
    bundle.clear();
    if (code === "SPACE_V2_VIEW_UNAVAILABLE") this.cachedDocument = null;
    this.setState({
      status: "error",
      requestId: generation,
      code,
      retryable: code !== "SPACE_V2_VIEW_UNAVAILABLE",
    });
  }

  private releaseV2(): void {
    const bundle = this.v2Bundle;
    this.v2Bundle = null;
    if (bundle === null) return;
    try {
      bundle.clear();
    } catch {
      // a hostile bundle must never break the lifecycle
    }
  }

  private isCurrent(generation: number): boolean {
    return this.active && generation === this.generation;
  }

  private readError(
    generation: number,
    result: Extract<SpaceDocumentReadResult, { ok: false }>,
  ): SpaceVersionedViewState {
    const code: SpaceViewErrorCode =
      result.error.code === "SPACE_READ_NOT_FOUND"
        ? "SPACE_VIEW_NOT_FOUND"
        : result.error.code === "SPACE_READ_INVALID_REQUEST"
          ? "SPACE_VIEW_INVALID_LINK"
          : "SPACE_VIEW_LOAD_FAILED";
    return { status: "error", requestId: generation, code, retryable: result.error.retryable };
  }

  private openError(
    generation: number,
    result: Extract<SpaceOpenResult, { ok: false }>,
  ): SpaceVersionedViewState {
    const passwordFailure =
      result.code === "SPACE_OPEN_DECRYPT_FAILED" || result.code === "SPACE_OPEN_INVALID_INPUT";
    return {
      status: "error",
      requestId: generation,
      code: passwordFailure ? "SPACE_VIEW_PASSWORD_REJECTED" : "SPACE_VIEW_INVALID_CONTENT",
      retryable: passwordFailure,
    };
  }

  private setState(state: SpaceVersionedViewState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
