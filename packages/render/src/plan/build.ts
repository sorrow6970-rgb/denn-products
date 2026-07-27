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
const isSize = (s: unknown): boolean =>
  isObj(s) && isFinitePositive(s.width) && isFinitePositive(s.height);
const isRect = (r: unknown): boolean =>
  isObj(r) &&
  isFiniteNum(r.x) &&
  isFiniteNum(r.y) &&
  isFinitePositive(r.width) &&
  isFinitePositive(r.height);
const isTransform = (t: unknown): t is ImageTransform =>
  isObj(t) && isFiniteNum(t.x) && isFiniteNum(t.y) && isFinitePositive(t.scale);

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
  readonly transform: ImageTransform;
  readonly guide?: StrokeSpec;
  readonly index: number;
  readonly key: number;
}

function buildCase(input: CasePlanInput): RenderPlanResult {
  if (!isSize(input.logicalCanvas)) return fail("INVALID_ZONE");
  if (!isHex(input.bodyColor)) return fail("INVALID_COLOR");
  if (!isSize(input.image)) return fail("INVALID_ZONE");
  if (!isTransform(input.defaultTransform)) return fail("INVALID_TRANSFORM");
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

    let transform: ImageTransform;
    if (zone.transform === undefined) transform = input.defaultTransform;
    else if (isTransform(zone.transform)) transform = zone.transform;
    else return fail("INVALID_TRANSFORM");

    let guide: StrokeSpec | undefined;
    if (zone.guide !== undefined) {
      const g = validateStroke(zone.guide);
      if (typeof g === "string") return fail(g);
      guide = g;
    }

    normalized.push({ id: zone.id, imageRef: zone.imageRef, rect, transform, guide, index, key });
  }

  // deterministic order: `key` ascending (missing order = original index), ties by original index.
  normalized.sort((a, b) => a.key - b.key || a.index - b.index);

  const imageCommands: PreviewDrawCommand[] = [];
  const guideCommands: PreviewDrawCommand[] = [];
  for (const zone of normalized) {
    const resolved = resolveZoneRect(input.logicalCanvas, zone.rect);
    if ("code" in resolved) return fail(resolved.code, resolved.causeCode);
    const image = coverCommand(
      `case:user-image:${zone.id}`,
      zone.imageRef,
      resolved.rect,
      input.image,
      zone.transform,
    );
    if ("code" in image) return fail(image.code, image.causeCode);
    imageCommands.push(image.command);
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
      rect: canvasRect(input.logicalCanvas),
      color: input.bodyColor,
    },
    ...imageCommands,
    ...guideCommands,
  ];
  if (!commandsAllFinite(commands)) return fail("NON_FINITE_RESULT");
  return {
    ok: true,
    plan: { kind: "case", logicalCanvas: sizeCopy(input.logicalCanvas), commands },
  };
}

function buildFrame(input: FramePlanInput): RenderPlanResult {
  if (!isSize(input.logicalCanvas)) return fail("INVALID_ZONE");
  if (!isRect(input.frameRect) || !isRect(input.imageZone)) return fail("INVALID_ZONE");
  if (!isHex(input.frameColor) || !isHex(input.matColor)) return fail("INVALID_COLOR");
  if (!isSize(input.image)) return fail("INVALID_ZONE");
  if (!isTransform(input.transform)) return fail("INVALID_TRANSFORM");
  if (!isSafeId(input.imageRef)) return fail("INVALID_ID");

  let innerBorder: StrokeSpec | undefined;
  if (input.innerBorder !== undefined) {
    const b = validateStroke(input.innerBorder);
    if (typeof b === "string") return fail(b);
    innerBorder = b;
  }

  const image = coverCommand(
    "frame:user-image",
    input.imageRef,
    rectCopy(input.imageZone),
    input.image,
    input.transform,
  );
  if ("code" in image) return fail(image.code, image.causeCode);

  const commands: PreviewDrawCommand[] = [
    {
      type: "fill-rect",
      layerId: "frame:body",
      rect: rectCopy(input.frameRect),
      color: input.frameColor,
    },
    {
      type: "fill-rect",
      layerId: "frame:mat",
      rect: rectCopy(input.imageZone),
      color: input.matColor,
    },
    image.command,
  ];
  if (innerBorder) {
    commands.push({
      type: "stroke-rect",
      layerId: "frame:inner-border",
      rect: rectCopy(input.imageZone),
      color: innerBorder.color,
      width: innerBorder.width,
    });
  }
  if (!commandsAllFinite(commands)) return fail("NON_FINITE_RESULT");
  return {
    ok: true,
    plan: { kind: "frame", logicalCanvas: sizeCopy(input.logicalCanvas), commands },
  };
}

const canvasRect = (s: { width: number; height: number }): Rect => ({
  x: 0,
  y: 0,
  width: s.width,
  height: s.height,
});
const sizeCopy = (s: { width: number; height: number }): { width: number; height: number } => ({
  width: s.width,
  height: s.height,
});
const rectCopy = (r: Rect): Rect => ({ x: r.x, y: r.y, width: r.width, height: r.height });

/**
 * Build a deterministic, JSON-safe preview render plan for a case or frame input. Case and frame
 * are separate inputs with separate layer orders; all image placement comes from spec 019 geometry.
 * Never throws — ordinary (or runtime-malformed) bad input returns a typed error Result. Never emits
 * placeholder commands for template-art/camera/magsafe/text/clock (no data for them in this spec).
 */
export function buildPreviewRenderPlan(input: PreviewRenderPlanInput): RenderPlanResult {
  if (!isObj(input) || (input.kind !== "case" && input.kind !== "frame"))
    return fail("INVALID_KIND");
  return input.kind === "case"
    ? buildCase(input as CasePlanInput)
    : buildFrame(input as FramePlanInput);
}
