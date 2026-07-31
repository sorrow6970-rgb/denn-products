// Customer preview composer (spec 027). This is the FIRST place the customer screen connects
// spec 023 geometry projection → spec 025 plan adapter → spec 026 local image binding →
// spec 022 Canvas surface.
//
// Boundaries kept here:
//  - the raw `CatalogDocumentV1` is used ONLY as the projection input; it is never handed to the
//    Canvas component,
//  - no colour is auto-selected and no default width is invented,
//  - no Canvas exists until an explicit colour AND every required local image are ready,
//  - failure codes, source indexes, ids, file names, blob urls and exceptions never reach the DOM:
//    the customer sees fixed copy only.

import { resolvePublicImageSource } from "@denn/firebase";
import { clientPointToLogical, type Point, type PreviewRenderPlan } from "@denn/render";
import {
  type CasePreviewGeometry,
  type CatalogDocumentV1,
  type FramePreviewGeometry,
  projectCasePreviewGeometry,
  projectCatalogTemplateArtPlacement,
  projectCatalogTemplateImage,
  projectFramePreviewGeometry,
} from "@denn/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createCompositeImageBindings, withImageRefPrefix } from "../canvas/compositeImageBindings";
import type { LocalImageBindingState } from "../canvas/localImageBinding";
import { PreviewCanvasSurface } from "../canvas/PreviewCanvasSurface";
import { buildCaseProductPlan, buildFrameProductPlan } from "../canvas/productPlan";
import type { UserImageState } from "../canvas/productPlan";
import type { TemplateArtSource } from "../canvas/templateArtBinding";
import type { PreviewImageBindings } from "../canvas/types";
import { useLocalImageBinding } from "../canvas/useLocalImageBinding";
import { useTemplateArtBinding } from "../canvas/useTemplateArtBinding";
import {
  createDragController,
  type DragController,
  IDENTITY_TRANSFORM,
  maxPanFromRects,
  type NormalizedTransform,
  panTransform,
  PAN_KEY_STEP,
  PAN_KEY_STEP_COARSE,
  resetTransform,
  rotateTransform,
  SCALE_PERCENT_MAX,
  SCALE_PERCENT_MIN,
  scaleFromPercent,
  scaleToPercent,
  toLogicalTransform,
  withScale,
  zoomTransform,
} from "./imageTransform";
import { createClockTicker, resolveClockOverlay } from "./clockOverlay";
import {
  CASE_BODY_COLORS,
  PREVIEW_CANVAS_NAME,
  PREVIEW_EDIT_LABELS,
  PREVIEW_MESSAGES,
  PREVIEW_TEXT_COPY,
  PREVIEW_TEXT_LABELS,
  type PreviewColorOption,
  readFrameColorOptions,
  resolveFrameLogicalWidth,
  textLengthHint,
  textTooLongMessage,
  zoneSlotLabel,
} from "./previewContracts";

const FRAME_SLOT_ID = "frame-image";
/** Namespace for the template art owner's key, kept apart from every photo owner (spec 028). */
const ART_PREFIX = "template-art.";

/**
 * Namespace for one slot's image refs. Two owners each hand out `user-image-1`, so the plan and the
 * binding lookup must both address an image as `<slotId>.<ownerRef>`; the result still satisfies the
 * spec 020 identifier grammar (alphanumeric start, then alphanumerics and `. _ -`).
 */
const slotRefPrefix = (slotId: string): string => `${slotId}.`;

/**
 * The five customer-editable text keys (spec 031). Declared here rather than imported so this spec
 * does not have to widen the shared package's public barrel; the projection validates the same set.
 */
const FRAME_TEXT_KEYS = ["main", "name", "name2", "date", "sub"] as const;
type FrameTextKey = (typeof FRAME_TEXT_KEYS)[number];

/** The plan's structured font spec, taken structurally from the builder's own port type. */
type PlanFontSpec = Parameters<
  NonNullable<Parameters<typeof buildFrameProductPlan>[0]["measureText"]>
>[0]["font"];

/** A literal newline, kept as a constant so no escape survives a refactor. */
const NEWLINE = String.fromCharCode(10);

/** Empty value for every one of the five customer text keys (spec 031). */
const EMPTY_TEXTS: Readonly<Record<FrameTextKey, string>> = {
  main: "",
  name: "",
  name2: "",
  date: "",
  sub: "",
};

/**
 * Synchronous text measurement for the plan builder (spec 031 §2.3).
 *
 * The composer owns an offscreen 2D context ONLY for measuring — nothing is ever drawn on it and it
 * never reaches the executor. The port is injected into the builder and is never stored in a plan,
 * so the plan stays pure and JSON-safe while the wrap is still decided exactly once.
 */
function createMeasurePort(): ((request: { text: string; font: PlanFontSpec }) => number) | null {
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = window.document.createElement("canvas").getContext("2d");
  } catch {
    return null;
  }
  if (context === null) return null;
  const measuring = context;
  return ({ text, font }) => {
    measuring.font = fontShorthand(font);
    return measuring.measureText(text).width;
  };
}

/** The exact same shorthand the executor assembles, so measuring and drawing cannot disagree. */
function fontShorthand(font: PlanFontSpec): string {
  const style = font.italic ? "italic " : "";
  const weight = font.weight === "bold" ? "bold " : "";
  return `${style}${weight}${font.sizePx}px "${font.family}", ${font.fallback}`;
}

/** The logical-px transform shape the spec 025 adapter validates. */
type LogicalTransformInput = UserImageState["transform"];

interface SlotEntry {
  readonly state: LocalImageBindingState;
  readonly bindings: PreviewImageBindings;
}

type ProjectedGeometry =
  | { readonly kind: "case"; readonly value: CasePreviewGeometry }
  | { readonly kind: "frame"; readonly value: FramePreviewGeometry };

export interface PreviewComposerProps {
  readonly productKind: "case" | "frame";
  readonly document: CatalogDocumentV1;
  readonly modelId: string | null;
  readonly frameSizeId: string | null;
  readonly templateId: string;
}

const SLOT_STATE_LABEL: Record<LocalImageBindingState["status"], string> = {
  idle: "선택 안 됨",
  loading: "준비 중",
  ready: "선택됨",
  failed: "실패",
};

/**
 * One local image owner (spec 026) with its own accessible file input. Every zone gets its own —
 * a photo is never shared between zones, and clearing or replacing one never touches another.
 */
function ImageSlot({
  slotId,
  label,
  onReport,
}: {
  slotId: string;
  label: string;
  onReport: (slotId: string, entry: SlotEntry | null) => void;
}): React.JSX.Element {
  const picked = useLocalImageBinding();
  const { state, bindings } = picked;

  useEffect(() => {
    onReport(slotId, { state, bindings });
  }, [slotId, state, bindings, onReport]);
  // withdrawal happens on UNMOUNT only, so a state change never blanks the plan for a frame
  useEffect(() => () => onReport(slotId, null), [slotId, onReport]);

  const inputId = `denn-preview-file-${slotId}`;
  return (
    <div className="denn-composer__slot">
      <label className="denn-composer__slot-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        data-testid={`preview-file-${slotId}`}
        className="denn-composer__slot-input"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          // emptied by THIS owner so the same file can be picked again (spec 026 §5)
          event.target.value = "";
          if (chosen) picked.load(chosen);
        }}
      />
      <span className="denn-composer__slot-state" data-testid={`preview-slot-${slotId}`}>
        {SLOT_STATE_LABEL[state.status]}
      </span>
      {state.status === "ready" ? (
        <button
          type="button"
          className="denn-composer__clear"
          data-testid={`preview-clear-${slotId}`}
          onClick={() => picked.clear()}
        >
          사진 지우기
        </button>
      ) : null}
    </div>
  );
}

export function PreviewComposer({
  productKind,
  document: catalog,
  modelId,
  frameSizeId,
  templateId,
}: PreviewComposerProps): React.JSX.Element {
  const colorOptions = useMemo<readonly PreviewColorOption[]>(
    () => (productKind === "case" ? CASE_BODY_COLORS : readFrameColorOptions(catalog)),
    [productKind, catalog],
  );
  const [color, setColor] = useState<string | null>(null);

  // the raw document is read HERE and nowhere below: only neutral geometry travels on
  const geometry = useMemo<ProjectedGeometry | null>(() => {
    if (productKind === "case") {
      if (modelId === null) return null;
      const projected = projectCasePreviewGeometry(catalog, { modelId, templateId });
      return projected.ok ? { kind: "case", value: projected.value } : null;
    }
    if (frameSizeId === null) return null;
    const projected = projectFramePreviewGeometry(catalog, { frameSizeId, templateId });
    return projected.ok ? { kind: "frame", value: projected.value } : null;
  }, [productKind, catalog, modelId, frameSizeId, templateId]);

  const slotIds = useMemo<readonly string[]>(() => {
    if (geometry === null) return [];
    if (geometry.kind === "case") return geometry.value.zones.map((zone) => zone.id);
    return [FRAME_SLOT_ID];
  }, [geometry]);

  // --- template art (spec 028) ---------------------------------------------
  // placement decides IF and WHERE the art belongs; projection + trust boundary decide whether the
  // source may be handed to the browser at all. The source string never leaves this memo.
  const artRequest = useMemo<
    | { readonly required: false }
    | { readonly required: true; readonly source: TemplateArtSource }
    | { readonly required: true; readonly source: null }
  >(() => {
    const placement = projectCatalogTemplateArtPlacement(catalog, {
      templateKind: productKind,
      templateId,
    });
    if (placement.status === "none") return { required: false };
    // unsupported (legacy builder crop / unusable template): required but unavailable → fail-closed
    if (placement.status === "unsupported") return { required: true, source: null };
    const projected = projectCatalogTemplateImage(catalog, {
      templateKind: productKind,
      templateId,
    });
    if (projected.status !== "available") return { required: true, source: null };
    const resolved = resolvePublicImageSource({
      kind: projected.sourceKind,
      value: projected.value,
    });
    if (!resolved.ok) return { required: true, source: null };
    return { required: true, source: { kind: resolved.kind, src: resolved.src } };
  }, [catalog, productKind, templateId]);

  const art = useTemplateArtBinding();
  const artLoad = art.load;
  const artSource = artRequest.required ? artRequest.source : null;
  useEffect(() => {
    if (artSource === null) return;
    artLoad(artSource);
  }, [artSource, artLoad]);

  const artState = art.state;
  const artReady = artRequest.required && artState.status === "ready" ? artState.imageRef : null;
  const artBlocked = artRequest.required && (artSource === null || artState.status !== "ready");

  const [entries, setEntries] = useState<Record<string, SlotEntry>>({});
  const report = useCallback((slotId: string, entry: SlotEntry | null): void => {
    setEntries((previous) => {
      if (entry === null) {
        if (!(slotId in previous)) return previous;
        const next = { ...previous };
        delete next[slotId];
        return next;
      }
      const current = previous[slotId];
      if (current && current.state === entry.state && current.bindings === entry.bindings) {
        return previous;
      }
      return { ...previous, [slotId]: entry };
    });
  }, []);

  // --- customer text values (spec 031) -------------------------------------
  // The composer owns five PLAIN STRINGS. The operator owns the zone style and the placeholder;
  // the two never mix, and the operator's default text is never copied into a value (Founder F-3).
  const [texts, setTexts] = useState<Readonly<Record<FrameTextKey, string>>>(EMPTY_TEXTS);
  const [textError, setTextError] = useState<FrameTextKey | null>(null);

  const textZones = useMemo(
    () => (geometry?.kind === "frame" ? geometry.value.textZones : []),
    [geometry],
  );

  // a shape change clears every value; photo, colour and pan/zoom/rotation changes do not
  // biome-ignore lint/correctness/useExhaustiveDependencies: these props ARE the reset signal
  useEffect(() => {
    setTexts(EMPTY_TEXTS);
    setTextError(null);
  }, [productKind, modelId, frameSizeId, templateId]);

  // Fonts must be settled BEFORE measuring: measuring with a fallback and then painting with the
  // real family would wrap differently, which is exactly the legacy preview/print divergence.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fonts = (window.document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts === undefined) {
      setFontsReady(true);
      return;
    }
    fonts.ready
      .then(() => {
        if (!cancelled) setFontsReady(true);
      })
      .catch(() => {
        if (!cancelled) setFontsReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const measurePortRef = useRef<((request: { text: string; font: PlanFontSpec }) => number) | null>(
    null,
  );
  const measureText = useCallback((request: { text: string; font: PlanFontSpec }): number => {
    if (measurePortRef.current === null) measurePortRef.current = createMeasurePort();
    const port = measurePortRef.current;
    // a missing port is a measurement failure, which fails the plan closed rather than guessing
    if (port === null) return Number.NaN;
    return port(request);
  }, []);

  const textValues = useMemo<ReadonlyMap<string, string>>(() => {
    const map = new Map<string, string>();
    for (const key of FRAME_TEXT_KEYS) {
      const value = texts[key];
      if (value !== "") map.set(key, value);
    }
    return map;
  }, [texts]);

  /** The last frame arguments a plan was built from, so an edit can be trial-built against them. */
  const frameTrialRef = useRef<{
    geometry: FramePreviewGeometry;
    frameColor: string;
    logicalWidth: number;
    userImage: UserImageState;
    templateArt: { readonly imageRef: string } | undefined;
  } | null>(null);

  /**
   * Accept an edit only if it fits (Founder F-6/F-7). Over-long, over-tall or unwrappable input is
   * REJECTED and the previously approved value stays — nothing is truncated, ellipsised or silently
   * repaired, and the preview never drops to a partial render because of a keystroke.
   */
  const commitText = useCallback(
    (key: FrameTextKey, next: string): void => {
      const zone = textZones.find((candidate) => candidate.key === key);
      if (zone === undefined) return;
      if (next.length > zone.maxChars) {
        setTextError(key);
        return;
      }
      // explicit newlines alone can already exceed the line budget
      if (next.split(NEWLINE).length > zone.maxLines) {
        setTextError(key);
        return;
      }
      // The wrap decides the rest, and only the BUILDER knows it. Trial-build with the same
      // arguments instead of re-implementing the wrap here, so the two can never disagree.
      const trial = frameTrialRef.current;
      if (trial !== null && next !== "") {
        const candidate = new Map(textValues);
        candidate.set(key, next);
        const result = buildFrameProductPlan({
          geometry: trial.geometry,
          frameColor: trial.frameColor,
          logicalWidth: trial.logicalWidth,
          userImage: trial.userImage,
          templateArt: trial.templateArt,
          textValues: candidate,
          measureText,
        });
        if (!result.ok) {
          setTextError(key);
          return;
        }
      }
      setTextError((current) => (current === key ? null : current));
      setTexts((previous) => (previous[key] === next ? previous : { ...previous, [key]: next }));
    },
    [textZones, textValues, measureText],
  );

  // --- pan/zoom editing state (spec 029) -----------------------------------
  // The composer owns one NORMALIZED transform per slot; the spec 026 owner keeps publishing its
  // fixed literal transform and is not touched. A slot with no entry is at the identity.
  const [transforms, setTransforms] = useState<Record<string, NormalizedTransform>>({});
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  const activeSlot = useMemo<string | null>(() => {
    if (slotIds.length === 0) return null;
    if (activeSlotId !== null && slotIds.includes(activeSlotId)) return activeSlotId;
    return slotIds[0] ?? null;
  }, [activeSlotId, slotIds]);

  const transformOf = useCallback(
    (slotId: string): NormalizedTransform => transforms[slotId] ?? IDENTITY_TRANSFORM,
    [transforms],
  );

  // D-9: a shape change resets every slot. A colour change is NOT in this dependency list, and
  // switching the active slot keeps both slots' framing.
  // biome-ignore lint/correctness/useExhaustiveDependencies: these props ARE the reset signal — the body deliberately reads none of them
  useEffect(() => {
    setTransforms((previous) => (Object.keys(previous).length === 0 ? previous : {}));
    setActiveSlotId(null);
  }, [productKind, modelId, frameSizeId, templateId]);

  // D-9: replacing, clearing or failing ONE photo resets only that slot. The owner hands out a new
  // synthetic ref for a new decode, so a changed (or vanished) ref is the replacement signal.
  const readyRefs = useRef<Record<string, string>>({});
  useEffect(() => {
    const nextRefs: Record<string, string> = {};
    const stale: string[] = [];
    for (const slotId of slotIds) {
      const entry = entries[slotId];
      const ref = entry?.state.status === "ready" ? entry.state.imageState.imageRef : null;
      if (ref !== null) nextRefs[slotId] = ref;
      const previous = readyRefs.current[slotId];
      if (previous !== undefined && previous !== ref) stale.push(slotId);
    }
    readyRefs.current = nextRefs;
    if (stale.length === 0) return;
    setTransforms((previous) => {
      let next: Record<string, NormalizedTransform> | null = null;
      for (const slotId of stale) {
        if (!(slotId in previous)) continue;
        next = next ?? { ...previous };
        delete next[slotId];
      }
      return next ?? previous;
    });
  }, [slotIds, entries]);

  // frame only: the logical width follows the measured content box (spec 027 §UX 5, 6)
  const [contentWidth, setContentWidth] = useState<number | null>(null);
  const measureRef = useCallback((element: HTMLDivElement | null) => {
    if (element === null) return;
    const publish = (width: number): void => {
      setContentWidth((previous) => (previous === width ? previous : width));
    };
    const observer = new ResizeObserver((observed) => {
      const entry = observed[observed.length - 1];
      const box = entry?.contentBoxSize?.[0];
      if (box) publish(box.inlineSize);
      else if (entry) publish(entry.contentRect.width);
    });
    observer.observe(element);
    publish(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const artBindings = art.bindings;
  const imageBindings = useMemo<PreviewImageBindings>(() => {
    const sources: PreviewImageBindings[] = [];
    for (const slotId of slotIds) {
      const entry = entries[slotId];
      if (entry) sources.push(withImageRefPrefix(slotRefPrefix(slotId), entry.bindings));
    }
    sources.push(withImageRefPrefix(ART_PREFIX, artBindings));
    return createCompositeImageBindings(sources);
  }, [slotIds, entries, artBindings]);

  /**
   * Build the plan twice on purpose (spec 029 §2 환산):
   *
   *  1. a PROBE plan at the current scale with pan 0 — its `draw-image-cover` commands give the
   *     drawn size vs the clip size, i.e. the axis `maxPan`, WITHOUT duplicating the zone/mat rect
   *     formulas that live in the adapter (a second copy would silently drift from it),
   *  2. the real plan with `logical pan = normalized * maxPan`.
   *
   * `maxPan` depends only on the scale, so the probe is exact for the pan being applied. A failure in
   * either pass yields NO plan: no partial plan and no previous slot transform is reused.
   */
  const built = useMemo<{
    readonly plan: PreviewRenderPlan;
    readonly maxPan: ReadonlyMap<string, Point>;
  } | null>(() => {
    if (geometry === null || color === null) return null;
    // fail-closed (spec 028 §5): a template whose real art cannot be drawn shows NO canvas
    if (artBlocked) return null;
    const templateArt = artReady === null ? undefined : { imageRef: `${ART_PREFIX}${artReady}` };
    const slots: {
      readonly slotId: string;
      readonly imageRef: string;
      readonly state: UserImageState;
      readonly normalized: NormalizedTransform;
    }[] = [];
    for (const slotId of slotIds) {
      const entry = entries[slotId];
      if (entry?.state.status !== "ready") return null;
      const owned = entry.state.imageState;
      // each owner numbers its images independently, so the plan addresses them per slot
      const imageRef = `${slotRefPrefix(slotId)}${owned.imageRef}`;
      slots.push({
        slotId,
        imageRef,
        state: { ...owned, imageRef },
        normalized: transforms[slotId] ?? IDENTITY_TRANSFORM,
      });
    }

    const logicalWidth =
      geometry.kind === "frame" && contentWidth !== null
        ? resolveFrameLogicalWidth(contentWidth)
        : null;
    if (geometry.kind === "frame" && logicalWidth === null) return null;

    const buildWith = (
      pan: (slotId: string, normalized: NormalizedTransform) => LogicalTransformInput | null,
    ): PreviewRenderPlan | null => {
      const ready = new Map<string, UserImageState>();
      for (const slot of slots) {
        const transform = pan(slot.slotId, slot.normalized);
        if (transform === null) return null;
        ready.set(slot.slotId, { ...slot.state, transform });
      }
      if (geometry.kind === "case") {
        const result = buildCaseProductPlan({
          geometry: geometry.value,
          bodyColor: color,
          zoneImages: ready,
          templateArt,
        });
        return result.ok ? result.plan : null;
      }
      const userImage = ready.get(FRAME_SLOT_ID);
      if (userImage === undefined || logicalWidth === null) return null;
      // spec 031 §2.2: keep the EXACT arguments so a candidate edit can be trial-built against the
      // real builder — the composer must not re-implement the wrap and risk disagreeing with it.
      frameTrialRef.current = {
        geometry: geometry.value,
        frameColor: color,
        logicalWidth,
        userImage,
        templateArt,
      };
      const result = buildFrameProductPlan({
        geometry: geometry.value,
        frameColor: color,
        logicalWidth,
        userImage,
        templateArt,
        // spec 031: only the customer's words travel here; the zone style comes from the geometry
        textValues,
        measureText,
      });
      return result.ok ? result.plan : null;
    };

    // C-7: the probe MUST carry the rotation — a quarter turn swaps the cover footprint, so a probe
    // without it would hand back the unrotated `maxPan` and the pan would be clamped to the wrong
    // limit. Only the pan is zeroed here.
    // spec 031 §2.3: with text to draw, a plan may not be built before the fonts are settled —
    // a silent system fallback would wrap differently from what the customer finally sees.
    if (!fontsReady && textValues.size > 0) return null;

    const probe = buildWith((_slotId, normalized) => ({
      scale: normalized.scale,
      x: 0,
      y: 0,
      rotationQuarterTurns: normalized.rotationQuarterTurns,
    }));
    if (probe === null) return null;

    const maxPanByRef = new Map<string, Point>();
    for (const command of probe.commands) {
      if (command.type !== "draw-image-cover") continue;
      const limit = maxPanFromRects(command.clipRect, command.drawRect);
      if (limit === null) return null;
      maxPanByRef.set(command.imageRef, limit);
    }
    const maxPan = new Map<string, Point>();
    for (const slot of slots) {
      const limit = maxPanByRef.get(slot.imageRef);
      if (limit === undefined) return null;
      maxPan.set(slot.slotId, limit);
    }

    const plan = buildWith((slotId, normalized) => {
      const limit = maxPan.get(slotId);
      if (limit === undefined) return null;
      return toLogicalTransform(normalized, limit);
    });
    if (plan === null) return null;
    return { plan, maxPan };
  }, [
    geometry,
    color,
    slotIds,
    entries,
    contentWidth,
    artBlocked,
    artReady,
    transforms,
    textValues,
    measureText,
    fontsReady,
  ]);

  const plan = built?.plan ?? null;

  // --- editing controls + pointer drag (spec 029) ---------------------------
  // A slot is editable only while its own photo is ready; the controls never act on another slot.
  const activeEditable =
    activeSlot !== null && entries[activeSlot]?.state.status === "ready" ? activeSlot : null;
  const activeTransform = activeSlot === null ? IDENTITY_TRANSFORM : transformOf(activeSlot);

  const applyToActive = useCallback(
    (next: (current: NormalizedTransform) => NormalizedTransform): void => {
      const slotId = activeEditable;
      if (slotId === null) return;
      setTransforms((previous) => {
        const current = previous[slotId] ?? IDENTITY_TRANSFORM;
        const updated = next(current);
        if (updated === current) return previous;
        return { ...previous, [slotId]: updated };
      });
    },
    [activeEditable],
  );

  // The wheel handler and the drag session read the live values through a ref, so the non-passive
  // listener is attached once per surface instead of on every transform change.
  const editRef = useRef<{ slotId: string | null; transform: NormalizedTransform }>({
    slotId: null,
    transform: IDENTITY_TRANSFORM,
  });
  useEffect(() => {
    editRef.current = { slotId: activeEditable, transform: activeTransform };
  }, [activeEditable, activeTransform]);

  const dragSlotRef = useRef<string | null>(null);
  const controllerRef = useRef<DragController | null>(null);
  const getController = useCallback((): DragController => {
    const existing = controllerRef.current;
    if (existing !== null) return existing;
    const created = createDragController({
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (handle) => window.cancelAnimationFrame(handle),
      commit: (next) => {
        const slotId = dragSlotRef.current;
        if (slotId === null) return;
        setTransforms((previous) =>
          (previous[slotId] ?? IDENTITY_TRANSFORM) === next
            ? previous
            : { ...previous, [slotId]: next },
        );
      },
    });
    controllerRef.current = created;
    return created;
  }, []);

  // StrictMode attach → detach → attach: the controller is disposed AND dropped, so the next mount
  // lazily builds a fresh one. Nothing stays permanently disabled and no listener survives.
  useEffect(
    () => () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
      dragSlotRef.current = null;
    },
    [],
  );

  // a selection change (or a slot switch) ends an in-flight drag instead of letting it land later
  // biome-ignore lint/correctness/useExhaustiveDependencies: these values ARE the end-the-drag signal, not values the body reads
  useEffect(() => {
    controllerRef.current?.abort("selection");
    dragSlotRef.current = null;
  }, [productKind, modelId, frameSizeId, templateId, activeSlot]);

  const areaRef = useRef<HTMLDivElement | null>(null);
  const logicalPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const area = areaRef.current;
      const canvas = area?.querySelector("canvas") ?? null;
      const size = plan?.logicalCanvas ?? null;
      if (canvas === null || size === null) return null;
      const rect = canvas.getBoundingClientRect();
      const mapped = clientPointToLogical({
        client: { x: clientX, y: clientY },
        clientRect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
        logicalSize: size,
      });
      return mapped.ok ? mapped.value : null;
    },
    [plan],
  );

  // Wheel zoom is attached manually because React's `onWheel` is passive at the root: the default is
  // blocked ONLY when the scale actually changes, so a wheel at a bound still scrolls the page.
  const hasSurface = plan !== null;
  useEffect(() => {
    const area = areaRef.current;
    if (!hasSurface || area === null) return;
    const onWheel = (event: WheelEvent): void => {
      const { slotId, transform } = editRef.current;
      if (slotId === null || event.deltaY === 0) return;
      const next = zoomTransform(transform, event.deltaY < 0 ? "in" : "out");
      if (next === transform) return;
      event.preventDefault();
      setTransforms((previous) => ({ ...previous, [slotId]: next }));
    };
    area.addEventListener("wheel", onWheel, { passive: false });
    return () => area.removeEventListener("wheel", onWheel);
  }, [hasSurface]);

  const onPanKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLFieldSetElement>): void => {
      const step = event.shiftKey ? PAN_KEY_STEP_COARSE : PAN_KEY_STEP;
      let dx = 0;
      let dy = 0;
      if (event.key === "ArrowLeft") dx = -step;
      else if (event.key === "ArrowRight") dx = step;
      else if (event.key === "ArrowUp") dy = -step;
      else if (event.key === "ArrowDown") dy = step;
      else return;
      event.preventDefault();
      applyToActive((current) => panTransform(current, dx, dy));
    },
    [applyToActive],
  );

  // --- physical clock overlay (spec 031 §2.7) -------------------------------
  // The clock is HARDWARE on the finished product (Founder F-4): it is shown next to the canvas,
  // never inside the plan, so it can never reach print, export or an order.
  const clockPlacement = geometry?.kind === "frame" ? geometry.value.clockPreview : null;
  const clockImageSrc = useMemo<string | null>(() => {
    const custom = clockPlacement?.customImage ?? null;
    if (custom === null) return null;
    const resolved = resolvePublicImageSource({ kind: custom.sourceKind, value: custom.value });
    // an unusable source simply falls back to the HH:MM placeholder — the clock never fails the
    // preview, because it is not print data (spec 031 §3)
    return resolved.ok ? resolved.src : null;
  }, [clockPlacement]);

  const [clockNowMs, setClockNowMs] = useState<number>(() => Date.now());
  const clockOverlay = resolveClockOverlay({
    enabled: clockPlacement !== null,
    placement: clockPlacement,
    imageSrc: clockImageSrc,
    nowMs: clockNowMs,
  });

  // A custom clock image runs ZERO timers; only the text placeholder ticks, and only on the minute
  // boundary. Exactly one timer may be alive, and it is cancelled on every ending.
  const needsClockTick = clockOverlay.view.kind === "text";
  const tickerRef = useRef<ReturnType<typeof createClockTicker> | null>(null);
  useEffect(() => {
    if (tickerRef.current === null) {
      tickerRef.current = createClockTicker(
        {
          now: () => Date.now(),
          setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
          clearTimer: (handle) => window.clearTimeout(handle),
        },
        () => setClockNowMs(Date.now()),
      );
    }
    tickerRef.current.start(needsClockTick);
    return () => {
      tickerRef.current?.stop();
    };
  }, [needsClockTick]);
  // StrictMode attach → detach → attach: dispose AND drop, so the next mount builds a fresh ticker
  // and no timer from the previous mount can survive.
  useEffect(
    () => () => {
      tickerRef.current?.dispose();
      tickerRef.current = null;
    },
    [],
  );

  const status = useMemo<string | null>(() => {
    if (colorOptions.length === 0) return PREVIEW_MESSAGES.noColors;
    if (geometry === null) return PREVIEW_MESSAGES.unavailable;
    // the art message wins over "pick a colour": no colour choice can make this template drawable.
    // A source that can never load (unsupported variant / trust refusal) or a finished failure is
    // reported as a failure; anything still in flight (idle before the effect, loading) is not.
    if (artBlocked) {
      const permanent = artSource === null || artState.status === "failed";
      return permanent ? PREVIEW_MESSAGES.templateArtFailed : PREVIEW_MESSAGES.templateArtLoading;
    }
    if (color === null) return PREVIEW_MESSAGES.pickColor;
    if (slotIds.some((id) => entries[id]?.state.status === "failed")) {
      return PREVIEW_MESSAGES.imageFailed;
    }
    if (slotIds.some((id) => entries[id]?.state.status === "loading")) {
      return PREVIEW_MESSAGES.loadingImage;
    }
    if (!slotIds.every((id) => entries[id]?.state.status === "ready")) {
      return PREVIEW_MESSAGES.pickImage;
    }
    if (geometry.kind === "frame" && contentWidth === null) return PREVIEW_MESSAGES.measuring;
    if (plan === null) return PREVIEW_MESSAGES.unavailable;
    return null;
  }, [
    colorOptions,
    geometry,
    color,
    slotIds,
    entries,
    contentWidth,
    plan,
    artBlocked,
    artSource,
    artState.status,
  ]);

  return (
    <section className="denn-composer" aria-labelledby="denn-composer-title" ref={measureRef}>
      <h3 className="denn-composer__title" id="denn-composer-title">
        미리보기
      </h3>

      <fieldset className="denn-composer__group">
        <legend className="denn-composer__legend">색상</legend>
        {colorOptions.length === 0 ? (
          <p className="denn-browse__notice">{PREVIEW_MESSAGES.noColors}</p>
        ) : (
          <div className="denn-composer__swatches">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="denn-composer__swatch"
                aria-pressed={color === option.value}
                data-testid={`preview-color-${option.value}`}
                onClick={() => setColor(option.value)}
              >
                <span
                  className="denn-composer__swatch-dot"
                  style={{ backgroundColor: option.value }}
                  aria-hidden="true"
                />
                <span className="denn-composer__swatch-name">{option.name}</span>
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {slotIds.length > 0 ? (
        <fieldset className="denn-composer__group">
          <legend className="denn-composer__legend">사진</legend>
          <div className="denn-composer__slots">
            {slotIds.map((slotId, index) => (
              <ImageSlot
                key={slotId}
                slotId={slotId}
                label={geometry?.kind === "case" ? zoneSlotLabel(index) : "사진"}
                onReport={report}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {slotIds.length > 0 ? (
        <fieldset className="denn-composer__group" data-testid="preview-edit">
          <legend className="denn-composer__legend">{PREVIEW_EDIT_LABELS.group}</legend>

          {slotIds.length > 1 ? (
            <fieldset className="denn-preview-edit__subgroup">
              <legend className="denn-composer__slot-label">{PREVIEW_EDIT_LABELS.slotGroup}</legend>
              {slotIds.map((slotId, index) => (
                <button
                  key={slotId}
                  type="button"
                  className="denn-preview-edit__slot"
                  aria-pressed={slotId === activeSlot}
                  data-testid={`preview-edit-slot-${slotId}`}
                  onClick={() => setActiveSlotId(slotId)}
                >
                  <span>{zoneSlotLabel(index)}</span>
                  {slotId === activeSlot ? (
                    <span className="denn-preview-edit__active">
                      {PREVIEW_EDIT_LABELS.activeSlot}
                    </span>
                  ) : null}
                </button>
              ))}
            </fieldset>
          ) : null}

          {activeEditable === null ? (
            <p className="denn-browse__notice">{PREVIEW_EDIT_LABELS.needsImage}</p>
          ) : null}

          <div className="denn-preview-edit__row">
            <label className="denn-composer__slot-label" htmlFor="denn-preview-scale">
              {PREVIEW_EDIT_LABELS.scale}
            </label>
            <input
              id="denn-preview-scale"
              className="denn-preview-edit__range"
              data-testid="preview-scale"
              type="range"
              min={SCALE_PERCENT_MIN}
              max={SCALE_PERCENT_MAX}
              step={1}
              value={scaleToPercent(activeTransform.scale)}
              disabled={activeEditable === null}
              onChange={(event) => {
                const next = scaleFromPercent(Number(event.target.value));
                if (next === null) return;
                applyToActive((current) => withScale(current, next));
              }}
            />
            <span className="denn-composer__slot-state" data-testid="preview-scale-value">
              {scaleToPercent(activeTransform.scale)}%
            </span>
          </div>

          <div className="denn-preview-edit__row">
            <button
              type="button"
              className="denn-composer__clear"
              data-testid="preview-zoom-out"
              disabled={activeEditable === null}
              onClick={() => applyToActive((current) => zoomTransform(current, "out"))}
            >
              {PREVIEW_EDIT_LABELS.zoomOut}
            </button>
            <button
              type="button"
              className="denn-composer__clear"
              data-testid="preview-zoom-in"
              disabled={activeEditable === null}
              onClick={() => applyToActive((current) => zoomTransform(current, "in"))}
            >
              {PREVIEW_EDIT_LABELS.zoomIn}
            </button>
            <button
              type="button"
              className="denn-composer__clear"
              data-testid="preview-reset"
              disabled={activeEditable === null}
              onClick={() => applyToActive(() => resetTransform())}
            >
              {PREVIEW_EDIT_LABELS.reset}
            </button>
          </div>

          {/* spec 030: quarter turns only. Each press is exactly one step (modulo 4); scale and
              normalized pan are untouched, so the framing survives the rotation. */}
          <fieldset className="denn-preview-edit__subgroup">
            <legend className="denn-composer__slot-label">{PREVIEW_EDIT_LABELS.rotateGroup}</legend>
            {(
              [
                ["preview-rotate-left", PREVIEW_EDIT_LABELS.rotateLeft, "left"],
                ["preview-rotate-right", PREVIEW_EDIT_LABELS.rotateRight, "right"],
              ] as const
            ).map(([testId, label, direction]) => (
              <button
                key={testId}
                type="button"
                className="denn-composer__clear"
                data-testid={testId}
                disabled={activeEditable === null}
                onClick={() => applyToActive((current) => rotateTransform(current, direction))}
              >
                {label}
              </button>
            ))}
          </fieldset>

          {/* Real buttons host the keyboard pan: arrows (Shift = coarse) work whenever focus is
              inside this group, and each button alone is enough for keyboard-only use. */}
          <fieldset className="denn-preview-edit__subgroup" onKeyDown={onPanKeyDown}>
            <legend className="denn-composer__slot-label">{PREVIEW_EDIT_LABELS.panGroup}</legend>
            {(
              [
                ["preview-pan-left", PREVIEW_EDIT_LABELS.panLeft, -1, 0],
                ["preview-pan-right", PREVIEW_EDIT_LABELS.panRight, 1, 0],
                ["preview-pan-up", PREVIEW_EDIT_LABELS.panUp, 0, -1],
                ["preview-pan-down", PREVIEW_EDIT_LABELS.panDown, 0, 1],
              ] as const
            ).map(([testId, label, dirX, dirY]) => (
              <button
                key={testId}
                type="button"
                className="denn-composer__clear"
                data-testid={testId}
                disabled={activeEditable === null}
                onClick={(event) => {
                  const step = event.shiftKey ? PAN_KEY_STEP_COARSE : PAN_KEY_STEP;
                  applyToActive((current) => panTransform(current, dirX * step, dirY * step));
                }}
              >
                {label}
              </button>
            ))}
          </fieldset>
        </fieldset>
      ) : null}

      {geometry?.kind === "frame" ? (
        <fieldset className="denn-composer__group" data-testid="preview-text">
          <legend className="denn-composer__legend">{PREVIEW_TEXT_COPY.group}</legend>
          {textZones.length === 0 ? (
            <p className="denn-browse__notice">{PREVIEW_TEXT_COPY.none}</p>
          ) : (
            // only the keys THIS template defines are offered; the rest are not rendered at all
            textZones.map((zone) => {
              const inputId = `denn-preview-text-${zone.key}`;
              const hintId = `${inputId}-hint`;
              const value = texts[zone.key];
              const invalid = textError === zone.key;
              return (
                <div className="denn-preview-text__row" key={zone.key}>
                  <label className="denn-composer__slot-label" htmlFor={inputId}>
                    {PREVIEW_TEXT_LABELS[zone.key] ?? zone.key}
                  </label>
                  <input
                    id={inputId}
                    data-testid={`preview-text-${zone.key}`}
                    className="denn-preview-text__input"
                    type="text"
                    value={value}
                    maxLength={zone.maxChars}
                    aria-describedby={hintId}
                    aria-invalid={invalid || undefined}
                    onChange={(event) => {
                      // IME: a composing value is provisional, so it is not committed yet
                      if (
                        event.nativeEvent instanceof InputEvent &&
                        event.nativeEvent.isComposing
                      ) {
                        return;
                      }
                      commitText(zone.key, event.target.value);
                    }}
                    onCompositionEnd={(event) => {
                      // validated exactly once, when the composition finishes
                      commitText(zone.key, event.currentTarget.value);
                    }}
                  />
                  <span
                    className="denn-composer__slot-state"
                    id={hintId}
                    data-testid={`preview-text-hint-${zone.key}`}
                  >
                    {invalid
                      ? textTooLongMessage(zone.maxChars)
                      : textLengthHint(value.length, zone.maxChars)}
                  </span>
                </div>
              );
            })
          )}
        </fieldset>
      ) : null}

      <p className="denn-browse__notice" role="status" data-testid="preview-status">
        {status ?? ""}
      </p>

      {plan !== null ? (
        // Mouse/pen drag only (spec 029 §접근성): a touch pointer is ignored and no global
        // `touch-action: none` / unconditional preventDefault is added, so page and horizontal
        // scrolling keep working and the browser zoom gesture is never intercepted.
        <div
          className="denn-preview-edit__area"
          ref={areaRef}
          data-testid="preview-edit-area"
          onPointerDown={(event) => {
            if (event.pointerType === "touch" || event.button !== 0) return;
            const slotId = activeEditable;
            if (slotId === null) return;
            const limit = built?.maxPan.get(slotId);
            if (limit === undefined) return;
            const point = logicalPoint(event.clientX, event.clientY);
            if (point === null) return;
            const started = getController().begin({
              pointerId: event.pointerId,
              point,
              transform: transformOf(slotId),
              maxPan: limit,
            });
            if (!started) return;
            dragSlotRef.current = slotId;
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              // Capture is not optional (보완 라운드 1): without it a pointer that leaves the element
              // stops delivering move/up here, so the session would hang half-open. End it now.
              getController().abort("lostpointercapture");
              dragSlotRef.current = null;
            }
          }}
          onPointerMove={(event) => {
            const controller = controllerRef.current;
            if (controller === null || !controller.isDragging()) return;
            const point = logicalPoint(event.clientX, event.clientY);
            if (point === null) return;
            controller.move(event.pointerId, point);
          }}
          onPointerUp={(event) => controllerRef.current?.end(event.pointerId, "pointerup")}
          onPointerCancel={(event) => controllerRef.current?.end(event.pointerId, "pointercancel")}
          onLostPointerCapture={(event) =>
            controllerRef.current?.end(event.pointerId, "lostpointercapture")
          }
        >
          <PreviewCanvasSurface
            plan={plan}
            imageBindings={imageBindings}
            accessibleName={PREVIEW_CANVAS_NAME[productKind]}
          />
          {clockOverlay.view.kind !== "hidden" && clockOverlay.placement !== null ? (
            // spec 031 §2.7: a DOM overlay, NOT a canvas layer — the physical clock must never be
            // painted into the plan. It is decorative for assistive tech and ignores the pointer,
            // so it can neither be read out nor block the photo drag.
            <div
              className="denn-preview-clock"
              data-testid="preview-clock"
              aria-hidden="true"
              style={{
                left: `${clockOverlay.placement.xPercent}%`,
                top: `${clockOverlay.placement.yPercent}%`,
                width: `${clockOverlay.placement.sizePercent}%`,
              }}
            >
              {clockOverlay.view.kind === "image" ? (
                <img
                  className="denn-preview-clock__image"
                  src={clockOverlay.view.src}
                  alt=""
                  data-testid="preview-clock-image"
                />
              ) : (
                <span className="denn-preview-clock__label" data-testid="preview-clock-label">
                  {clockOverlay.view.label}
                </span>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
