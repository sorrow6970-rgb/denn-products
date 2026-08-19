import { resolvePublicImageSource } from "@denn/firebase";
import type { PreviewRenderPlan } from "@denn/render";
import {
  type CatalogDocumentV1,
  projectCatalogTemplateArtPlacement,
  projectCatalogTemplateImage,
  projectFramePreviewGeometry,
} from "@denn/shared";
import { readSpaceScene, type SpaceSceneV1 } from "@denn/spaces";
import {
  buildFrameProductPlan,
  type TextMeasurePort,
  type UserImageState,
} from "../canvas/productPlan";
import type { TemplateArtSource } from "../canvas/templateArtBinding";
import { resolveSpaceProofImageUrl, resolveSpaceProofTransform } from "./proof-image";
import { resolveSpaceSceneReferences } from "./scene-reference";

export type SpaceFramePlanErrorCode =
  | "SPACE_VIEW_INVALID_INPUT"
  | "SPACE_VIEW_REFERENCE_INVALID"
  | "SPACE_VIEW_TRANSFORM_UNSUPPORTED"
  | "SPACE_VIEW_PROOF_NOT_READY"
  | "SPACE_VIEW_TEMPLATE_ART_UNSUPPORTED"
  | "SPACE_VIEW_TEMPLATE_ART_NOT_READY"
  | "SPACE_VIEW_CLOCK_UNSUPPORTED"
  | "SPACE_VIEW_LAYOUT_INVALID"
  | "SPACE_VIEW_TEXT_MEASURE_REQUIRED"
  | "SPACE_VIEW_PLAN_FAILED";

export type SourceBoundProofResult =
  | {
      readonly ok: true;
      readonly imageRef: string;
      readonly intrinsicSize: { readonly width: number; readonly height: number };
    }
  | { readonly ok: false };

export interface SourceBoundProofResolver {
  /** Returns ready only when the binding is for this exact source. Never starts a load. */
  resolve(source: unknown): SourceBoundProofResult;
}

export type SourceBoundTemplateArtResult =
  | { readonly ok: true; readonly imageRef: string }
  | { readonly ok: false };

export interface SourceBoundTemplateArtResolver {
  /** Returns ready only when the binding is for this exact trusted source. Never starts a load. */
  resolve(source: TemplateArtSource): SourceBoundTemplateArtResult;
}

export interface ComposeSpaceFramePlanInput {
  readonly document: unknown;
  readonly scene: unknown;
  readonly logicalWidth: unknown;
  readonly proof: SourceBoundProofResolver;
  readonly templateArt?: SourceBoundTemplateArtResolver;
  readonly measureText?: TextMeasurePort;
}

export type ComposeSpaceFramePlanResult =
  | {
      readonly ok: true;
      readonly framePlanReady: true;
      readonly replayComplete: false;
      readonly plan: PreviewRenderPlan;
    }
  | { readonly ok: false; readonly code: SpaceFramePlanErrorCode };

const fail = (code: SpaceFramePlanErrorCode): ComposeSpaceFramePlanResult => ({ ok: false, code });
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
const safeRef = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 128 &&
  /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);

/**
 * Compose one validated, view-only frame plan. Pure and synchronous: readiness resolvers may only
 * identify an already-ready source-bound binding; they must not load, retry, fetch or mutate.
 */
export function composeSpaceFramePlan(
  input: ComposeSpaceFramePlanInput,
): ComposeSpaceFramePlanResult {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      return fail("SPACE_VIEW_INVALID_INPUT");
    }

    const read = readSpaceScene(input.scene);
    if (!read.ok) return fail("SPACE_VIEW_INVALID_INPUT");
    const scene = read.value;

    const references = resolveSpaceSceneReferences(
      input.document as CatalogDocumentV1,
      scene as SpaceSceneV1,
    );
    if (!references.ok) return fail("SPACE_VIEW_REFERENCE_INVALID");

    const transform = resolveSpaceProofTransform(scene.design.imgT);
    if (!transform.ok) return fail("SPACE_VIEW_TRANSFORM_UNSUPPORTED");

    const proofSource = resolveSpaceProofImageUrl(scene.design.photoUrl);
    if (!proofSource.ok) return fail("SPACE_VIEW_PROOF_NOT_READY");
    const proofResolver = input.proof;
    const resolveProof = proofResolver?.resolve;
    if (typeof resolveProof !== "function") {
      return fail("SPACE_VIEW_PROOF_NOT_READY");
    }
    const proof = resolveProof.call(proofResolver, proofSource.value.src);
    if (
      !proof?.ok ||
      !safeRef(proof.imageRef) ||
      !positive(proof.intrinsicSize?.width) ||
      !positive(proof.intrinsicSize?.height)
    ) {
      return fail("SPACE_VIEW_PROOF_NOT_READY");
    }

    const templateId = scene.design.tplId;
    const frameSizeId = scene.design.sizeId;
    if (templateId === null || frameSizeId === null) {
      return fail("SPACE_VIEW_REFERENCE_INVALID");
    }
    const geometry = projectFramePreviewGeometry(input.document as CatalogDocumentV1, {
      frameSizeId,
      templateId,
    });
    if (!geometry.ok) return fail("SPACE_VIEW_LAYOUT_INVALID");

    const placement = projectCatalogTemplateArtPlacement(input.document as CatalogDocumentV1, {
      templateKind: "frame",
      templateId,
    });
    let templateArt: { readonly imageRef: string } | undefined;
    if (placement.status === "unsupported") {
      return fail("SPACE_VIEW_TEMPLATE_ART_UNSUPPORTED");
    }
    if (placement.status === "stretch") {
      const projected = projectCatalogTemplateImage(input.document as CatalogDocumentV1, {
        templateKind: "frame",
        templateId,
      });
      if (projected.status !== "available") {
        return fail("SPACE_VIEW_TEMPLATE_ART_NOT_READY");
      }
      const trusted = resolvePublicImageSource({
        kind: projected.sourceKind,
        value: projected.value,
      });
      const artResolver = input.templateArt;
      const resolveArt = artResolver?.resolve;
      if (!trusted.ok || typeof resolveArt !== "function") {
        return fail("SPACE_VIEW_TEMPLATE_ART_NOT_READY");
      }
      const ready = resolveArt.call(artResolver, { kind: trusted.kind, src: trusted.src });
      if (!ready?.ok || !safeRef(ready.imageRef)) {
        return fail("SPACE_VIEW_TEMPLATE_ART_NOT_READY");
      }
      templateArt = { imageRef: ready.imageRef };
    }

    if (scene.design.clockOn !== false) return fail("SPACE_VIEW_CLOCK_UNSUPPORTED");
    if (!positive(input.logicalWidth) || !Number.isInteger(input.logicalWidth)) {
      return fail("SPACE_VIEW_LAYOUT_INVALID");
    }

    const textValues = new Map(Object.entries(scene.design.texts));
    const hasRenderedText = geometry.value.textZones.some(
      (zone) => (textValues.get(zone.key) ?? "") !== "",
    );
    if (hasRenderedText && typeof input.measureText !== "function") {
      return fail("SPACE_VIEW_TEXT_MEASURE_REQUIRED");
    }

    const userImage: UserImageState = {
      imageRef: proof.imageRef,
      intrinsicSize: proof.intrinsicSize,
      transform: transform.value.transform,
    };
    const built = buildFrameProductPlan({
      geometry: geometry.value,
      frameColor: references.value.color.fill,
      logicalWidth: input.logicalWidth,
      userImage,
      ...(templateArt === undefined ? {} : { templateArt }),
      textValues,
      ...(input.measureText === undefined ? {} : { measureText: input.measureText }),
    });
    if (!built.ok) return fail("SPACE_VIEW_PLAN_FAILED");
    return {
      ok: true,
      framePlanReady: true,
      replayComplete: false,
      plan: built.plan,
    };
  } catch {
    return fail("SPACE_VIEW_INVALID_INPUT");
  }
}
