// Product render-plan adapters (spec 025). Pure and synchronous: no React, DOM, Canvas, Firebase,
// IO, Date, random or global state. Never throws — malformed input, hostile getters, throwing Proxy
// traps and revoked Proxies all become a typed failure Result.
//
// Layering (spec 025 §4): `@denn/shared` turns raw catalog into neutral geometry, THIS layer adds
// the caller's explicit appearance + user-image state + logical width, and `@denn/render` validates
// and emits the commands. The adapter therefore takes no `CatalogDocumentV1`, no raw template, no
// drawable and no `imageBindings` — and returns a fully validated `PreviewRenderPlan`, not an
// intermediate plan input.
//
// Every value is read ONCE into a plain snapshot before it is used, so a getter that changes after
// validation cannot influence the emitted plan.

import type { CasePreviewGeometry, FramePreviewGeometry } from "@denn/shared";
import {
  buildPreviewRenderPlan,
  type CaseImageZone,
  type FramePlanInput,
  type PreviewRenderPlan,
} from "@denn/render";

/**
 * The spec 031 measurement port and text-zone input, typed STRUCTURALLY on purpose: the render
 * package's barrel is outside this spec's allowed files, and a structural type is checked just as
 * strictly by `tsc` as a named import would be.
 */
export type TextMeasurePort = NonNullable<
  NonNullable<Parameters<typeof buildPreviewRenderPlan>[1]>["measureText"]
>;
type FrameTextZoneInput = NonNullable<FramePlanInput["textZones"]>[number];
type PlanOptions = NonNullable<Parameters<typeof buildPreviewRenderPlan>[1]>;

/** Exact `#RRGGBB` (no alpha, no `transparent`, no named colour, no CSS variable, no trimming). */
const HEX6 = /^#[0-9A-Fa-f]{6}$/;
/**
 * Mirrors the spec 020 restricted synthetic identifier grammar so a bad `imageRef` is reported as an
 * image-state problem here; the builder re-validates it anyway (defence in depth).
 */
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MAX_ID_LEN = 128;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isFinitePositive = (v: unknown): v is number => isFiniteNum(v) && v > 0;

class AdapterFailure extends Error {
  constructor(
    readonly code: ProductPlanErrorCode,
    readonly zoneSourceIndex?: number,
  ) {
    super(code);
  }
}

const fail = (code: ProductPlanErrorCode, zoneSourceIndex?: number): never => {
  throw new AdapterFailure(code, zoneSourceIndex);
};

/** Colour: missing and malformed are distinct, and a valid value is canonicalised to uppercase. */
function readColor(value: unknown): string {
  if (value === undefined || value === null || value === "") fail("MISSING_APPEARANCE");
  if (typeof value !== "string" || !HEX6.test(value)) fail("INVALID_APPEARANCE");
  return (value as string).toUpperCase();
}

interface ImageSnapshot {
  readonly imageRef: string;
  readonly image: { width: number; height: number };
  readonly transform: { scale: number; x: number; y: number };
  /** spec 030: 0 when the caller supplied none. Never wrapped, never invented. */
  readonly rotationQuarterTurns: 0 | 1 | 2 | 3;
}

/** `undefined` → 0 (a pre-030 caller). Any other non-`0|1|2|3` value is an invalid image state. */
const readQuarterTurns = (value: unknown): 0 | 1 | 2 | 3 | null => {
  if (value === undefined) return 0;
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  return null;
};

/** Read a user image state ONCE into a plain snapshot. `zoneSourceIndex` is carried into failures. */
function readImageState(value: unknown, zoneSourceIndex?: number): ImageSnapshot {
  if (!isObj(value)) fail("INVALID_IMAGE_STATE", zoneSourceIndex);
  const state = value as Record<string, unknown>;
  const imageRef = state.imageRef;
  if (
    typeof imageRef !== "string" ||
    imageRef.length === 0 ||
    imageRef.length > MAX_ID_LEN ||
    !SAFE_ID.test(imageRef)
  ) {
    fail("INVALID_IMAGE_STATE", zoneSourceIndex);
  }
  const intrinsic = state.intrinsicSize;
  if (!isObj(intrinsic)) fail("INVALID_IMAGE_STATE", zoneSourceIndex);
  const width = (intrinsic as Record<string, unknown>).width;
  const height = (intrinsic as Record<string, unknown>).height;
  if (!isFinitePositive(width) || !isFinitePositive(height)) {
    fail("INVALID_IMAGE_STATE", zoneSourceIndex);
  }
  const rawTransform = state.transform;
  if (!isObj(rawTransform)) fail("INVALID_IMAGE_STATE", zoneSourceIndex);
  const scale = (rawTransform as Record<string, unknown>).scale;
  const x = (rawTransform as Record<string, unknown>).x;
  const y = (rawTransform as Record<string, unknown>).y;
  if (!isFinitePositive(scale) || !isFiniteNum(x) || !isFiniteNum(y)) {
    fail("INVALID_IMAGE_STATE", zoneSourceIndex);
  }
  // spec 030 §3: the rotation is validated in the SAME step as the transform's finiteness/range and
  // it is read exactly once, so a drifting getter cannot change what was validated.
  const rotationQuarterTurns = readQuarterTurns(
    (rawTransform as Record<string, unknown>).rotationQuarterTurns,
  );
  if (rotationQuarterTurns === null) fail("INVALID_IMAGE_STATE", zoneSourceIndex);
  return {
    imageRef: imageRef as string,
    image: { width: width as number, height: height as number },
    transform: { scale: scale as number, x: x as number, y: y as number },
    rotationQuarterTurns: rotationQuarterTurns as 0 | 1 | 2 | 3,
  };
}

/** A positive, finite rect dimension is required; anything else is a non-positive rect. */
const requirePositive = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : fail("NON_POSITIVE_RECT");

/**
 * Optional template art (spec 028). The caller supplies only the owner's synthetic key — the source
 * string never reaches this layer — and THIS layer decides the destination rectangle: the whole
 * logical canvas for a case, the mat rect for a frame (legacy evidence in the plan types).
 */
function readTemplateArtRef(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isObj(value)) fail("INVALID_ADAPTER_INPUT");
  const imageRef = (value as Record<string, unknown>).imageRef;
  if (
    typeof imageRef !== "string" ||
    imageRef.length === 0 ||
    imageRef.length > MAX_ID_LEN ||
    !SAFE_ID.test(imageRef)
  ) {
    fail("INVALID_ADAPTER_INPUT");
  }
  return imageRef as string;
}

// --- case -------------------------------------------------------------------

interface CaseZoneSnapshot {
  readonly id: string;
  readonly sourceIndex: number;
  readonly percentRect: { x: number; y: number; width: number; height: number };
}

function readCaseGeometry(value: unknown): {
  size: { width: number; height: number };
  zones: readonly CaseZoneSnapshot[];
} {
  if (!isObj(value)) fail("INVALID_ADAPTER_INPUT");
  const geometry = value as Record<string, unknown>;
  const rawSize = geometry.modelLogicalSize;
  if (!isObj(rawSize)) fail("INVALID_ADAPTER_INPUT");
  const width = (rawSize as Record<string, unknown>).width;
  const height = (rawSize as Record<string, unknown>).height;
  if (!isFinitePositive(width) || !isFinitePositive(height)) fail("INVALID_ADAPTER_INPUT");
  const rawZones = geometry.zones;
  if (!Array.isArray(rawZones)) fail("INVALID_ADAPTER_INPUT");
  const zones: CaseZoneSnapshot[] = [];
  for (const raw of rawZones as readonly unknown[]) {
    if (!isObj(raw)) fail("INVALID_ADAPTER_INPUT");
    const zone = raw as Record<string, unknown>;
    const id = zone.id;
    const sourceIndex = zone.sourceIndex;
    const rect = zone.percentRect;
    if (typeof id !== "string" || id.length === 0) fail("INVALID_ADAPTER_INPUT");
    // a projection source index is a 0-based non-negative integer; a negative, fractional, NaN or
    // Infinite value is not a usable index and is never carried into a failure payload
    if (!isFiniteNum(sourceIndex) || !Number.isInteger(sourceIndex) || sourceIndex < 0) {
      fail("INVALID_ADAPTER_INPUT");
    }
    if (!isObj(rect)) fail("INVALID_ADAPTER_INPUT");
    const r = rect as Record<string, unknown>;
    // every rect field is read once, then validated, then used from the snapshot
    const x = r.x;
    const y = r.y;
    const width = r.width;
    const height = r.height;
    if (!isFiniteNum(x) || !isFiniteNum(y)) fail("INVALID_ADAPTER_INPUT");
    if (!isFinitePositive(width) || !isFinitePositive(height)) fail("INVALID_ADAPTER_INPUT");
    zones.push({
      id: id as string,
      sourceIndex: sourceIndex as number,
      percentRect: {
        x: x as number,
        y: y as number,
        width: width as number,
        height: height as number,
      },
    });
  }
  return { size: { width: width as number, height: height as number }, zones };
}

export interface CaseProductPlanInput {
  readonly geometry: CasePreviewGeometry;
  readonly bodyColor: string;
  /** keyed by the geometry's synthetic `case-zone-<sourceIndex>`; extra entries are ignored. */
  readonly zoneImages: ReadonlyMap<string, UserImageState>;
  /** optional template art binding key (spec 028); the destination is the whole logical canvas. */
  readonly templateArt?: { readonly imageRef: string };
}

/**
 * Assemble a validated case preview plan. Every zone must have its own image state — a zone without
 * one fails the WHOLE plan (`MISSING_ZONE_IMAGE` + its source index) rather than being skipped, and
 * no colour, image or size default is ever invented.
 */
export function buildCaseProductPlan(input: CaseProductPlanInput): ProductPlanResult {
  return run(() => {
    if (!isObj(input)) fail("INVALID_ADAPTER_INPUT");
    const { size, zones } = readCaseGeometry((input as CaseProductPlanInput).geometry);
    const bodyColor = readColor((input as CaseProductPlanInput).bodyColor);
    const artRef = readTemplateArtRef((input as CaseProductPlanInput).templateArt);

    const map = (input as CaseProductPlanInput).zoneImages as unknown;
    if (!isObj(map)) fail("INVALID_ADAPTER_INPUT");
    // The `get` property is read EXACTLY once: a getter that hands a valid function to the typeof
    // check and a different one to `bind` must not be able to swap the lookup we validated. The
    // validated value is the only thing ever bound and called (spec 025 §7).
    const getter = (map as { get?: unknown }).get;
    if (typeof getter !== "function") fail("INVALID_ADAPTER_INPUT");
    const lookup = (getter as (key: string) => unknown).bind(map);

    const planZones: CaseImageZone[] = zones.map((zone) => {
      let found: unknown;
      try {
        found = lookup(zone.id);
      } catch {
        fail("INVALID_ADAPTER_INPUT");
      }
      if (found === undefined || found === null) fail("MISSING_ZONE_IMAGE", zone.sourceIndex);
      const state = readImageState(found, zone.sourceIndex);
      return {
        id: zone.id,
        imageRef: state.imageRef,
        image: state.image,
        rect: { units: "percent", ...zone.percentRect },
        transform: state.transform,
        // spec 030: only emitted when non-zero, so an unrotated case plan is unchanged
        ...(state.rotationQuarterTurns === 0
          ? {}
          : { rotationQuarterTurns: state.rotationQuarterTurns }),
      };
    });

    return finish({
      kind: "case",
      logicalCanvas: size,
      bodyColor,
      zones: planZones,
      ...(artRef === undefined
        ? {}
        : {
            templateArt: {
              imageRef: artRef,
              destRect: { x: 0, y: 0, width: size.width, height: size.height },
            },
          }),
    });
  });
}

// --- frame ------------------------------------------------------------------

function readFrameGeometry(value: unknown): {
  aspect: number;
  borderPercentOfWidth: number;
  matColor: string;
  contentInsetPx: number;
} {
  if (!isObj(value)) fail("INVALID_ADAPTER_INPUT");
  const geometry = value as Record<string, unknown>;
  const aspect = geometry.aspect;
  const borderPercentOfWidth = geometry.borderPercentOfWidth;
  const matColor = geometry.matColor;
  const contentInsetPx = geometry.contentInsetPx;
  if (!isFinitePositive(aspect) || !isFinitePositive(borderPercentOfWidth)) {
    fail("INVALID_ADAPTER_INPUT");
  }
  if (typeof matColor !== "string" || !HEX6.test(matColor)) fail("INVALID_ADAPTER_INPUT");
  if (contentInsetPx !== 0 && contentInsetPx !== 8) fail("INVALID_ADAPTER_INPUT");
  return {
    aspect: aspect as number,
    borderPercentOfWidth: borderPercentOfWidth as number,
    matColor: (matColor as string).toUpperCase(),
    contentInsetPx: contentInsetPx as number,
  };
}

export interface FrameProductPlanInput {
  readonly geometry: FramePreviewGeometry;
  readonly frameColor: string;
  /** required positive integer — this layer has no default width (spec 025 §1 Q2). */
  readonly logicalWidth: number;
  readonly userImage: UserImageState;
  /** optional template art binding key (spec 028); the destination is the mat rect. */
  readonly templateArt?: { readonly imageRef: string };
  /**
   * spec 031: the customer's value for each text key. A key with no entry (or `""`) renders
   * nothing. The operator's zone style comes from `geometry.textZones`; this map carries ONLY the
   * customer's words, so the two owners never mix.
   */
  readonly textValues?: ReadonlyMap<string, string>;
  /** spec 031: required as soon as any text zone has a value; the plan is not built without it. */
  readonly measureText?: TextMeasurePort;
}

/**
 * Assemble a validated frame preview plan.
 *
 *   H = round(W * aspect)                       B = max(1, round(W * borderPercentOfWidth / 100))
 *   frameRect = 0,0,W,H                         matRect   = B, B, W-2B, H-2B
 *   imageZone = B+P, B+P, W-2B-2P, H-2B-2P      (P = geometry.contentInsetPx, exactly 0 or 8)
 *
 * No epsilon, clamp, abs, extra rounding, or automatic grow/shrink/move. `innerBorder` is never
 * supplied (the legacy 4-band fill is not a stroke). The spec 024 builder re-checks containment.
 */
export function buildFrameProductPlan(input: FrameProductPlanInput): ProductPlanResult {
  return run(() => {
    if (!isObj(input)) fail("INVALID_ADAPTER_INPUT");
    const geometry = readFrameGeometry((input as FrameProductPlanInput).geometry);
    const frameColor = readColor((input as FrameProductPlanInput).frameColor);
    const artRef = readTemplateArtRef((input as FrameProductPlanInput).templateArt);

    const rawWidth = (input as FrameProductPlanInput).logicalWidth;
    if (!isFinitePositive(rawWidth) || !Number.isInteger(rawWidth)) fail("INVALID_LOGICAL_SIZE");
    const width = rawWidth as number;

    const rawImage = (input as FrameProductPlanInput).userImage;
    if (rawImage === undefined || rawImage === null) fail("MISSING_USER_IMAGE");
    const userImage = readImageState(rawImage);

    const textZones = readFrameTextZones(
      (input as FrameProductPlanInput).geometry,
      (input as FrameProductPlanInput).textValues,
    );

    const height = requirePositive(Math.round(width * geometry.aspect));
    const band = Math.max(1, Math.round((width * geometry.borderPercentOfWidth) / 100));
    if (!Number.isFinite(band)) fail("NON_POSITIVE_RECT");
    const inset = geometry.contentInsetPx;
    const matWidth = requirePositive(width - 2 * band);
    const matHeight = requirePositive(height - 2 * band);
    const imageWidth = requirePositive(width - 2 * band - 2 * inset);
    const imageHeight = requirePositive(height - 2 * band - 2 * inset);

    const framePlan: FramePlanInput = {
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
      frameColor,
      matColor: geometry.matColor,
      image: userImage.image,
      transform: userImage.transform,
      // spec 030: only emitted when non-zero, so an unrotated frame plan is unchanged
      ...(userImage.rotationQuarterTurns === 0
        ? {}
        : { rotationQuarterTurns: userImage.rotationQuarterTurns }),
      imageRef: userImage.imageRef,
      // spec 031: operator zone style + the customer's value, paired here and nowhere else
      ...(textZones === undefined ? {} : { textZones }),
      ...(artRef === undefined
        ? {}
        : {
            // legacy stretches the frame artwork over the mat rect (mockup:3094)
            templateArt: {
              imageRef: artRef,
              destRect: { x: band, y: band, width: matWidth, height: matHeight },
            },
          }),
    };
    return finish(framePlan, { measureText: (input as FrameProductPlanInput).measureText });
  });
}

// --- shared plumbing --------------------------------------------------------

/** Hand the assembled input to the spec 020/024 builder; its code is never echoed. */
function finish(
  planInput: Parameters<typeof buildPreviewRenderPlan>[0],
  options?: PlanOptions,
): PreviewRenderPlan {
  const built = buildPreviewRenderPlan(planInput, options);
  if (!built.ok) fail("PLAN_BUILD_FAILED");
  return (built as { ok: true; plan: PreviewRenderPlan }).plan;
}

/**
 * Pair each operator zone with the customer's value (spec 031). The zone style is copied field by
 * field from the already-validated projection; the value is looked up by key and is the ONLY thing
 * the customer controls. The operator's placeholder never enters this input (Founder F-3).
 */
function readFrameTextZones(
  geometry: FramePreviewGeometry,
  values: ReadonlyMap<string, string> | undefined,
): readonly FrameTextZoneInput[] | undefined {
  const zones = geometry.textZones;
  if (!Array.isArray(zones) || zones.length === 0) return undefined;
  const lookup = (key: string): string | undefined => {
    if (values === undefined) return undefined;
    try {
      const found = values.get(key);
      return typeof found === "string" ? found : undefined;
    } catch {
      fail("INVALID_ADAPTER_INPUT");
    }
  };
  return zones.map((zone) => ({
    value: lookup(zone.key),
    xPercent: zone.xPercent,
    yPercent: zone.yPercent,
    boxWidthPercent: zone.boxWidthPercent,
    fontSizePercent: zone.fontSizePercent,
    align: zone.align,
    fontFamily: zone.fontFamily,
    bold: zone.bold,
    italic: zone.italic,
    color: zone.color,
    lineHeight: zone.lineHeight,
    letterSpacingPercent: zone.letterSpacingPercent,
    rotationDegrees: zone.rotationDegrees,
    maxChars: zone.maxChars,
    maxLines: zone.maxLines,
  }));
}

function run(build: () => PreviewRenderPlan): ProductPlanResult {
  try {
    return { ok: true, plan: build() };
  } catch (error) {
    // A typed failure keeps its code (and zone index); anything else — a hostile getter, a throwing
    // Proxy trap, a revoked Proxy — is unusable input. The thrown object is never stored.
    if (error instanceof AdapterFailure) {
      return error.zoneSourceIndex === undefined
        ? { ok: false, code: error.code }
        : { ok: false, code: error.code, zoneSourceIndex: error.zoneSourceIndex };
    }
    return { ok: false, code: "INVALID_ADAPTER_INPUT" };
  }
}

// --- public types -----------------------------------------------------------

/**
 * One user photo, as the caller holds it.
 *
 * `imageRef` is a memory binding key only — never a URL, base64 payload, token or storagePath. The
 * adapter does not trim, rewrite or synthesize it, and it is not a secret detector: a caller must
 * not pass a URL/base64/token/secret here (spec 020 identifier contract).
 */
export interface UserImageState {
  readonly imageRef: string;
  readonly intrinsicSize: { readonly width: number; readonly height: number };
  readonly transform: {
    readonly scale: number;
    readonly x: number;
    readonly y: number;
    /**
     * spec 030: optional clockwise quarter turns of THIS photo. Absent === unrotated, which keeps
     * every pre-030 caller valid. Any other value fails with `INVALID_IMAGE_STATE`.
     */
    readonly rotationQuarterTurns?: 0 | 1 | 2 | 3;
  };
}

/** Identity-free failure codes. A failure never carries a name, id, colour, imageRef or exception. */
export type ProductPlanErrorCode =
  // the argument object, geometry or zone-image map could not be read safely
  | "INVALID_ADAPTER_INPUT"
  // a required colour was absent (there is no default colour anywhere in this layer)
  | "MISSING_APPEARANCE"
  // a colour was present but is not an exact `#RRGGBB`
  | "INVALID_APPEARANCE"
  // the frame user image is absent
  | "MISSING_USER_IMAGE"
  // a case zone has no image in the map (never silently skipped)
  | "MISSING_ZONE_IMAGE"
  // an image state is malformed (shape, intrinsic size, transform or imageRef)
  | "INVALID_IMAGE_STATE"
  // the frame logical width is not a finite positive integer (there is no default width)
  | "INVALID_LOGICAL_SIZE"
  // a computed mat/image rect would be zero or negative (or non-finite)
  | "NON_POSITIVE_RECT"
  // the spec 020/024 builder rejected the assembled input
  | "PLAN_BUILD_FAILED";

export type ProductPlanResult =
  | { readonly ok: true; readonly plan: import("@denn/render").PreviewRenderPlan }
  | {
      readonly ok: false;
      readonly code: ProductPlanErrorCode;
      /** 0-based index of the offending case zone, when the failure belongs to one. */
      readonly zoneSourceIndex?: number;
    };
