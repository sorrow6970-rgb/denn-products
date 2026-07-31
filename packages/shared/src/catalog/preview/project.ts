// Pure catalog preview geometry projection (spec 023). No React/DOM/Canvas/Firebase/@denn/render,
// no IO, no Date/random/global state. Never throws — a hostile getter, a Proxy trap or a revoked
// Proxy anywhere in the document/selection becomes a typed failure Result.
//
// Legacy evidence (verified 2026-07-28, `denn-mockup-tool.html` / `denn-admin.html`):
//  - case model logical size = `models[].w/h` (admin:848; mockup:1047 sets the canvas backing to it)
//  - case zones = `caseTemplates[].photoZones`, x/y/w/h are PERCENT of the model w/h
//    (authoring admin:2191 `z.x/m.w*100`; consumption mockup:1664), aliases `zones` ↔ `photoZones`
//    (mockup:11030-11031, admin:9783-9784), single `photoSlot` fallback (mockup:1673-1677)
//  - zone shapes: `type==='circle'` → ellipse clip, `cornerR>0` → rounded clip (mockup:1667-1668) —
//    a rectangle cannot represent either, so they FAIL here instead of being approximated
//  - frame aspect = `frameSizes[].aspect` (admin:852; mockup:3119 `ph=pw*aspect`)
//  - frame border = `sz.frameThickness ?? admin.frameThickness ?? 5.5` as a percent of the WIDTH
//    (mockup:3120). The `5.5` is an HTML-only constant and is deliberately NOT reproduced here.
//  - mat colour = `frameTemplateBg(tpl)` else `#fff` (mockup:3112, :3126-3128); enable flags and
//    colour aliases with `#RRGGBB` validation (mockup:3109-3111)
//  - frame template photo layout: uploaded → `photoZones` (non-empty) else `[photoSlot]` else full
//    mat area (mockup:3044-3047, :3069-3074); builtin → id-dispatched slots, `full` = one rect,
//    `duo`/`trio` = 2/3 rects, `circle` = ellipse, `text_only` = none, `top_text` = sub-rect
//    (mockup:3134-3140)

import { hasCatalogTemplateDesignSource } from "../images/project";
import { isPlainObject } from "../json";
import type { CatalogDocumentV1, CatalogItemV1 } from "../types";
import {
  FRAME_TEXT_DEFAULT_MAX_CHARS,
  FRAME_TEXT_DEFAULT_MAX_LINES,
  FRAME_TEXT_KEYS,
} from "./types";
import type {
  CasePreviewGeometry,
  CasePreviewSelection,
  CasePreviewZone,
  FrameClockPreview,
  FramePreviewGeometry,
  FramePrintPhysicalSize,
  FramePreviewSelection,
  FrameTextAlign,
  FrameTextKey,
  FrameTextZone,
  PreviewPercentRect,
  PreviewProjectionCollection,
  PreviewProjectionDiagnostic,
  PreviewProjectionDiagnosticCode,
  PreviewProjectionErrorCode,
  PreviewProjectionResult,
} from "./types";

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** Legacy zone `type` values that are evidenced as rectangular (mockup:3050-3051, :3071). */
const RECT_ZONE_TYPES = new Set(["rect"]);

/** Enable-flag aliases and their truthy spellings (mockup:3109-3110). */
const MAT_ENABLE_KEYS = ["backgroundEnabled", "templateBackgroundEnabled", "canvasBgEnabled"];
const MAT_COLOR_KEYS = [
  "templateBackgroundColor",
  "canvasBgColor",
  "backgroundColor",
  "paperColor",
];
/** Fields whose presence means the template carries inner-border data (mockup:3101-3106). */
const INNER_BORDER_KEYS = [
  "whiteInnerBorder",
  "whiteBorderBaked",
  "whiteInnerBorderThickness",
  "whiteBorderBakedThickness",
  "whiteBorderColor",
];
/** Builtin frame template ids whose photo layout is a SINGLE rectangle (mockup:3134). */
const SINGLE_RECT_BUILTIN_IDS = new Set(["full"]);

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isFinitePositive = (v: unknown): v is number => isFiniteNumber(v) && v > 0;
const isNonBlankString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

class ProjectionFailure extends Error {
  constructor(readonly code: PreviewProjectionErrorCode) {
    super(code);
  }
}

const fail = (code: PreviewProjectionErrorCode): never => {
  throw new ProjectionFailure(code);
};

/** Collects notices in discovery order; the same (code, collection, index) is reported once. */
class Diagnostics {
  private readonly items: PreviewProjectionDiagnostic[] = [];

  add(
    code: PreviewProjectionDiagnosticCode,
    collection: PreviewProjectionCollection,
    sourceIndex?: number,
  ): void {
    const duplicate = this.items.some(
      (d) => d.code === code && d.collection === collection && d.sourceIndex === sourceIndex,
    );
    if (duplicate) return;
    this.items.push(
      sourceIndex === undefined ? { code, collection } : { code, collection, sourceIndex },
    );
  }

  snapshot(): readonly PreviewProjectionDiagnostic[] {
    return this.items.map((d) => ({ ...d }));
  }
}

/** The validated `data` object of the document shell. */
function readData(document: unknown): Record<string, unknown> {
  if (!isPlainObject(document)) fail("INVALID_INPUT");
  const data = (document as Record<string, unknown>).data;
  if (!isPlainObject(data)) fail("INVALID_INPUT");
  return data as Record<string, unknown>;
}

/** Exactly-one lookup by id. The selection id is used for matching only, never echoed. */
function lookupById(
  data: Record<string, unknown>,
  collection: PreviewProjectionCollection,
  id: string,
): { item: Record<string, unknown>; index: number } {
  const raw = data[collection];
  if (!Array.isArray(raw)) fail("INVALID_COLLECTION");
  const items = raw as readonly unknown[];
  let found: { item: unknown; index: number } | null = null;
  let matches = 0;
  for (let index = 0; index < items.length; index++) {
    const candidate = items[index];
    // a primitive/nullish entry simply cannot match; reading `.id` off it must not throw
    if (candidate === null || candidate === undefined) continue;
    if (typeof candidate !== "object" && typeof candidate !== "function") continue;
    if ((candidate as Record<string, unknown>).id !== id) continue;
    matches += 1;
    if (found === null) found = { item: candidate, index };
  }
  if (matches === 0) fail("ITEM_NOT_FOUND");
  if (matches > 1) fail("AMBIGUOUS_ITEM");
  const hit = found as { item: unknown; index: number };
  if (!isPlainObject(hit.item)) fail("INVALID_ITEM");
  return { item: hit.item as Record<string, unknown>, index: hit.index };
}

// --- case ------------------------------------------------------------------

/** Read one zone rect: finite percents, positive size, and inside the 0..100 box (no clamping). */
function readZoneRect(zone: Record<string, unknown>): PreviewPercentRect {
  const x = zone.x;
  const y = zone.y;
  const width = zone.w;
  const height = zone.h;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) fail("INVALID_GEOMETRY");
  if (!isFinitePositive(width) || !isFinitePositive(height)) fail("INVALID_GEOMETRY");
  const px = x as number;
  const py = y as number;
  const pw = width as number;
  const ph = height as number;
  // exact bounds, no tolerance: a percent rect must sit inside the model box
  if (px < 0 || py < 0 || px + pw > 100 || py + ph > 100) fail("INVALID_GEOMETRY");
  return { x: px, y: py, width: pw, height: ph };
}

/** Reject every shape a rectangle cannot represent (circle, rounded, unknown type). */
function assertRectangularZone(zone: Record<string, unknown>): void {
  const type = zone.type;
  const isRectType =
    type === undefined ||
    type === null ||
    type === "" ||
    (typeof type === "string" && RECT_ZONE_TYPES.has(type));
  if (!isRectType) fail("UNSUPPORTED_ZONE_SHAPE");
  const cornerR = zone.cornerR;
  if (cornerR !== undefined && cornerR !== null && isFinitePositive(cornerR)) {
    fail("UNSUPPORTED_ZONE_SHAPE");
  }
}

/** Zone source priority (spec 023 §4): photoZones → zones alias → single photoSlot. */
function resolveCaseZoneSource(
  template: Record<string, unknown>,
  diagnostics: Diagnostics,
): readonly unknown[] {
  const photoZones = template.photoZones;
  if (Array.isArray(photoZones)) {
    // an explicitly present but empty array is a failure, never a fallthrough
    if (photoZones.length === 0) fail("INVALID_GEOMETRY");
    return photoZones as readonly unknown[];
  }
  const zones = template.zones;
  if (Array.isArray(zones)) {
    if (zones.length === 0) fail("INVALID_GEOMETRY");
    diagnostics.add("LEGACY_ZONES_ALIAS", "caseTemplates");
    return zones as readonly unknown[];
  }
  const photoSlot = template.photoSlot;
  if (isPlainObject(photoSlot)) {
    diagnostics.add("PHOTO_SLOT_FALLBACK", "caseTemplates");
    return [photoSlot];
  }
  return fail("INVALID_GEOMETRY");
}

function projectCase(
  document: unknown,
  selection: unknown,
  diagnostics: Diagnostics,
): CasePreviewGeometry {
  const data = readData(document);
  if (!isPlainObject(selection)) fail("INVALID_INPUT");
  const { modelId, templateId } = selection as Record<string, unknown>;
  if (!isNonBlankString(modelId) || !isNonBlankString(templateId)) fail("INVALID_INPUT");

  // model logical size — exactly as stored, no coercion/abs/clamp/fallback
  const model = lookupById(data, "models", modelId as string).item;
  const width = model.w;
  const height = model.h;
  if (!isFinitePositive(width) || !isFinitePositive(height)) fail("INVALID_GEOMETRY");

  const template = lookupById(data, "caseTemplates", templateId as string).item;
  const source = resolveCaseZoneSource(template, diagnostics);

  const zones: CasePreviewZone[] = [];
  for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex++) {
    const zone = source[sourceIndex];
    if (!isPlainObject(zone)) fail("INVALID_GEOMETRY");
    const record = zone as Record<string, unknown>;
    assertRectangularZone(record);
    zones.push({
      // synthesized from the ORIGINAL index; never renumbered after sorting/filtering
      id: `case-zone-${sourceIndex}`,
      sourceIndex,
      percentRect: readZoneRect(record),
    });
  }

  return {
    modelLogicalSize: { width: width as number, height: height as number },
    zones,
  };
}

// --- frame -----------------------------------------------------------------

/** size-level value first, then top-level; a present-but-invalid value fails (never falls back). */
function resolveBorderPercent(
  data: Record<string, unknown>,
  size: Record<string, unknown>,
): number {
  const sizeValue = size.frameThickness;
  if (sizeValue !== undefined) {
    if (!isFinitePositive(sizeValue)) fail("INVALID_GEOMETRY");
    return sizeValue as number;
  }
  const topLevel = data.frameThickness;
  if (topLevel !== undefined) {
    if (!isFinitePositive(topLevel)) fail("INVALID_GEOMETRY");
    return topLevel as number;
  }
  // no evidenced catalog value: the legacy `5.5` lives in the HTML, not in the catalog
  return fail("INVALID_GEOMETRY");
}

const isTruthyFlag = (value: unknown): boolean =>
  value === true ||
  value === 1 ||
  value === "1" ||
  (typeof value === "string" && (value.toLowerCase() === "true" || value.toLowerCase() === "on"));

/** Mat colour: enabled flag aliases + colour aliases, `#RRGGBB` only, `#FFFFFF` fallback. */
function resolveMatColor(
  template: Record<string, unknown>,
  diagnostics: Diagnostics,
  sourceIndex: number,
): string {
  const enabled = MAT_ENABLE_KEYS.some((key) => isTruthyFlag(template[key]));
  if (!enabled) return "#FFFFFF";
  let sawCandidate = false;
  for (const key of MAT_COLOR_KEYS) {
    const raw = template[key];
    if (raw === undefined || raw === null || raw === "") continue;
    sawCandidate = true;
    if (typeof raw === "string" && HEX6.test(raw)) return raw.toUpperCase();
  }
  // a colour field existed but none was an exact #RRGGBB → white, and say so (no raw value kept)
  if (sawCandidate) diagnostics.add("INVALID_MAT_COLOR", "frameTemplates", sourceIndex);
  return "#FFFFFF";
}

/**
 * How far the photo sits inside the mat, in logical px (spec 025 §3).
 *
 * `0` when the template is `uploaded` AND carries a design source: that legacy branch draws into the
 * mat rect itself and returns before the id-dispatch code that applies an inset
 * (denn-mockup-tool.html:3133 → :3068-3074). `8` otherwise (builtin `full`, uploaded without a
 * design source), which the id-dispatch path insets on each side (:3130 `cx = IX + P`, :3134/:3140).
 *
 * The legacy `P = uploadedTransparentTpl ? 0 : 8` expression is deliberately NOT reproduced: its
 * `0` branch is unreachable, so copying it would be wrong. Only the final number is returned — no
 * source string, field name, URL kind or flag ever leaves this function.
 */
function resolveContentInsetPx(template: Record<string, unknown>): 0 | 8 {
  if (template.type !== "uploaded") return 8;
  return hasCatalogTemplateDesignSource(template as unknown as CatalogItemV1) ? 0 : 8;
}

/**
 * Only a template whose photo layout is a SINGLE rectangle covering the whole mat area is supported.
 * Multi-zone, text-only, sub-rect and circular layouts fail; an unknown type/id is never presumed
 * to be supported (spec 023 §5).
 */
function assertSingleRectFrameTemplate(template: Record<string, unknown>): void {
  const type = template.type;
  if (type === "uploaded") {
    const photoZones = template.photoZones;
    const zones = template.zones;
    const explicit = Array.isArray(photoZones)
      ? (photoZones as readonly unknown[])
      : Array.isArray(zones)
        ? (zones as readonly unknown[])
        : null;
    if (explicit !== null) {
      if (explicit.length === 0) fail("INVALID_GEOMETRY");
      if (explicit.length > 1) fail("UNSUPPORTED_FRAME_TEMPLATE");
      const only = explicit[0];
      if (!isPlainObject(only)) fail("INVALID_GEOMETRY");
      const record = only as Record<string, unknown>;
      assertRectangularZone(record);
      const rect = readZoneRect(record);
      // the frame image area of this output is the whole mat rect; a sub-rect is not representable
      if (rect.x !== 0 || rect.y !== 0 || rect.width !== 100 || rect.height !== 100) {
        fail("UNSUPPORTED_FRAME_TEMPLATE");
      }
      return;
    }
    const photoSlot = template.photoSlot;
    if (isPlainObject(photoSlot)) {
      const record = photoSlot as Record<string, unknown>;
      assertRectangularZone(record);
      const rect = readZoneRect(record);
      if (rect.x !== 0 || rect.y !== 0 || rect.width !== 100 || rect.height !== 100) {
        fail("UNSUPPORTED_FRAME_TEMPLATE");
      }
      return;
    }
    // no zone data at all → legacy draws one full-mat rectangle (mockup:3070-3072)
    return;
  }
  if (type === "builtin") {
    const id = template.id;
    if (typeof id === "string" && SINGLE_RECT_BUILTIN_IDS.has(id)) return;
    // `circle` is an ellipse slot; `duo`/`trio` are 2/3 slots; `text_only`/`top_text` are not a
    // full-mat rectangle; an unknown builtin id is not presumed supported (mockup:3134-3140).
    if (id === "circle") fail("UNSUPPORTED_ZONE_SHAPE");
    fail("UNSUPPORTED_FRAME_TEMPLATE");
  }
  fail("UNSUPPORTED_FRAME_TEMPLATE");
}

function projectFrame(
  document: unknown,
  selection: unknown,
  diagnostics: Diagnostics,
): FramePreviewGeometry {
  const data = readData(document);
  if (!isPlainObject(selection)) fail("INVALID_INPUT");
  const { frameSizeId, templateId } = selection as Record<string, unknown>;
  if (!isNonBlankString(frameSizeId) || !isNonBlankString(templateId)) fail("INVALID_INPUT");

  const size = lookupById(data, "frameSizes", frameSizeId as string).item;
  const aspect = size.aspect;
  // a missing aspect is a failure: the legacy `|| 1` is a UI fallback, not a catalog default
  if (!isFinitePositive(aspect)) fail("INVALID_GEOMETRY");
  const borderPercentOfWidth = resolveBorderPercent(data, size);

  const found = lookupById(data, "frameTemplates", templateId as string);
  const template = found.item;
  assertSingleRectFrameTemplate(template);
  const contentInsetPx = resolveContentInsetPx(template);
  const matColor = resolveMatColor(template, diagnostics, found.index);

  // Deliberately omitted from the output (spec 023 §5, §6): the legacy inner border is 4 filled
  // bands (not a stroke) and the mat outline is an alpha colour.
  if (INNER_BORDER_KEYS.some((key) => template[key] !== undefined)) {
    diagnostics.add("INNER_BORDER_OMITTED", "frameTemplates", found.index);
  }
  diagnostics.add("ALPHA_OUTLINE_OMITTED", "frameTemplates", found.index);

  // spec 031: operator-owned text zones and the PHYSICAL clock placement (preview-only).
  const textZones = readTextZones(template);
  const clockPreview = readClockPreview(data, size, template);

  return {
    aspect: aspect as number,
    borderPercentOfWidth,
    matColor,
    contentInsetPx,
    textZones,
    clockPreview,
  };
}

function run<T>(project: (diagnostics: Diagnostics) => T): PreviewProjectionResult<T> {
  const diagnostics = new Diagnostics();
  try {
    const value = project(diagnostics);
    return { ok: true, value, diagnostics: diagnostics.snapshot() };
  } catch (error) {
    // a typed failure keeps its code; anything else (hostile getter, Proxy trap, revoked Proxy)
    // is an unusable input. The thrown object itself is never stored or surfaced.
    const code: PreviewProjectionErrorCode =
      error instanceof ProjectionFailure ? error.code : "INVALID_INPUT";
    return { ok: false, code, diagnostics: diagnostics.snapshot() };
  }
}

/**
 * Project the case preview geometry a later plan assembler needs: the model logical size and the
 * rectangular photo zones in percent, in original order, with synthesized ids.
 *
 * Never throws. Returns no colour, no user image, no CSS logical size and no raw catalog value —
 * those are the caller's inputs (spec 023 §1 Q1/Q3).
 */
export function projectCasePreviewGeometry(
  document: CatalogDocumentV1,
  selection: CasePreviewSelection,
): PreviewProjectionResult<CasePreviewGeometry> {
  return run((diagnostics) => projectCase(document, selection, diagnostics));
}

/**
 * Project the frame preview geometry: the stored aspect (H/W), the border thickness as a percent of
 * the logical width, and the mat colour. No pixel size, no frame colour (there is no colour
 * selection step yet), no inner border and no alpha outline.
 *
 * Never throws.
 */
export function projectFramePreviewGeometry(
  document: CatalogDocumentV1,
  selection: FramePreviewSelection,
): PreviewProjectionResult<FramePreviewGeometry> {
  return run((diagnostics) => projectFrame(document, selection, diagnostics));
}

// --- spec 031: frame text zones + physical clock preview ----------------------
//
// Every value is read EXACTLY ONCE inside the projection's exception boundary and copied into a
// plain snapshot, so a hostile getter, a Proxy trap, a revoked Proxy or a drifting accessor cannot
// put an unvalidated value into the output. Nothing here repairs, clamps or defaults a malformed
// value — an out-of-range zone fails the WHOLE projection (spec 031 §2.1).

const FORBIDDEN_FAMILY_CHARS: ReadonlySet<string> = new Set(['"', "'", ";", "\\"]);

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

const isIntegerInRange = (value: unknown, min: number, max: number): boolean =>
  isFiniteNumber(value) && Number.isInteger(value) && value >= min && value <= max;

const isInClosedRange = (value: unknown, min: number, max: number): boolean =>
  isFiniteNumber(value) && value >= min && value <= max;

/** `(0..max]` — zero is not a usable width, size or line height. */
const isInHalfOpenRange = (value: unknown, max: number): boolean =>
  isFiniteNumber(value) && value > 0 && value <= max;

const FRAME_TEXT_KEY_SET: ReadonlySet<string> = new Set(FRAME_TEXT_KEYS);

/** Same classification the spec 018 image projection uses; kept local to avoid a wider change. */
function classifyClockImage(value: unknown): "data-image" | "https-image" | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (/^data:image\//i.test(value)) return "data-image";
  try {
    return new URL(value).protocol === "https:" ? "https-image" : null;
  } catch {
    return null;
  }
}

/**
 * Operator sample text for one key, read once. It is a PLACEHOLDER ONLY (Founder F-3) and is never
 * copied into an input value or a plan. `name2` never has one — the legacy editor cannot author it.
 */
function readPlaceholder(defaults: unknown, key: FrameTextKey): string | undefined {
  if (key === "name2") return undefined;
  if (!isPlainObject(defaults)) return undefined;
  const raw = (defaults as Record<string, unknown>)[key];
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  return raw;
}

/** Read ONE text zone into a validated plain snapshot. Any violation fails the projection. */
function readTextZone(value: unknown, defaults: unknown, seen: Set<string>): FrameTextZone {
  if (!isPlainObject(value)) fail("INVALID_ITEM");
  const zone = value as Record<string, unknown>;

  const key = zone.key;
  if (typeof key !== "string" || !FRAME_TEXT_KEY_SET.has(key)) fail("INVALID_GEOMETRY");
  if (seen.has(key as string)) fail("INVALID_GEOMETRY"); // duplicate key is fatal, not a warning
  seen.add(key as string);

  // percent position: 0..100 inclusive (the legacy authoring sliders are bounded the same way)
  const x = zone.x;
  const y = zone.y;
  if (!isInClosedRange(x, 0, 100) || !isInClosedRange(y, 0, 100)) fail("INVALID_GEOMETRY");

  const boxW = zone.boxW;
  const fontSize = zone.fontSize;
  if (!isInHalfOpenRange(boxW, 100) || !isInHalfOpenRange(fontSize, 100)) fail("INVALID_GEOMETRY");

  const align = zone.align;
  if (align !== "left" && align !== "center" && align !== "right") fail("INVALID_GEOMETRY");

  const font = zone.font;
  if (typeof font !== "string" || !isUsableFontFamily(font)) fail("INVALID_GEOMETRY");

  const bold = zone.bold;
  const italic = zone.italic;
  if (typeof bold !== "boolean" || typeof italic !== "boolean") fail("INVALID_GEOMETRY");

  const color = zone.color;
  if (typeof color !== "string" || !HEX6.test(color)) fail("INVALID_GEOMETRY");

  const lineH = zone.lineH;
  if (!isInHalfOpenRange(lineH, 3)) fail("INVALID_GEOMETRY");

  const letterSpacing = zone.letterSpacing;
  if (!isInClosedRange(letterSpacing, -100, 100)) fail("INVALID_GEOMETRY");

  const rotation = zone.rotation;
  if (!isInClosedRange(rotation, -360, 360)) fail("INVALID_GEOMETRY");

  // caps: absent means the approved default; present means it must be a valid integer
  const rawMaxChars = zone.maxChars;
  const maxChars =
    rawMaxChars === undefined ? FRAME_TEXT_DEFAULT_MAX_CHARS : (rawMaxChars as number);
  if (rawMaxChars !== undefined && !isIntegerInRange(rawMaxChars, 1, 200)) fail("INVALID_GEOMETRY");

  const rawMaxLines = zone.maxLines;
  const maxLines =
    rawMaxLines === undefined ? FRAME_TEXT_DEFAULT_MAX_LINES : (rawMaxLines as number);
  if (rawMaxLines !== undefined && !isIntegerInRange(rawMaxLines, 1, 5)) fail("INVALID_GEOMETRY");

  const placeholder = readPlaceholder(defaults, key as FrameTextKey);
  return {
    key: key as FrameTextKey,
    xPercent: x as number,
    yPercent: y as number,
    boxWidthPercent: boxW as number,
    fontSizePercent: fontSize as number,
    align: align as FrameTextAlign,
    fontFamily: font as string,
    bold: bold as boolean,
    italic: italic as boolean,
    color: (color as string).toUpperCase(),
    lineHeight: lineH as number,
    letterSpacingPercent: letterSpacing as number,
    rotationDegrees: rotation as number,
    maxChars,
    maxLines,
    ...(placeholder === undefined ? {} : { placeholder }),
  };
}

/** Zones in source order. An absent/empty list is valid — the template simply has no text. */
function readTextZones(template: Record<string, unknown>): readonly FrameTextZone[] {
  const raw = template.textZones;
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) fail("INVALID_GEOMETRY");
  const defaults = template.defaultTexts;
  const seen = new Set<string>();
  const zones: FrameTextZone[] = [];
  for (const item of raw as readonly unknown[]) zones.push(readTextZone(item, defaults, seen));
  return zones;
}

/**
 * Whether this template carries a physical clock (legacy `isClockTemplate`,
 * denn-mockup-tool.html:971-975): ONLY an explicit opt-out means "no clock". A template with no
 * `clock` field at all is a clock frame, which is why the legacy default reads as "has clock".
 */
function templateHasClock(template: Record<string, unknown>): boolean {
  if (template.clockEnabled === false) return false;
  const clock = template.clock;
  if (clock === false) return false;
  // a builder-made template that explicitly stored a null clock opted out
  if (template.builtBy === "builder" && Object.hasOwn(template, "clock") && clock == null) {
    return false;
  }
  return true;
}

/** One clock override level, read once. `undefined` fields simply do not override. */
function readClockLevel(
  value: unknown,
): Partial<Record<"x" | "y" | "size" | "customImg", unknown>> {
  if (!isPlainObject(value)) return {};
  const level = value as Record<string, unknown>;
  return { x: level.x, y: level.y, size: level.size, customImg: level.customImg };
}

/**
 * The physical clock's placement, merged over three levels exactly as the legacy preview does
 * (denn-mockup-tool.html:1775-1777): global `clockSettings`, then the frame size, then the template.
 * A level only overrides a field it actually defines.
 *
 * The clock is NOT artwork (Founder F-4): this never reaches the plan, print or export.
 */
function readClockPreview(
  data: Record<string, unknown>,
  size: Record<string, unknown>,
  template: Record<string, unknown>,
): FrameClockPreview | null {
  if (!templateHasClock(template)) return null;

  const levels = [
    readClockLevel(data.clockSettings),
    readClockLevel(size.clock),
    readClockLevel(template.clock),
  ];
  // legacy defaults (mockup:1775): bottom-right at 88/88, 12% of the shorter side
  let xPercent = 88;
  let yPercent = 88;
  let sizePercent = 12;
  let customImage: FrameClockPreview["customImage"] = null;

  for (const level of levels) {
    if (level.x !== undefined && level.x !== null) {
      if (!isInClosedRange(level.x, 0, 100)) fail("INVALID_GEOMETRY");
      xPercent = level.x as number;
    }
    if (level.y !== undefined && level.y !== null) {
      if (!isInClosedRange(level.y, 0, 100)) fail("INVALID_GEOMETRY");
      yPercent = level.y as number;
    }
    if (level.size !== undefined && level.size !== null) {
      if (!isInHalfOpenRange(level.size, 100)) fail("INVALID_GEOMETRY");
      sizePercent = level.size as number;
    }
    if (level.customImg !== undefined && level.customImg !== null) {
      const sourceKind = classifyClockImage(level.customImg);
      // an unusable source is not a projection failure: the overlay simply falls back to the
      // `HH:MM` placeholder. The clock must never poison the photo/text plan (spec 031 §3).
      customImage =
        sourceKind === null ? customImage : { sourceKind, value: level.customImg as string };
    }
  }

  return { xPercent, yPercent, sizePercent, customImage };
}

// --- spec 032: frame print physical size --------------------------------------

/** The largest physical dimension a print size may declare, mirroring the catalog read guard. */
const MAX_PRINT_CM = 500;

const isPrintCm = (value: unknown): value is number =>
  isFiniteNumber(value) && value > 0 && value <= MAX_PRINT_CM;

/**
 * Project the operator-authored physical print size for one frame size (spec 032).
 *
 * Returns `{widthCm, heightCm}` when BOTH fields are present and usable, and `null` when the size
 * declares neither — an existing catalog with no centimetres is valid, it simply cannot be printed
 * yet. A half-declared or out-of-range pair fails, because completing it would mean guessing.
 *
 * Never throws, never returns a raw item, an id, a name or any other catalog value, and never
 * consults `name`, `sub`, `label`, `key`, `aspect` or the logical `w`/`h`.
 */
function projectPrintPhysicalSize(
  document: unknown,
  frameSizeId: unknown,
): FramePrintPhysicalSize | null {
  const data = readData(document);
  if (!isNonBlankString(frameSizeId)) fail("INVALID_INPUT");

  const size = lookupById(data, "frameSizes", frameSizeId as string).item;
  // each field is read EXACTLY once, so a drifting getter cannot change what was validated
  const width = size.printWidthCm;
  const height = size.printHeightCm;
  if (width === undefined && height === undefined) return null;
  if (!isPrintCm(width) || !isPrintCm(height)) fail("INVALID_GEOMETRY");
  return { widthCm: width as number, heightCm: height as number };
}

/**
 * Project a frame size's physical print dimensions, or `null` when it declares none.
 *
 * Never throws. The result carries only two numbers — no id, name, raw item or diagnostic value.
 */
export function projectFramePrintPhysicalSize(
  document: CatalogDocumentV1,
  frameSizeId: string,
): PreviewProjectionResult<FramePrintPhysicalSize | null> {
  return run(() => projectPrintPhysicalSize(document, frameSizeId));
}
