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

import { isPlainObject } from "../json";
import type { CatalogDocumentV1 } from "../types";
import type {
  CasePreviewGeometry,
  CasePreviewSelection,
  CasePreviewZone,
  FramePreviewGeometry,
  FramePreviewSelection,
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
  const matColor = resolveMatColor(template, diagnostics, found.index);

  // Deliberately omitted from the output (spec 023 §5, §6): the legacy inner border is 4 filled
  // bands (not a stroke) and the mat outline is an alpha colour.
  if (INNER_BORDER_KEYS.some((key) => template[key] !== undefined)) {
    diagnostics.add("INNER_BORDER_OMITTED", "frameTemplates", found.index);
  }
  diagnostics.add("ALPHA_OUTLINE_OMITTED", "frameTemplates", found.index);

  return { aspect: aspect as number, borderPercentOfWidth, matColor };
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
