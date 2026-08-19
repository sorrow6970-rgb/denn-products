import { buildCatalogBrowseIndex, isCatalogDocumentV1, type CatalogDocumentV1 } from "@denn/shared";
import { readSpaceScene, type SpaceSceneV1 } from "@denn/spaces";

export type SpaceSceneReferenceErrorCode =
  | "SCENE_REFERENCE_INVALID_INPUT"
  | "SCENE_REFERENCE_MISSING"
  | "SCENE_REFERENCE_UNKNOWN_TEMPLATE"
  | "SCENE_REFERENCE_UNSUPPORTED_TEMPLATE"
  | "SCENE_REFERENCE_UNKNOWN_SIZE"
  | "SCENE_REFERENCE_INCOMPATIBLE_SIZE"
  | "SCENE_REFERENCE_UNKNOWN_COLOR"
  | "SCENE_REFERENCE_AMBIGUOUS_COLOR"
  | "SCENE_REFERENCE_UNSUPPORTED_COLOR"
  | "SCENE_REFERENCE_INVALID_PHOTO";

export interface ResolvedSpaceSceneReferences {
  readonly kind: "frame";
  readonly templateSourceIndex: number;
  readonly sizeSourceIndex: number;
  readonly color: { readonly fill: string };
  readonly photo: { readonly status: "requires-proof-resolution" };
  readonly transform: { readonly status: "validated-unapplied" };
  readonly room: { readonly status: "unsupported" };
  readonly replayComplete: false;
}

export type SpaceSceneReferenceResult =
  | { readonly ok: true; readonly value: ResolvedSpaceSceneReferences }
  | { readonly ok: false; readonly code: SpaceSceneReferenceErrorCode };

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

function failure(code: SpaceSceneReferenceErrorCode): SpaceSceneReferenceResult {
  return { ok: false, code };
}

function validHttpsCandidate(value: string): boolean {
  if (value.length === 0 || value.trim() !== value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

/**
 * Validate the frame references of a decrypted V1 scene without applying it or performing IO.
 * Success deliberately remains incomplete: proof trust, transform conversion and room rendering
 * belong to later contracts.
 */
export function resolveSpaceSceneReferences(
  document: CatalogDocumentV1,
  scene: SpaceSceneV1,
): SpaceSceneReferenceResult {
  try {
    if (!isCatalogDocumentV1(document)) return failure("SCENE_REFERENCE_INVALID_INPUT");
    const read = readSpaceScene(scene);
    if (!read.ok) return failure("SCENE_REFERENCE_INVALID_INPUT");
    const validated = read.value;
    const { tplId, sizeId, colorId, photoUrl } = validated.design;
    if (tplId === null || sizeId === null || colorId === null || photoUrl === undefined) {
      return failure("SCENE_REFERENCE_MISSING");
    }
    if (!validHttpsCandidate(photoUrl)) return failure("SCENE_REFERENCE_INVALID_PHOTO");

    const index = buildCatalogBrowseIndex(document);
    const templates = index.frameTemplates.filter((entry) => entry.view.id === tplId);
    if (templates.length !== 1) return failure("SCENE_REFERENCE_UNKNOWN_TEMPLATE");
    const template = templates[0];
    if (template.kind !== "builtin" && template.kind !== "uploaded") {
      return failure("SCENE_REFERENCE_UNSUPPORTED_TEMPLATE");
    }

    const sizes = index.frameSizes.filter((entry) => entry.id === sizeId);
    if (sizes.length !== 1) return failure("SCENE_REFERENCE_UNKNOWN_SIZE");
    const size = sizes[0];
    if (template.sizeScope === "unmatched") {
      return failure("SCENE_REFERENCE_INCOMPATIBLE_SIZE");
    }
    if (template.sizeScope === "restricted") {
      const sizeKeys = index.sizeIdToKeys.get(size.id);
      if (!sizeKeys || !template.sizeKeys.some((key) => sizeKeys.has(key))) {
        return failure("SCENE_REFERENCE_INCOMPATIBLE_SIZE");
      }
    }

    const matches = (document.data.frameColors ?? []).filter(
      (entry) => entry.id === colorId || entry.fill === colorId,
    );
    if (matches.length === 0) return failure("SCENE_REFERENCE_UNKNOWN_COLOR");
    if (matches.length !== 1) return failure("SCENE_REFERENCE_AMBIGUOUS_COLOR");
    const color = matches[0];
    if (color.grain === true || typeof color.fill !== "string" || !HEX6.test(color.fill)) {
      return failure("SCENE_REFERENCE_UNSUPPORTED_COLOR");
    }

    return {
      ok: true,
      value: {
        kind: "frame",
        templateSourceIndex: template.view.sourceIndex,
        sizeSourceIndex: size.sourceIndex,
        color: { fill: color.fill.toUpperCase() },
        photo: { status: "requires-proof-resolution" },
        transform: { status: "validated-unapplied" },
        room: { status: "unsupported" },
        replayComplete: false,
      },
    };
  } catch {
    return failure("SCENE_REFERENCE_INVALID_INPUT");
  }
}
