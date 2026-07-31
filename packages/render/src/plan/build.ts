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
  PlanFontSpec,
  PlanTextLine,
  PreviewDrawCommand,
  PreviewRenderPlanInput,
  PreviewRenderPlanOptions,
  RenderPlanErrorCode,
  RenderPlanResult,
  StrokeSpec,
  TextMeasurePort,
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
    else if (c.type === "draw-text") {
      // spec 031: text has an origin and measured widths instead of a rect
      if (!Number.isFinite(c.origin.x) || !Number.isFinite(c.origin.y)) return false;
      if (!Number.isFinite(c.lineHeightPx) || !Number.isFinite(c.letterSpacingPx)) return false;
      if (!Number.isFinite(c.rotationDegrees) || !Number.isFinite(c.font.sizePx)) return false;
      if (c.lines.some((line) => !Number.isFinite(line.width))) return false;
      continue;
    } else rects = [c.rect];
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

function buildFrame(input: FramePlanInput, options?: PreviewRenderPlanOptions): RenderPlanResult {
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

  // spec 031: text sits over the art and under the inner border. Any text failure rejects the
  // whole plan — there is no partial plan and no previous-value fallback.
  const textCommands = frameTextCommands(input, canvas, options?.measureText);
  if (typeof textCommands === "string") return fail(textCommands);

  const commands: PreviewDrawCommand[] = [
    { type: "fill-rect", layerId: "frame:body", rect: frameRect, color: frameColor },
    // the mat fills its OWN rect; the photo zone is a separate, smaller rect (spec 024 §1, §2)
    { type: "fill-rect", layerId: "frame:mat", rect: matRect, color: matColor },
    drawn.command,
    // legacy order: art over the photo, under the inner border (mockup:3093-3097, :3133)
    ...(art === undefined ? [] : [artCommand("frame:template-art", art)]),
    ...textCommands,
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
export function buildPreviewRenderPlan(
  input: PreviewRenderPlanInput,
  options?: PreviewRenderPlanOptions,
): RenderPlanResult {
  try {
    if (!isObj(input)) return fail("INVALID_KIND");
    const kind = input.kind; // read once: a drifting `kind` cannot re-route after the check
    if (kind !== "case" && kind !== "frame") return fail("INVALID_KIND");
    return kind === "case"
      ? buildCase(input as CasePlanInput)
      : buildFrame(input as FramePlanInput, options);
  } catch {
    // Last-resort boundary (spec 024 §4): a property read anywhere in the input can throw (hostile
    // getter, Proxy trap, revoked Proxy). Such input is not a usable zone, and the existing error
    // code set is NOT extended. The thrown object is never stored or surfaced.
    return fail("INVALID_ZONE");
  }
}

// --- spec 031: deterministic text -------------------------------------------
//
// Wrapping happens HERE, once, through the injected measurement port, so the plan is deterministic
// and the executor never re-wraps. Nothing repairs a bad value: an over-long string, a control
// character or a wrap that needs more lines than the zone allows rejects the WHOLE plan — there is
// no truncation, no ellipsis, no partial command and no fallback to a previous value (Founder F-6).

/** `\n` is the only allowed control character; every other C0/C1 code point is rejected. */
const NEWLINE = String.fromCharCode(10);

/** A newline is the only allowed control character; every other C0/C1 code point is rejected. */
function hasForbiddenControlChar(value: string): boolean {
  for (const char of value) {
    if (char === NEWLINE) continue;
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

const FORBIDDEN_FAMILY_CHARS = new Set(['"', "'", ";", "\\"]);

/** 1..64 code units, no control characters and no quote/semicolon/backslash. */
function isUsableFontFamily(value: string): boolean {
  if (value.length < 1 || value.length > 64) return false;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return false;
    if (FORBIDDEN_FAMILY_CHARS.has(char)) return false;
  }
  return true;
}

const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const inClosed = (v: unknown, min: number, max: number): v is number =>
  isFiniteNum(v) && v >= min && v <= max;
const inHalfOpen = (v: unknown, max: number): v is number => isFiniteNum(v) && v > 0 && v <= max;
const isIntIn = (v: unknown, min: number, max: number): v is number =>
  isFiniteNum(v) && Number.isInteger(v) && v >= min && v <= max;

/** A text zone whose every field was read exactly once and validated. */
interface NormalizedTextZone {
  readonly value: string | undefined;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly boxWidthPercent: number;
  readonly fontSizePercent: number;
  readonly align: "left" | "center" | "right";
  readonly fontFamily: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly color: HexColor;
  readonly lineHeight: number;
  readonly letterSpacingPercent: number;
  readonly rotationDegrees: number;
  readonly maxChars: number;
  readonly maxLines: number;
}

/**
 * Read ONE text zone into a plain snapshot. Every field is taken exactly once, so a getter that
 * returns a valid value to the check and a different one afterwards cannot reach the plan.
 */
function readTextZoneOnce(value: unknown): NormalizedTextZone | RenderPlanErrorCode {
  if (!isObj(value)) return "INVALID_TEXT";
  const raw = value.value;
  if (raw !== undefined && typeof raw !== "string") return "INVALID_TEXT";
  const x = value.xPercent;
  const y = value.yPercent;
  if (!inClosed(x, 0, 100) || !inClosed(y, 0, 100)) return "INVALID_TEXT";
  const boxWidthPercent = value.boxWidthPercent;
  const fontSizePercent = value.fontSizePercent;
  if (!inHalfOpen(boxWidthPercent, 100) || !inHalfOpen(fontSizePercent, 100)) return "INVALID_TEXT";
  const align = value.align;
  if (align !== "left" && align !== "center" && align !== "right") return "INVALID_TEXT";
  const fontFamily = value.fontFamily;
  if (typeof fontFamily !== "string" || !isUsableFontFamily(fontFamily)) return "INVALID_TEXT";
  const bold = value.bold;
  const italic = value.italic;
  if (!isBool(bold) || !isBool(italic)) return "INVALID_TEXT";
  const color = value.color;
  if (!isHex(color)) return "INVALID_COLOR";
  const lineHeight = value.lineHeight;
  if (!inHalfOpen(lineHeight, 3)) return "INVALID_TEXT";
  const letterSpacingPercent = value.letterSpacingPercent;
  if (!inClosed(letterSpacingPercent, -100, 100)) return "INVALID_TEXT";
  const rotationDegrees = value.rotationDegrees;
  if (!inClosed(rotationDegrees, -360, 360)) return "INVALID_TEXT";
  const maxChars = value.maxChars;
  if (!isIntIn(maxChars, 1, 200)) return "INVALID_TEXT";
  const maxLines = value.maxLines;
  if (!isIntIn(maxLines, 1, 5)) return "INVALID_TEXT";
  return {
    value: raw,
    xPercent: x,
    yPercent: y,
    boxWidthPercent,
    fontSizePercent,
    align,
    fontFamily,
    bold,
    italic,
    color,
    lineHeight,
    letterSpacingPercent,
    rotationDegrees,
    maxChars,
    maxLines,
  };
}

/** Measure through the port; any throw / non-finite / negative result fails the plan closed. */
function measure(port: TextMeasurePort, text: string, font: PlanFontSpec): number | null {
  let width: unknown;
  try {
    width = port({ text, font });
  } catch {
    return null; // the thrown value is never stored or surfaced
  }
  if (!isFiniteNum(width) || width < 0) return null;
  return width;
}

/**
 * Width of `text` including letter spacing: spacing is added between ADJACENT glyphs only, so a
 * single code point costs no spacing. Code points (not UTF-16 units) are the glyph unit, matching
 * the executor's per-glyph draw.
 */
function measureWithSpacing(
  port: TextMeasurePort,
  text: string,
  font: PlanFontSpec,
  spacingPx: number,
): number | null {
  const base = measure(port, text, font);
  if (base === null) return null;
  if (spacingPx === 0) return base;
  const glyphs = Array.from(text).length;
  const total = base + Math.max(0, glyphs - 1) * spacingPx;
  return Number.isFinite(total) ? total : null;
}

/**
 * Wrap one paragraph: word boundaries first, then a hard code-point split for a single word that
 * still does not fit. A word longer than the box is broken rather than allowed to overflow.
 */
function wrapParagraph(
  port: TextMeasurePort,
  paragraph: string,
  font: PlanFontSpec,
  spacingPx: number,
  maxWidth: number,
): PlanTextLine[] | null {
  if (paragraph === "") return [{ text: "", width: 0 }];
  const out: PlanTextLine[] = [];
  let current = "";
  let currentWidth = 0;

  const flush = (): void => {
    out.push({ text: current, width: currentWidth });
    current = "";
    currentWidth = 0;
  };

  /** Break a single oversized token into code-point chunks that each fit. */
  const breakToken = (token: string): boolean => {
    for (const glyph of Array.from(token)) {
      const candidate = current + glyph;
      const width = measureWithSpacing(port, candidate, font, spacingPx);
      if (width === null) return false;
      if (width > maxWidth && current !== "") {
        flush();
        const alone = measureWithSpacing(port, glyph, font, spacingPx);
        if (alone === null) return false;
        current = glyph;
        currentWidth = alone;
        continue;
      }
      current = candidate;
      currentWidth = width;
    }
    return true;
  };

  for (const word of paragraph.split(" ")) {
    const candidate = current === "" ? word : `${current} ${word}`;
    const width = measureWithSpacing(port, candidate, font, spacingPx);
    if (width === null) return null;
    if (width <= maxWidth) {
      current = candidate;
      currentWidth = width;
      continue;
    }
    if (current !== "") flush();
    const alone = measureWithSpacing(port, word, font, spacingPx);
    if (alone === null) return null;
    if (alone <= maxWidth) {
      current = word;
      currentWidth = alone;
      continue;
    }
    // the word alone overflows: split it by code point
    if (!breakToken(word)) return null;
  }
  flush();
  return out;
}

/**
 * Build one `draw-text` command, or `undefined` when the zone is empty.
 *
 * Order of checks mirrors spec 031 §3: the customer's characters and length first, then the
 * measurement, then the wrap against `maxLines`.
 */
function textCommand(
  layerId: string,
  zone: NormalizedTextZone,
  canvas: { width: number; height: number },
  port: TextMeasurePort | undefined,
): { command: PreviewDrawCommand } | { code: RenderPlanErrorCode } | undefined {
  const value = zone.value;
  // `undefined` and `""` are the ONLY empties. `"0"` is a real value and must render.
  if (value === undefined || value === "") return undefined;
  if (hasForbiddenControlChar(value)) return { code: "INVALID_TEXT" };
  // UTF-16 code units, to match the HTML `maxLength` the input enforces
  if (value.length > zone.maxChars) return { code: "INVALID_TEXT" };
  if (port === undefined) return { code: "TEXT_MEASUREMENT_FAILED" };

  const sizePx = (zone.fontSizePercent / 100) * canvas.width;
  const boxWidth = (zone.boxWidthPercent / 100) * canvas.width;
  const lineHeightPx = sizePx * zone.lineHeight;
  const letterSpacingPx = (zone.letterSpacingPercent / 100) * sizePx;
  if (!isFiniteNum(sizePx) || sizePx <= 0) return { code: "INVALID_TEXT" };
  if (!isFiniteNum(boxWidth) || boxWidth <= 0) return { code: "INVALID_TEXT" };
  if (!isFiniteNum(lineHeightPx) || !isFiniteNum(letterSpacingPx)) return { code: "INVALID_TEXT" };

  const font: PlanFontSpec = {
    family: zone.fontFamily,
    sizePx,
    weight: zone.bold ? "bold" : "normal",
    italic: zone.italic,
    fallback: "sans-serif",
  };

  const lines: PlanTextLine[] = [];
  // explicit newlines first, then word wrapping inside each paragraph
  for (const paragraph of value.split("\n")) {
    const wrapped = wrapParagraph(port, paragraph, font, letterSpacingPx, boxWidth);
    if (wrapped === null) return { code: "TEXT_MEASUREMENT_FAILED" };
    lines.push(...wrapped);
    if (lines.length > zone.maxLines) return { code: "INVALID_TEXT" };
  }
  if (lines.length === 0 || lines.length > zone.maxLines) return { code: "INVALID_TEXT" };

  const originX = (zone.xPercent / 100) * canvas.width;
  const originY = (zone.yPercent / 100) * canvas.height;
  if (!isFiniteNum(originX) || !isFiniteNum(originY)) return { code: "NON_FINITE_RESULT" };

  return {
    command: {
      type: "draw-text",
      layerId,
      lines,
      origin: { x: originX, y: originY },
      align: zone.align,
      font,
      color: zone.color,
      lineHeightPx,
      letterSpacingPx,
      rotationDegrees: zone.rotationDegrees,
    },
  };
}

/** All text commands for a frame, in source order. Any failure rejects the whole plan. */
function frameTextCommands(
  input: FramePlanInput,
  canvas: { width: number; height: number },
  port: TextMeasurePort | undefined,
): PreviewDrawCommand[] | RenderPlanErrorCode {
  const raw: unknown = input.textZones;
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return "INVALID_TEXT";
  const commands: PreviewDrawCommand[] = [];
  for (let index = 0; index < (raw as readonly unknown[]).length; index++) {
    const zone = readTextZoneOnce((raw as readonly unknown[])[index]);
    if (typeof zone === "string") return zone;
    // the layerId is positional on purpose: the zone key never reaches a command
    const built = textCommand(`frame:text:${index}`, zone, canvas, port);
    if (built === undefined) continue;
    if ("code" in built) return built.code;
    commands.push(built.command);
  }
  return commands;
}
