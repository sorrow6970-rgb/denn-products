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
    let rects: Rect[];
    if (c.type === "draw-image-cover") rects = [c.clipRect, c.drawRect];
    else if (c.type === "draw-image-stretch") rects = [c.destRect];
    else rects = [c.rect];
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

/**
 * Validate an optional stroke spec (object + hex color + finite positive width). Each field is read
 * ONCE and the returned spec is built from those reads only (spec 025 §7).
 */
function validateStroke(stroke: unknown): StrokeSpec | RenderPlanErrorCode {
  if (!isObj(stroke)) return "INVALID_ZONE";
  const color = stroke.color;
  if (!isHex(color)) return "INVALID_COLOR";
  const width = stroke.width;
  if (!isFiniteNum(width)) return "NON_FINITE_RESULT";
  if (width <= 0) return "INVALID_ZONE";
  return { color, width };
}

/**
 * Validate a zone rect (object + units tag + finite origin + positive finite size). Each field is
 * read ONCE, in the same short-circuit order as before, and the returned rect is a plain snapshot.
 */
function validateZoneRect(raw: unknown): ZoneRect | null {
  if (!isObj(raw)) return null;
  const units = raw.units;
  if (units !== "logical" && units !== "percent") return null;
  const x = raw.x;
  const y = raw.y;
  const width = raw.width;
  const height = raw.height;
  if (!isFiniteNum(x) || !isFiniteNum(y) || !isFinitePositive(width) || !isFinitePositive(height)) {
    return null;
  }
  return { units, x, y, width, height };
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

/**
 * Quarter turns, read ONCE (spec 030 §2). `undefined` means "no rotation" and is the ONLY accepted
 * absence; every other non-`0|1|2|3` value — a float, a negative, 4, `"1"`, NaN — is rejected, never
 * wrapped with a modulo and never defaulted to 0. `null` is a value, not an absence, so it fails.
 */
function readQuarterTurnsOnce(value: unknown): 0 | 1 | 2 | 3 | null {
  if (value === undefined) return 0;
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  return null;
}

/**
 * Cover fit + the optional quarter turn (spec 030).
 *
 * A 90°/270° rotation swaps what the viewer sees, so the cover is computed from the SWAPPED
 * intrinsic size: `drawRect` is then the on-screen silhouette of the rotated photo and the spec 029
 * `maxPan = |drawSize - clipSize| / 2` stays correct without touching spec 019 geometry (which is
 * out of scope for this spec and unchanged). Pan stays on the SCREEN axes (C-3).
 *
 * `rotationQuarterTurns` is attached ONLY when non-zero, so an unrotated command is byte-identical
 * to the pre-030 shape.
 */
function coverCommand(
  layerId: string,
  imageRef: string,
  zoneRect: Rect,
  image: ImageIntrinsicSize,
  transform: ImageTransform,
  rotation: 0 | 1 | 2 | 3,
): { command: PreviewDrawCommand } | { code: RenderPlanErrorCode; causeCode?: GeometryErrorCode } {
  // odd turns exchange the axes; 0 and 180 keep the footprint the viewer already had
  const oriented =
    rotation === 1 || rotation === 3 ? { width: image.height, height: image.width } : image;
  const cover = computeCoverDrawRect({
    zone: zoneRect,
    image: oriented,
    transform,
    clampPan: true,
  });
  if (!cover.ok) return { code: "GEOMETRY_ERROR", causeCode: cover.code };
  return {
    command: {
      type: "draw-image-cover",
      layerId,
      imageRef,
      clipRect: zoneRect,
      drawRect: cover.value.drawRect,
      ...(rotation === 0 ? {} : { rotationQuarterTurns: rotation }),
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
  /** spec 030: 0 when absent; never a wrapped or defaulted value. */
  readonly rotation: 0 | 1 | 2 | 3;
  readonly guide?: StrokeSpec;
  readonly index: number;
  readonly key: number;
}

/**
 * Read ONE case zone into a plain normalized snapshot, taking every used field exactly once
 * (spec 025 §7). Nothing after this function touches the caller's zone object again, so a getter
 * that returns a valid value to the check and a different value afterwards cannot put an unvalidated
 * value into the plan. Read/validate order — and therefore the error priority — is unchanged.
 */
function readCaseZoneOnce(
  value: unknown,
  index: number,
  seen: Set<string>,
): NormalizedZone | RenderPlanErrorCode {
  if (!isObj(value)) return "INVALID_ZONE"; // null/undefined/primitive item
  const id = value.id;
  if (!isSafeId(id)) return "INVALID_ID";
  const imageRef = value.imageRef;
  if (!isSafeId(imageRef)) return "INVALID_ID";
  if (seen.has(id)) return "INVALID_ID"; // duplicate zone id is fatal, not a warning
  seen.add(id);

  const rect = validateZoneRect(value.rect);
  if (!rect) return "INVALID_ZONE";

  const order = value.order;
  if (order !== undefined && !isFiniteNum(order)) return "INVALID_ZONE";
  const key = isFiniteNum(order) ? order : index;

  // spec 025: each zone owns its intrinsic image size and transform — no plan-level fallback.
  const image = readSizeOnce(value.image);
  if (image === null) return "INVALID_ZONE";
  const transform = readTransformOnce(value.transform);
  if (transform === null) return "INVALID_TRANSFORM";
  // spec 030 §3: rotation validation belongs to the SAME step as transform finiteness/range, so a
  // bad rotation fails with the same code and at the same point in the priority order.
  const rotation = readQuarterTurnsOnce(value.rotationQuarterTurns);
  if (rotation === null) return "INVALID_TRANSFORM";

  const rawGuide = value.guide;
  let guide: StrokeSpec | undefined;
  if (rawGuide !== undefined) {
    const g = validateStroke(rawGuide);
    if (typeof g === "string") return g;
    guide = g;
  }

  return { id, imageRef, rect, image, transform, rotation, guide, index, key };
}

/** A template art layer whose every field was read exactly once and validated (spec 028). */
interface NormalizedArt {
  readonly imageRef: string;
  readonly destRect: Rect;
}

/**
 * Read the optional template art ONCE and validate it against the logical canvas. Absent art is not
 * a failure (`undefined`); present-but-unusable art fails with the existing code set — the vocabulary
 * of error codes is NOT extended by this spec.
 */
function readTemplateArtOnce(
  value: unknown,
  canvasBounds: Rect,
): NormalizedArt | RenderPlanErrorCode | undefined {
  if (value === undefined) return undefined;
  if (!isObj(value)) return "INVALID_ZONE";
  const imageRef = value.imageRef;
  if (!isSafeId(imageRef)) return "INVALID_ID";
  const destRect = readRectOnce(value.destRect);
  if (destRect === null) return "INVALID_ZONE";
  if (!edgesFinite(destRect)) return "NON_FINITE_RESULT";
  // the art may cover the canvas exactly, but never spill outside it (no clamp, no shrink)
  if (!contains(canvasBounds, destRect)) return "INVALID_ZONE";
  return { imageRef, destRect };
}

const artCommand = (layerId: string, art: NormalizedArt): PreviewDrawCommand => ({
  type: "draw-image-stretch",
  layerId,
  imageRef: art.imageRef,
  destRect: rectCopy(art.destRect),
});

function buildCase(input: CasePlanInput): RenderPlanResult {
  // Every case value — canvas size, body colour, the zones array and each zone field — is read ONCE
  // into a plain snapshot (spec 025 §7). Validation, ordering and command building below read only
  // those snapshots; the caller's objects are never re-read.
  const canvas = readSizeOnce(input.logicalCanvas);
  if (canvas === null) return fail("INVALID_ZONE");
  const bodyColor = input.bodyColor;
  if (!isHex(bodyColor)) return fail("INVALID_COLOR");
  const rawZones: unknown = input.zones;
  if (!Array.isArray(rawZones)) return fail("INVALID_ZONE");
  const zoneCount = rawZones.length;
  // spec 028: the case art covers the logical canvas; it is read once, here, and never re-read.
  const art = readTemplateArtOnce(input.templateArt, canvasRect(canvas));
  if (typeof art === "string") return fail(art);

  const seen = new Set<string>();
  const normalized: NormalizedZone[] = [];
  for (let index = 0; index < zoneCount; index++) {
    const zone = readCaseZoneOnce((rawZones as readonly unknown[])[index], index, seen);
    if (typeof zone === "string") return fail(zone);
    normalized.push(zone);
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
      zone.rotation,
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
      color: bodyColor,
    },
    ...imageCommands,
    // legacy order: the template artwork sits ON the photos and UNDER the guides (mockup:1679)
    ...(art === undefined ? [] : [artCommand("case:template-art", art)]),
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
  // spec 030 §3: same validation step as the transform's finiteness/range (see readCaseZoneOnce)
  const rotation = readQuarterTurnsOnce(input.rotationQuarterTurns);
  if (rotation === null) return fail("INVALID_TRANSFORM");
  const imageRef = input.imageRef;
  if (!isSafeId(imageRef)) return fail("INVALID_ID");

  const rawInnerBorder = input.innerBorder;
  let innerBorder: StrokeSpec | undefined;
  if (rawInnerBorder !== undefined) {
    const b = validateStroke(rawInnerBorder);
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

  // spec 028: the frame art is stretched over its own rect (the caller supplies the mat rect)
  const art = readTemplateArtOnce(input.templateArt, canvasBounds);
  if (typeof art === "string") return fail(art);

  const drawn = coverCommand("frame:user-image", imageRef, imageZone, image, transform, rotation);
  if ("code" in drawn) return fail(drawn.code, drawn.causeCode);

  const commands: PreviewDrawCommand[] = [
    { type: "fill-rect", layerId: "frame:body", rect: frameRect, color: frameColor },
    // the mat fills its OWN rect; the photo zone is a separate, smaller rect (spec 024 §1, §2)
    { type: "fill-rect", layerId: "frame:mat", rect: matRect, color: matColor },
    drawn.command,
    // legacy order: art over the photo, under the inner border (mockup:3093-3097, :3133)
    ...(art === undefined ? [] : [artCommand("frame:template-art", art)]),
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
    if (!isObj(input)) return fail("INVALID_KIND");
    const kind = input.kind; // read once: a drifting `kind` cannot re-route after the check
    if (kind !== "case" && kind !== "frame") return fail("INVALID_KIND");
    return kind === "case"
      ? buildCase(input as CasePlanInput)
      : buildFrame(input as FramePlanInput);
  } catch {
    // Last-resort boundary (spec 024 §4): a property read anywhere in the input can throw (hostile
    // getter, Proxy trap, revoked Proxy). Such input is not a usable zone, and the existing error
    // code set is NOT extended. The thrown object is never stored or surfaced.
    return fail("INVALID_ZONE");
  }
}
