// Deterministic preview render-plan builder (spec 020). Pure: no Date/random/global/DOM/Canvas/
// React/Firebase/IO. Reuses spec 019 geometry for all image placement. Never throws — including on
// runtime-malformed input that bypasses the TypeScript types (null/undefined/primitive/partial
// objects); such input returns a typed error Result. A success plan is JSON-safe and every number
// in it is finite.

import {
  computeCoverDrawRect,
  type GeometryErrorCode,
  type ImageTransform,
  percentRectToLogical,
  type Rect,
} from "../geometry";
import type {
  CasePlanInput,
  FramePlanInput,
  HexColor,
  ImageIntrinsicSize,
  PreviewDrawCommand,
  PreviewRenderPlanInput,
  RenderPlanErrorCode,
  RenderPlanResult,
  StrokeSpec,
  ZoneRect,
} from "./types";

const HEX = /^#[0-9a-fA-F]{6}$/;
// Restricted synthetic identifier grammar (spec 020) for BOTH zone.id and imageRef. Contract:
//  - a 1..128 char identifier that starts with an ASCII alphanumeric, then only ASCII alphanumerics
//    and `.` `_` `-`.
//  - the grammar rejects URL-shaped values (the `:` a scheme needs, the `/` a path needs),
//    whitespace, control characters, and typical *padded* base64 (`+` `/` `=`).
//  - this is NOT a semantic secret detector: it cannot tell whether an all-allowed-char value is a
//    token, a secret, or unpadded base64 — such a value still matches.
//  - callers must not pass a URL/base64/token/secret as an imageRef.
//  - a later executor must NOT use imageRef as a URL; it is only a lookup key into an in-memory
//    trusted image binding map.
//  - the builder itself synthesizes and copies no source URL/token/storagePath/raw-catalog value.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MAX_ID_LEN = 128;

// --- defensive primitives (accept unknown; never throw) ---------------------
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isFinitePositive = (v: unknown): v is number => isFiniteNum(v) && v > 0;
const isHex = (c: unknown): c is HexColor => typeof c === "string" && HEX.test(c);
const isSafeId = (v: unknown): v is string =>
  typeof v === "string" && v.length >= 1 && v.length <= MAX_ID_LEN && SAFE_ID.test(v);

const fail = (code: RenderPlanErrorCode, causeCode?: GeometryErrorCode): RenderPlanResult =>
  causeCode ? { ok: false, code, causeCode } : { ok: false, code };

/** Every rect coord and stroke width in the plan must be finite (final safety net). */
function commandsAllFinite(commands: readonly PreviewDrawCommand[]): boolean {
  for (const c of commands) {
    const rects: Rect[] = c.type === "draw-image-cover" ? [c.clipRect, c.drawRect] : [c.rect];
    for (const r of rects) {
      if (
        !Number.isFinite(r.x) ||
        !Number.isFinite(r.y) ||
        !Number.isFinite(r.width) ||
        !Number.isFinite(r.height)
      ) {
        return false;
      }
    }
    if (c.type === "stroke-rect" && !Number.isFinite(c.width)) return false;
  }
  return true;
}

/** Validate an optional stroke spec (object + hex color + finite positive width). */
function validateStroke(stroke: unknown): StrokeSpec | RenderPlanErrorCode {
  if (!isObj(stroke)) return "INVALID_ZONE";
  if (!isHex(stroke.color)) return "INVALID_COLOR";
  if (!isFiniteNum(stroke.width)) return "NON_FINITE_RESULT";
  if (stroke.width <= 0) return "INVALID_ZONE";
  return { color: stroke.color, width: stroke.width };
}

/** Validate a zone rect (object + units tag + finite origin + positive finite size). */
function validateZoneRect(raw: unknown): ZoneRect | null {
  if (!isObj(raw)) return null;
  if (raw.units !== "logical" && raw.units !== "percent") return null;
  if (
    !isFiniteNum(raw.x) ||
    !isFiniteNum(raw.y) ||
    !isFinitePositive(raw.width) ||
    !isFinitePositive(raw.height)
  ) {
    return null;
  }
  return { units: raw.units, x: raw.x, y: raw.y, width: raw.width, height: raw.height };
}

/** Resolve a validated zone rect to a logical rect (percent → geometry), or an error code. */
function resolveZoneRect(
  canvas: { width: number; height: number },
  rect: ZoneRect,
): { rect: Rect } | { code: RenderPlanErrorCode; causeCode?: GeometryErrorCode } {
  if (rect.units === "logical")
    return { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
  const r = percentRectToLogical(
    { x: 0, y: 0, width: canvas.width, height: canvas.height },
    { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  );
  if (!r.ok)
    return r.code === "NON_FINITE_RESULT"
      ? { code: "GEOMETRY_ERROR", causeCode: r.code }
      : { code: "INVALID_ZONE" };
  return { rect: r.value };
}

function coverCommand(
  layerId: string,
  imageRef: string,
  zoneRect: Rect,
  image: ImageIntrinsicSize,
  transform: ImageTransform,
): { command: PreviewDrawCommand } | { code: RenderPlanErrorCode; causeCode?: GeometryErrorCode } {
  const cover = computeCoverDrawRect({ zone: zoneRect, image, transform, clampPan: true });
  if (!cover.ok) return { code: "GEOMETRY_ERROR", causeCode: cover.code };
  return {
    command: {
      type: "draw-image-cover",
      layerId,
      imageRef,
      clipRect: zoneRect,
      drawRect: cover.value.drawRect,
    },
  };
}

/** A zone whose every field has been validated (safe to build commands from). */
interface NormalizedZone {
  readonly id: string;
  readonly imageRef: string;
  readonly rect: ZoneRect;
  /** this zone's own intrinsic image size (spec 025). */
  readonly image: { readonly width: number; readonly height: number };
  readonly transform: ImageTransform;
  readonly guide?: StrokeSpec;
  readonly index: number;
  readonly key: number;
}

function buildCase(input: CasePlanInput): RenderPlanResult {
  const canvas = readSizeOnce(input.logicalCanvas);
  if (canvas === null) return fail("INVALID_ZONE");
  if (!isHex(input.bodyColor)) return fail("INVALID_COLOR");
  if (!Array.isArray(input.zones)) return fail("INVALID_ZONE");

  const seen = new Set<string>();
  const normalized: NormalizedZone[] = [];
  const rawZones = input.zones as readonly unknown[];
  for (let index = 0; index < rawZones.length; index++) {
    const zone = rawZones[index];
    if (!isObj(zone)) return fail("INVALID_ZONE"); // null/undefined/primitive item
    if (!isSafeId(zone.id)) return fail("INVALID_ID");
    if (!isSafeId(zone.imageRef)) return fail("INVALID_ID");
    if (seen.has(zone.id)) return fail("INVALID_ID"); // duplicate zone id is fatal, not a warning
    seen.add(zone.id);

    const rect = validateZoneRect(zone.rect);
    if (!rect) return fail("INVALID_ZONE");

    if (zone.order !== undefined && !isFiniteNum(zone.order)) return fail("INVALID_ZONE");
    const key = isFiniteNum(zone.order) ? zone.order : index;

    // spec 025: each zone owns its intrinsic image size and transform — no plan-level fallback.
    const image = readSizeOnce(zone.image);
    if (image === null) return fail("INVALID_ZONE");
    const transform = readTransformOnce(zone.transform);
    if (transform === null) return fail("INVALID_TRANSFORM");

    let guide: StrokeSpec | undefined;
    if (zone.guide !== undefined) {
      const g = validateStroke(zone.guide);
      if (typeof g === "string") return fail(g);
      guide = g;
    }

    normalized.push({
      id: zone.id,
      imageRef: zone.imageRef,
      rect,
      image,
      transform,
      guide,
      index,
      key,
    });
  }

  // deterministic order: `key` ascending (missing order = original index), ties by original index.
  normalized.sort((a, b) => a.key - b.key || a.index - b.index);

  const imageCommands: PreviewDrawCommand[] = [];
  const guideCommands: PreviewDrawCommand[] = [];
  for (const zone of normalized) {
    const resolved = resolveZoneRect(canvas, zone.rect);
    if ("code" in resolved) return fail(resolved.code, resolved.causeCode);
    const drawn = coverCommand(
      `case:user-image:${zone.id}`,
      zone.imageRef,
      resolved.rect,
      zone.image,
      zone.transform,
    );
    if ("code" in drawn) return fail(drawn.code, drawn.causeCode);
    imageCommands.push(drawn.command);
    if (zone.guide) {
      guideCommands.push({
        type: "stroke-rect",
        layerId: `case:guide:${zone.id}`,
        rect: resolved.rect,
        color: zone.guide.color,
        width: zone.guide.width,
      });
    }
  }

  const commands: PreviewDrawCommand[] = [
    {
      type: "fill-rect",
      layerId: "case:body",
      rect: canvasRect(canvas),
      color: input.bodyColor,
    },
    ...imageCommands,
    ...guideCommands,
  ];
  if (!commandsAllFinite(commands)) return fail("NON_FINITE_RESULT");
  return {
    ok: true,
    plan: { kind: "case", logicalCanvas: { width: canvas.width, height: canvas.height }, commands },
  };
}

function buildFrame(input: FramePlanInput): RenderPlanResult {
  // Every frame value is read ONCE into a plain snapshot below, so a getter that returns a valid
  // rect during validation and a different one later cannot influence the emitted commands
  // (spec 024 §4). Nothing here re-reads the caller's objects.
  const canvas = readSizeOnce(input.logicalCanvas);
  if (canvas === null) return fail("INVALID_ZONE");
  const frameRect = readRectOnce(input.frameRect);
  const matRect = readRectOnce(input.matRect);
  const imageZone = readRectOnce(input.imageZone);
  if (frameRect === null || matRect === null || imageZone === null) return fail("INVALID_ZONE");
  const frameColor = input.frameColor;
  const matColor = input.matColor;
  if (!isHex(frameColor) || !isHex(matColor)) return fail("INVALID_COLOR");
  const image = readSizeOnce(input.image);
  if (image === null) return fail("INVALID_ZONE");
  const transform = readTransformOnce(input.transform);
  if (transform === null) return fail("INVALID_TRANSFORM");
  const imageRef = input.imageRef;
  if (!isSafeId(imageRef)) return fail("INVALID_ID");

  let innerBorder: StrokeSpec | undefined;
  if (input.innerBorder !== undefined) {
    const b = validateStroke(input.innerBorder);
    if (typeof b === "string") return fail(b);
    innerBorder = b;
  }

  // finite inputs can still overflow to ±Infinity when the far edge is computed
  const canvasBounds = canvasRect(canvas);
  if (!edgesFinite(canvasBounds) || !edgesFinite(frameRect)) return fail("NON_FINITE_RESULT");
  if (!edgesFinite(matRect) || !edgesFinite(imageZone)) return fail("NON_FINITE_RESULT");
  // exact containment (shared edges allowed): canvas ⊇ frame ⊇ mat ⊇ image. No tolerance, no clamp,
  // no shrink — a rect that falls outside fails instead of being moved (spec 024 §3).
  if (!contains(canvasBounds, frameRect)) return fail("INVALID_ZONE");
  if (!contains(frameRect, matRect)) return fail("INVALID_ZONE");
  if (!contains(matRect, imageZone)) return fail("INVALID_ZONE");

  const drawn = coverCommand("frame:user-image", imageRef, imageZone, image, transform);
  if ("code" in drawn) return fail(drawn.code, drawn.causeCode);

  const commands: PreviewDrawCommand[] = [
    { type: "fill-rect", layerId: "frame:body", rect: frameRect, color: frameColor },
    // the mat fills its OWN rect; the photo zone is a separate, smaller rect (spec 024 §1, §2)
    { type: "fill-rect", layerId: "frame:mat", rect: matRect, color: matColor },
    drawn.command,
  ];
  if (innerBorder) {
    commands.push({
      type: "stroke-rect",
      layerId: "frame:inner-border",
      rect: rectCopy(imageZone),
      color: innerBorder.color,
      width: innerBorder.width,
    });
  }
  if (!commandsAllFinite(commands)) return fail("NON_FINITE_RESULT");
  return {
    ok: true,
    plan: {
      kind: "frame",
      logicalCanvas: { width: canvas.width, height: canvas.height },
      commands,
    },
  };
}

const canvasRect = (s: { width: number; height: number }): Rect => ({
  x: 0,
  y: 0,
  width: s.width,
  height: s.height,
});

// --- frame snapshot readers + containment (spec 024) ------------------------
// Each reader takes every field ONCE; the returned object is a fresh plain value, so later command
// building never touches the caller's (possibly hostile or drifting) objects again.

function readRectOnce(value: unknown): Rect | null {
  try {
    if (!isObj(value)) return null;
    const x = value.x;
    const y = value.y;
    const width = value.width;
    const height = value.height;
    if (!isFiniteNum(x) || !isFiniteNum(y)) return null;
    if (!isFinitePositive(width) || !isFinitePositive(height)) return null;
    return { x, y, width, height };
  } catch {
    // a hostile getter, a throwing Proxy get/has trap or a revoked Proxy is simply not a rect
    return null;
  }
}

function readSizeOnce(value: unknown): { width: number; height: number } | null {
  try {
    if (!isObj(value)) return null;
    const width = value.width;
    const height = value.height;
    if (!isFinitePositive(width) || !isFinitePositive(height)) return null;
    return { width, height };
  } catch {
    return null;
  }
}

function readTransformOnce(value: unknown): ImageTransform | null {
  try {
    if (!isObj(value)) return null;
    const scale = value.scale;
    const x = value.x;
    const y = value.y;
    if (!isFinitePositive(scale) || !isFiniteNum(x) || !isFiniteNum(y)) return null;
    return { scale, x, y };
  } catch {
    return null;
  }
}

/** finite inputs can overflow when the far edge is computed (e.g. MAX_VALUE + MAX_VALUE). */
const edgesFinite = (r: Rect): boolean =>
  Number.isFinite(r.x + r.width) && Number.isFinite(r.y + r.height);

/** exact containment; sharing an edge counts as contained. */
const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;
const rectCopy = (r: Rect): Rect => ({ x: r.x, y: r.y, width: r.width, height: r.height });

/**
 * Build a deterministic, JSON-safe preview render plan for a case or frame input. Case and frame
 * are separate inputs with separate layer orders; all image placement comes from spec 019 geometry.
 * Never throws — ordinary (or runtime-malformed) bad input returns a typed error Result. Never emits
 * placeholder commands for template-art/camera/magsafe/text/clock (no data for them in this spec).
 */
export function buildPreviewRenderPlan(input: PreviewRenderPlanInput): RenderPlanResult {
  try {
    if (!isObj(input) || (input.kind !== "case" && input.kind !== "frame"))
      return fail("INVALID_KIND");
    return input.kind === "case"
      ? buildCase(input as CasePlanInput)
      : buildFrame(input as FramePlanInput);
  } catch {
    // Last-resort boundary (spec 024 §4): a property read anywhere in the input can throw (hostile
    // getter, Proxy trap, revoked Proxy). Such input is not a usable zone, and the existing error
    // code set is NOT extended. The thrown object is never stored or surfaced.
    return fail("INVALID_ZONE");
  }
}
