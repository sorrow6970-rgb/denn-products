import type { PreviewRenderPlan } from "@denn/render";
import { readSpaceScene } from "@denn/spaces";
import type { TextMeasurePort } from "../canvas/productPlan";
import type { TemplateArtSource } from "../canvas/templateArtBinding";
import { classifySpaceV1FrameReplay } from "./proof-image";

export type SpaceFramePlanErrorCode =
  | "SPACE_VIEW_INVALID_INPUT"
  | "SPACE_VIEW_REFERENCE_INVALID"
  | "SPACE_VIEW_TRANSFORM_UNSUPPORTED"
  | "SPACE_VIEW_ORIENTATION_UNCONFIRMED"
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

/**
 * Reject V1 before any source/readiness/Canvas work. The payload cannot prove its capture
 * orientation or geometry, so there is no exact frame plan that this function may return yet.
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
    const eligibility = classifySpaceV1FrameReplay(read.value.design.imgT);
    if (eligibility.code === "SPACE_PROOF_TRANSFORM_INVALID") {
      return fail("SPACE_VIEW_INVALID_INPUT");
    }
    if (eligibility.code === "SPACE_PROOF_TRANSFORM_UNSUPPORTED") {
      return fail("SPACE_VIEW_TRANSFORM_UNSUPPORTED");
    }
    return fail("SPACE_VIEW_ORIENTATION_UNCONFIRMED");
  } catch {
    return fail("SPACE_VIEW_INVALID_INPUT");
  }
}
