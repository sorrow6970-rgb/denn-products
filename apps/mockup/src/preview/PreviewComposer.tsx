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
import type { PreviewRenderPlan } from "@denn/render";
import {
  type CasePreviewGeometry,
  type CatalogDocumentV1,
  type FramePreviewGeometry,
  projectCasePreviewGeometry,
  projectCatalogTemplateArtPlacement,
  projectCatalogTemplateImage,
  projectFramePreviewGeometry,
} from "@denn/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  CASE_BODY_COLORS,
  PREVIEW_CANVAS_NAME,
  PREVIEW_MESSAGES,
  type PreviewColorOption,
  readFrameColorOptions,
  resolveFrameLogicalWidth,
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
  const artBlocked =
    artRequest.required && (artSource === null || artState.status !== "ready") ? true : false;

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

  const plan = useMemo<PreviewRenderPlan | null>(() => {
    if (geometry === null || color === null) return null;
    // fail-closed (spec 028 §5): a template whose real art cannot be drawn shows NO canvas
    if (artBlocked) return null;
    const templateArt = artReady === null ? undefined : { imageRef: `${ART_PREFIX}${artReady}` };
    const ready = new Map<string, UserImageState>();
    for (const slotId of slotIds) {
      const entry = entries[slotId];
      if (entry?.state.status !== "ready") return null;
      const owned = entry.state.imageState;
      // each owner numbers its images independently, so the plan addresses them per slot
      ready.set(slotId, { ...owned, imageRef: `${slotRefPrefix(slotId)}${owned.imageRef}` });
    }
    if (geometry.kind === "case") {
      const built = buildCaseProductPlan({
        geometry: geometry.value,
        bodyColor: color,
        zoneImages: ready,
        templateArt,
      });
      return built.ok ? built.plan : null;
    }
    const userImage = ready.get(FRAME_SLOT_ID);
    if (userImage === undefined || contentWidth === null) return null;
    const logicalWidth = resolveFrameLogicalWidth(contentWidth);
    if (logicalWidth === null) return null;
    const built = buildFrameProductPlan({
      geometry: geometry.value,
      frameColor: color,
      logicalWidth,
      userImage,
      templateArt,
    });
    return built.ok ? built.plan : null;
  }, [geometry, color, slotIds, entries, contentWidth, artBlocked, artReady]);

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

      <p className="denn-browse__notice" role="status" data-testid="preview-status">
        {status ?? ""}
      </p>

      {plan !== null ? (
        <PreviewCanvasSurface
          plan={plan}
          imageBindings={imageBindings}
          accessibleName={PREVIEW_CANVAS_NAME[productKind]}
        />
      ) : null}
    </section>
  );
}
