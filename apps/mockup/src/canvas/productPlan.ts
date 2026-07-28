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
}

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
  return {
    imageRef: imageRef as string,
    image: { width: width as number, height: height as number },
    transform: { scale: scale as number, x: x as number, y: y as number },
  };
}

/** A positive, finite rect dimension is required; anything else is a non-positive rect. */
const requirePositive = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : fail("NON_POSITIVE_RECT");

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
    if (!isFiniteNum(sourceIndex)) fail("INVALID_ADAPTER_INPUT");
    if (!isObj(rect)) fail("INVALID_ADAPTER_INPUT");
    const r = rect as Record<string, unknown>;
    if (!isFiniteNum(r.x) || !isFiniteNum(r.y)) fail("INVALID_ADAPTER_INPUT");
    if (!isFinitePositive(r.width) || !isFinitePositive(r.height)) fail("INVALID_ADAPTER_INPUT");
    zones.push({
      id: id as string,
      sourceIndex: sourceIndex as number,
      percentRect: {
        x: r.x as number,
        y: r.y as number,
        width: r.width as number,
        height: r.height as number,
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

    const map = (input as CaseProductPlanInput).zoneImages as unknown;
    if (!isObj(map) || typeof (map as { get?: unknown }).get !== "function") {
      fail("INVALID_ADAPTER_INPUT");
    }
    const lookup = (map as { get: (key: string) => unknown }).get.bind(map);

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
      };
    });

    return finish({ kind: "case", logicalCanvas: size, bodyColor, zones: planZones });
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

    const rawWidth = (input as FrameProductPlanInput).logicalWidth;
    if (!isFinitePositive(rawWidth) || !Number.isInteger(rawWidth)) fail("INVALID_LOGICAL_SIZE");
    const width = rawWidth as number;

    const rawImage = (input as FrameProductPlanInput).userImage;
    if (rawImage === undefined || rawImage === null) fail("MISSING_USER_IMAGE");
    const userImage = readImageState(rawImage);

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
      imageRef: userImage.imageRef,
    };
    return finish(framePlan);
  });
}

// --- shared plumbing --------------------------------------------------------

/** Hand the assembled input to the spec 020/024 builder; its code is never echoed. */
function finish(planInput: Parameters<typeof buildPreviewRenderPlan>[0]): PreviewRenderPlan {
  const built = buildPreviewRenderPlan(planInput);
  if (!built.ok) fail("PLAN_BUILD_FAILED");
  return (built as { ok: true; plan: PreviewRenderPlan }).plan;
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
  readonly transform: { readonly scale: number; readonly x: number; readonly y: number };
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
