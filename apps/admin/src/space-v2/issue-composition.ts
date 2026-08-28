// Production composition for the admin Space V2 issue panel (spec 083 §1, §4, §7).
//
// Three things live here, and nothing else: the LAZY writer that keeps the Firebase SDK out of the
// admin entry until an operator actually issues, the ONE pure plan helper that turns a frozen
// composition into the same render plan the customer will replay, and the success-link formatter.
//
// What is deliberately absent: any Firebase SDK import (the writer factory reaches the SDK through
// `@denn/firebase/space-write` at call time only), any DOM, Canvas, clipboard or URL side effect,
// any password, and any retry/merge. Building this module touches no browser API.

import type { OperatorAuthPort, OperatorAuthState } from "@denn/firebase/admin-read";
import type {
  SpaceV2IssueAuthPort,
  SpaceV2IssueOperatorState,
  SpaceV2IssueRequest,
  SpaceV2IssueResult,
  SpaceV2IssueWritePort,
} from "@denn/firebase/space-write";
import {
  buildPreviewRenderPlan,
  type FramePlanInput,
  type PreviewDrawCommand,
  type PreviewRenderPlan,
} from "@denn/render";
import type { FramePreviewGeometry } from "@denn/shared";
import { createSpaceCrypto, type SpaceCryptoPort, type SpaceSha256Port } from "@denn/spaces";
import { createCorrelationId } from "../admin-read/create";
import type { AdminFirebaseConfigResolution } from "../admin-read/config";
import { createSpaceV2IssueSession, type SpaceV2IssueSessionController } from "./issue-session";
import { createSpaceV2IssueUuidPort } from "./issue-uuid-adapter";
import type { SpaceV2IssueUuidPort } from "./issue-token-candidate";

// --- the frozen composition, as the panel holds it ---------------------------

/** Clockwise quarter turns. The only rotation this product supports (spec 064). */
export type AdminIssueQuarterTurns = 0 | 1 | 2 | 3;

/**
 * The customer's editing transform in the V2 encoding: dimensionless `scale` and NORMALIZED pan
 * that is a fraction of the axis' max pan at that scale. Logical pixels are derived at plan time
 * only, which is why a resize cannot move the photo.
 */
export interface AdminIssueTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
  readonly rotationQuarterTurns: AdminIssueQuarterTurns;
}

export interface AdminIssuePlanImage {
  readonly imageRef: string;
  readonly intrinsicWidth: number;
  readonly intrinsicHeight: number;
}

/** Exactly the four geometry fields the replay evidence carries — never the whole projection. */
export type AdminIssuePlanGeometry = Pick<
  FramePreviewGeometry,
  "aspect" | "borderPercentOfWidth" | "matColor" | "contentInsetPx"
>;

export interface AdminFrameIssuePlanInput {
  readonly geometry: AdminIssuePlanGeometry;
  readonly frameColor: string;
  readonly logicalWidth: number;
  readonly image: AdminIssuePlanImage;
  readonly transform: AdminIssueTransform;
}

export type AdminFrameIssuePlanResult =
  | { readonly ok: true; readonly plan: PreviewRenderPlan }
  /** Identity-free: never a builder code, a colour, an imageRef or a dimension. */
  | { readonly ok: false; readonly code: "ADMIN_SPACE_V2_PLAN_FAILED" };

const HEX6 = /^#[0-9A-Fa-f]{6}$/;
const USER_IMAGE_LAYER = "frame:user-image";
const PLAN_FAILED = { ok: false, code: "ADMIN_SPACE_V2_PLAN_FAILED" } as const;

const isFinitePositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * The ONE admin-local plan composition (spec 083 §4).
 *
 * It exists because the customer's adapter lives in `apps/mockup`, which this app may not import,
 * and because copying the executor or the cover/rotation maths would create a second implementation
 * that can drift. So this stays deliberately thin: it derives the frame rectangles the same way the
 * replay does and hands everything else to `@denn/render`, which owns the cover fit, the pan clamp
 * and the rotation.
 *
 *   H = round(W * aspect)                       B = max(1, round(W * borderPercentOfWidth / 100))
 *   frameRect = 0,0,W,H                         matRect   = B, B, W-2B, H-2B
 *   imageZone = B+P, B+P, W-2B-2P, H-2B-2P      (P = contentInsetPx, exactly 0 or 8)
 *
 * The normalized pan is converted in TWO passes, exactly as the replay does it: a zero-pan probe at
 * the final scale and quarter turn emits the drawn rect, that rect is the only max-pan source, and
 * only then is the normalized fraction turned into logical pixels. One pass would need the max pan
 * before the plan that produces it exists.
 *
 * `plan-equality` unit coverage pins the result against the customer replay path; if the two ever
 * disagree the panel refuses to issue rather than shipping a proof of a different composition.
 */
export function buildAdminFrameIssuePlan(
  input: AdminFrameIssuePlanInput,
): AdminFrameIssuePlanResult {
  try {
    const { geometry, image, transform } = input;
    if (!isFinitePositive(geometry.aspect) || !isFinitePositive(geometry.borderPercentOfWidth)) {
      return PLAN_FAILED;
    }
    if (geometry.contentInsetPx !== 0 && geometry.contentInsetPx !== 8) return PLAN_FAILED;
    if (typeof geometry.matColor !== "string" || !HEX6.test(geometry.matColor)) return PLAN_FAILED;
    if (typeof input.frameColor !== "string" || !HEX6.test(input.frameColor)) return PLAN_FAILED;
    if (!isFinitePositive(input.logicalWidth) || !Number.isInteger(input.logicalWidth)) {
      return PLAN_FAILED;
    }
    if (!isFinitePositive(image.intrinsicWidth) || !isFinitePositive(image.intrinsicHeight)) {
      return PLAN_FAILED;
    }

    const width = input.logicalWidth;
    const height = Math.round(width * geometry.aspect);
    const band = Math.max(1, Math.round((width * geometry.borderPercentOfWidth) / 100));
    const inset = geometry.contentInsetPx;
    const matWidth = width - 2 * band;
    const matHeight = height - 2 * band;
    const imageWidth = matWidth - 2 * inset;
    const imageHeight = matHeight - 2 * inset;
    if (height <= 0 || matWidth <= 0 || matHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
      return PLAN_FAILED;
    }

    // Colours are canonicalised to uppercase here, matching the customer adapter, so the emitted
    // commands are identical rather than merely equivalent.
    const build = (pan: { readonly x: number; readonly y: number }): PreviewRenderPlan | null => {
      const planInput: FramePlanInput = {
        kind: "frame",
        logicalCanvas: { width, height },
        frameRect: { x: 0, y: 0, width, height },
        matRect: { x: band, y: band, width: matWidth, height: matHeight },
        imageZone: {
          x: band + inset,
          y: band + inset,
          width: imageWidth,
          height: imageHeight,
        },
        frameColor: input.frameColor.toUpperCase(),
        matColor: geometry.matColor.toUpperCase(),
        image: { width: image.intrinsicWidth, height: image.intrinsicHeight },
        transform: { scale: transform.scale, x: pan.x, y: pan.y },
        ...(transform.rotationQuarterTurns === 0
          ? {}
          : { rotationQuarterTurns: transform.rotationQuarterTurns }),
        imageRef: image.imageRef,
      };
      const built = buildPreviewRenderPlan(planInput);
      return built.ok ? built.plan : null;
    };

    const probe = build({ x: 0, y: 0 });
    if (probe === null) return PLAN_FAILED;
    const drawn = probe.commands.find(
      (command): command is Extract<PreviewDrawCommand, { readonly type: "draw-image-cover" }> =>
        command.type === "draw-image-cover" && command.layerId === USER_IMAGE_LAYER,
    );
    if (drawn === undefined) return PLAN_FAILED;

    const maxPanX = Math.abs(drawn.drawRect.width - drawn.clipRect.width) / 2;
    const maxPanY = Math.abs(drawn.drawRect.height - drawn.clipRect.height) / 2;
    if (!Number.isFinite(maxPanX) || !Number.isFinite(maxPanY)) return PLAN_FAILED;
    // An axis whose image exactly covers the zone is PINNED, not scaled by nothing.
    const panX = maxPanX === 0 ? 0 : transform.x * maxPanX;
    const panY = maxPanY === 0 ? 0 : transform.y * maxPanY;
    if (!Number.isFinite(panX) || !Number.isFinite(panY)) return PLAN_FAILED;

    const plan = build({ x: panX, y: panY });
    return plan === null ? PLAN_FAILED : { ok: true, plan };
  } catch {
    // A hostile getter or a revoked Proxy is unusable input, never a half-built plan.
    return PLAN_FAILED;
  }
}

// --- the success link (spec 083 §7) ------------------------------------------

/** Injected so a click, and only a click, can reach the platform clipboard. */
export interface SpaceV2ClipboardPort {
  write(text: string): Promise<void>;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * The confirmed space link: the CURRENT origin's root with one `space` query and nothing else.
 *
 * It is built from the origin rather than from the current href on purpose — an existing query,
 * hash, path or credential must not be carried into a link the operator will send to a customer.
 * A token that is not a v4 UUID, or an origin that is not a usable absolute URL, yields null and
 * the panel says the link cannot be shown; it never falls back to a relative or cross-origin URL.
 */
export function formatSpaceV2SpaceLink(origin: unknown, token: unknown): string | null {
  try {
    if (typeof origin !== "string" || origin.length === 0) return null;
    if (typeof token !== "string" || !UUID_V4.test(token)) return null;
    const base = new URL(origin);
    if (base.protocol !== "https:" && base.protocol !== "http:") return null;
    const url = new URL("/", base);
    url.search = "";
    url.hash = "";
    url.username = "";
    url.password = "";
    url.searchParams.set("space", token);
    const formatted = url.toString();
    // Same-origin is asserted on the finished string, so a formatter mistake cannot ship a link
    // that points somewhere else.
    return new URL(formatted).origin === base.origin ? formatted : null;
  } catch {
    return null;
  }
}

// --- the lazy writer (spec 083 §1) -------------------------------------------

export type SpaceV2IssueWritePortFactory = () => Promise<SpaceV2IssueWritePort>;

const lazyFailure = (correlationId: string): SpaceV2IssueResult => ({
  ok: false,
  error: {
    category: "VALIDATION",
    code: "SPACE_V2_ISSUE_INVALID_INPUT",
    retryable: false,
    correlationId,
  },
});

/**
 * Holds no SDK object until the first issue actually reaches the writer.
 *
 * A failed construction is closed as a DEFINITE local failure — the request never reached Firebase,
 * so reporting anything else would invent an outcome — and it is not cached: the session requires a
 * fresh frozen draft before another attempt, and that attempt may build the facade again. Nothing
 * here retries on its own.
 */
export function createLazySpaceV2IssueWritePort(
  factory: SpaceV2IssueWritePortFactory,
): SpaceV2IssueWritePort {
  let ready: SpaceV2IssueWritePort | null = null;
  let pending: Promise<SpaceV2IssueWritePort> | null = null;

  const acquire = (): Promise<SpaceV2IssueWritePort> => {
    if (ready !== null) return Promise.resolve(ready);
    pending ??= factory().then(
      (port) => {
        ready = port;
        pending = null;
        return port;
      },
      (error: unknown) => {
        pending = null;
        throw error;
      },
    );
    return pending;
  };

  return {
    issue: async (request: SpaceV2IssueRequest) => {
      let port: SpaceV2IssueWritePort;
      try {
        port = await acquire();
      } catch {
        // No SDK message, config value or stack leaves this boundary.
        return lazyFailure(request.correlationId);
      }
      return port.issue(request);
    },
  };
}

/**
 * The production factory. The SDK is reached through `@denn/firebase/space-write`, whose own
 * facade keeps every `firebase/*` import inside itself and REUSES the admin shell's default app, so
 * the operator session stays one Auth state rather than two.
 */
const makeProductionWritePort = async (options: {
  readonly config: SpaceV2IssueWriteConfig;
  readonly auth: SpaceV2IssueAuthPort;
}): Promise<SpaceV2IssueWritePort> => {
  const module = await import("@denn/firebase/space-write");
  const facade = await module.createFirebaseSpaceV2WriteFacade(options.config);
  return module.createSpaceV2IssueWritePort({ facade, auth: options.auth });
};

/** Structurally the write facade's config; the resolved admin config already satisfies it. */
export type SpaceV2IssueWriteConfig = {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly appId: string;
};

/**
 * The existing operator auth, narrowed to what the write port asks for. It is the SAME port the C5
 * baseline uses — no second observer is registered and no second app is initialised. The `error`
 * state drops its code here because the write port's vocabulary has no place for it.
 */
export function toSpaceV2IssueAuthPort(auth: OperatorAuthPort): SpaceV2IssueAuthPort {
  const narrow = (state: OperatorAuthState): SpaceV2IssueOperatorState =>
    state.status === "error" ? { status: "error" } : { status: state.status };
  return { currentOperator: () => narrow(auth.currentOperator()) };
}

export interface AdminSpaceV2IssueDependencies {
  readonly makeWritePort?: (options: {
    readonly config: SpaceV2IssueWriteConfig;
    readonly auth: SpaceV2IssueAuthPort;
  }) => Promise<SpaceV2IssueWritePort>;
  readonly uuid?: SpaceV2IssueUuidPort;
  readonly crypto?: SpaceCryptoPort;
  readonly sha256?: SpaceSha256Port;
  readonly createCorrelationId?: () => string;
}

/**
 * Web Crypto SHA-256. Building this object touches no browser API — `crypto.subtle` is read only
 * when a digest is actually taken, which happens inside the issue path and nowhere else.
 */
const webCryptoSha256: SpaceSha256Port = {
  async digest(bytes) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
    return new Uint8Array(digest);
  },
};

/**
 * Build the issue session for an authenticated, fully gated admin shell, or return null.
 *
 * Returning null is the whole "off" state: no session, no adapter, no UUID source, no facade and
 * no Firebase import. A missing UUID capability is also null rather than a session that would fail
 * only after the operator typed a password.
 */
export function createAdminSpaceV2IssueSession(options: {
  readonly resolution: AdminFirebaseConfigResolution;
  readonly enabled: boolean;
  readonly auth: OperatorAuthPort;
  readonly dependencies?: AdminSpaceV2IssueDependencies;
}): SpaceV2IssueSessionController | null {
  const { resolution, enabled, auth } = options;
  const dependencies = options.dependencies ?? {};
  if (!enabled || resolution.status !== "configured") return null;

  let uuid = dependencies.uuid ?? null;
  if (uuid === null) {
    const adapter = createSpaceV2IssueUuidPort();
    if (!adapter.ok) return null;
    uuid = adapter.value;
  }

  const issueAuth = toSpaceV2IssueAuthPort(auth);
  const makeWritePort = dependencies.makeWritePort ?? makeProductionWritePort;
  const writer = createLazySpaceV2IssueWritePort(() =>
    makeWritePort({ config: resolution.config, auth: issueAuth }),
  );

  return createSpaceV2IssueSession({
    uuid,
    crypto: dependencies.crypto ?? createSpaceCrypto(),
    sha256: dependencies.sha256 ?? webCryptoSha256,
    writer,
    createCorrelationId: dependencies.createCorrelationId ?? createCorrelationId,
  });
}
