// Deterministic preview render-plan builder (spec 020). Pure: no Date/random/global/DOM/Canvas/
// React/Firebase/IO. Reuses spec 019 geometry for all image placement. Never throws on ordinary bad
// input; a success plan is JSON-safe and every number in it is finite.

import {
  computeCoverDrawRect,
  type GeometryErrorCode,
  type ImageTransform,
  percentRectToLogical,
  type Rect,
  type Size,
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
// Any URI scheme prefix (covers data:/blob:/http:/https:/javascript:). imageRef must be a plain,
// scheme-less synthetic binding key — never a URL.
const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

const fail = (code: RenderPlanErrorCode, causeCode?: GeometryErrorCode): RenderPlanResult =>
  causeCode ? { ok: false, code, causeCode } : { ok: false, code };
const isFinitePositive = (n: number): boolean => Number.isFinite(n) && n > 0;
const isSizePositive = (s: { width: number; height: number }): boolean =>
  isFinitePositive(s.width) && isFinitePositive(s.height);
const isHex = (c: unknown): c is HexColor => typeof c === "string" && HEX.test(c);
const isTransformValid = (t: ImageTransform): boolean =>
  Number.isFinite(t.x) && Number.isFinite(t.y) && isFinitePositive(t.scale);
const isSafeImageRef = (ref: unknown): ref is string =>
  typeof ref === "string" && ref.trim().length > 0 && !SCHEME.test(ref);

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

/** Validate an optional stroke spec (color + finite positive width). */
function validateStroke(stroke: StrokeSpec): RenderPlanErrorCode | null {
  if (!isHex(stroke.color)) return "INVALID_COLOR";
  if (!Number.isFinite(stroke.width)) return "NON_FINITE_RESULT";
  if (stroke.width <= 0) return "INVALID_ZONE";
  return null;
}

/** Resolve a zone rect to a logical rect (percent → geometry conversion), or an error code. */
function resolveZoneRect(
  canvas: Size,
  rect: ZoneRect,
): { rect: Rect } | { code: RenderPlanErrorCode; causeCode?: GeometryErrorCode } {
  if (
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !isFinitePositive(rect.width) ||
    !isFinitePositive(rect.height)
  ) {
    return { code: "INVALID_ZONE" };
  }
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

function buildCase(input: CasePlanInput): RenderPlanResult {
  if (!isSizePositive(input.logicalCanvas)) return fail("INVALID_ZONE");
  if (!isHex(input.bodyColor)) return fail("INVALID_COLOR");
  if (!isSizePositive(input.image)) return fail("INVALID_ZONE");
  if (!isTransformValid(input.defaultTransform)) return fail("INVALID_TRANSFORM");
  if (!Array.isArray(input.zones)) return fail("INVALID_ZONE");

  // ids: non-empty, scheme-less imageRef, no duplicates.
  const seen = new Set<string>();
  for (const zone of input.zones) {
    if (typeof zone.id !== "string" || zone.id.trim().length === 0) return fail("INVALID_ID");
    if (!isSafeImageRef(zone.imageRef)) return fail("INVALID_ID");
    if (seen.has(zone.id)) return fail("INVALID_ID"); // duplicate zone id is fatal, not a warning
    seen.add(zone.id);
  }

  // deterministic order: order ascending (missing order = original index), ties by original index.
  const ordered = input.zones
    .map((zone, index) => ({ zone, index, key: zone.order !== undefined ? zone.order : index }))
    .sort((a, b) => a.key - b.key || a.index - b.index);

  const imageCommands: PreviewDrawCommand[] = [];
  const guideCommands: PreviewDrawCommand[] = [];
  for (const { zone } of ordered) {
    const resolved = resolveZoneRect(input.logicalCanvas, zone.rect);
    if ("code" in resolved) return fail(resolved.code, resolved.causeCode);
    const transform = zone.transform ?? input.defaultTransform;
    if (!isTransformValid(transform)) return fail("INVALID_TRANSFORM");
    const image = coverCommand(
      `case:user-image:${zone.id}`,
      zone.imageRef,
      resolved.rect,
      input.image,
      transform,
    );
    if ("code" in image) return fail(image.code, image.causeCode);
    imageCommands.push(image.command);
    if (zone.guide) {
      const strokeError = validateStroke(zone.guide);
      if (strokeError) return fail(strokeError);
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
  if (!isSizePositive(input.logicalCanvas)) return fail("INVALID_ZONE");
  if (!isRectValid(input.frameRect) || !isRectValid(input.imageZone)) return fail("INVALID_ZONE");
  if (!isHex(input.frameColor) || !isHex(input.matColor)) return fail("INVALID_COLOR");
  if (!isSizePositive(input.image)) return fail("INVALID_ZONE");
  if (!isTransformValid(input.transform)) return fail("INVALID_TRANSFORM");
  if (!isSafeImageRef(input.imageRef)) return fail("INVALID_ID");
  if (input.innerBorder) {
    const strokeError = validateStroke(input.innerBorder);
    if (strokeError) return fail(strokeError);
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
  if (input.innerBorder) {
    commands.push({
      type: "stroke-rect",
      layerId: "frame:inner-border",
      rect: rectCopy(input.imageZone),
      color: input.innerBorder.color,
      width: input.innerBorder.width,
    });
  }
  if (!commandsAllFinite(commands)) return fail("NON_FINITE_RESULT");
  return {
    ok: true,
    plan: { kind: "frame", logicalCanvas: sizeCopy(input.logicalCanvas), commands },
  };
}

const isRectValid = (r: Rect): boolean =>
  Number.isFinite(r.x) &&
  Number.isFinite(r.y) &&
  isFinitePositive(r.width) &&
  isFinitePositive(r.height);
const canvasRect = (s: Size): Rect => ({ x: 0, y: 0, width: s.width, height: s.height });
const sizeCopy = (s: Size): Size => ({ width: s.width, height: s.height });
const rectCopy = (r: Rect): Rect => ({ x: r.x, y: r.y, width: r.width, height: r.height });

/**
 * Build a deterministic, JSON-safe preview render plan for a case or frame input. Case and frame
 * are separate inputs with separate layer orders; all image placement comes from spec 019 geometry.
 * Never throws — ordinary bad input returns a typed error Result. Never emits placeholder commands
 * for template-art/camera/magsafe/text/clock (no data for them in this spec).
 */
export function buildPreviewRenderPlan(input: PreviewRenderPlanInput): RenderPlanResult {
  if (!input || (input.kind !== "case" && input.kind !== "frame")) return fail("INVALID_KIND");
  return input.kind === "case" ? buildCase(input) : buildFrame(input);
}
