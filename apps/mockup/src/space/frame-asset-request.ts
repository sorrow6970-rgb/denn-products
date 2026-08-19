import { resolvePublicImageSource } from "@denn/firebase";
import {
  type CatalogDocumentV1,
  isPlainObject,
  projectCatalogTemplateArtPlacement,
  projectCatalogTemplateImage,
  readLegacyCatalog,
} from "@denn/shared";
import { readSpaceScene, type SpaceSceneV1 } from "@denn/spaces";
import type { TemplateArtSource } from "../canvas/templateArtBinding";
import { resolveSpaceProofImageUrl } from "./proof-image";
import { resolveSpaceSceneReferences } from "./scene-reference";

export type SpaceFrameAssetRequestErrorCode =
  | "SPACE_VIEW_INVALID_INPUT"
  | "SPACE_VIEW_REFERENCE_INVALID"
  | "SPACE_VIEW_PROOF_INVALID"
  | "SPACE_VIEW_TEMPLATE_ART_UNSUPPORTED"
  | "SPACE_VIEW_TEMPLATE_ART_INVALID";

export interface SpaceFrameAssetRequests {
  readonly proof: {
    readonly kind: "firebase-proof-image";
    readonly src: string;
  };
  readonly templateArt:
    | { readonly status: "none" }
    | { readonly status: "load"; readonly source: TemplateArtSource };
  readonly replayComplete: false;
}

export type ResolveSpaceFrameAssetRequestsResult =
  | { readonly ok: true; readonly value: SpaceFrameAssetRequests }
  | { readonly ok: false; readonly code: SpaceFrameAssetRequestErrorCode };

const fail = (code: SpaceFrameAssetRequestErrorCode): ResolveSpaceFrameAssetRequestsResult => ({
  ok: false,
  code,
});

/**
 * Project all image sources needed by one authenticated frame scene, without starting a load.
 * Success is deliberately all-or-nothing so a caller never loads the proof before discovering
 * that the selected template art is unsupported or untrusted.
 */
export function resolveSpaceFrameAssetRequests(
  document: unknown,
  sceneInput: unknown,
): ResolveSpaceFrameAssetRequestsResult {
  try {
    if (!isPlainObject(document)) return fail("SPACE_VIEW_INVALID_INPUT");
    const documentKeys = Object.keys(document);
    if (
      documentKeys.length !== 3 ||
      !documentKeys.every(
        (key) => key === "schemaVersion" || key === "migratedFrom" || key === "data",
      )
    ) {
      return fail("SPACE_VIEW_INVALID_INPUT");
    }
    const catalogRead = readLegacyCatalog(document);
    if (!catalogRead.ok || catalogRead.report.sourceVersion !== "catalog-v1") {
      return fail("SPACE_VIEW_INVALID_INPUT");
    }
    // Every downstream projection receives this detached JSON-safe snapshot, never caller data.
    const catalog: CatalogDocumentV1 = catalogRead.document;

    const read = readSpaceScene(sceneInput);
    if (!read.ok) return fail("SPACE_VIEW_INVALID_INPUT");
    const scene = read.value;

    const references = resolveSpaceSceneReferences(catalog, scene as SpaceSceneV1);
    if (!references.ok) return fail("SPACE_VIEW_REFERENCE_INVALID");

    const proof = resolveSpaceProofImageUrl(scene.design.photoUrl);
    if (!proof.ok) return fail("SPACE_VIEW_PROOF_INVALID");

    const templateId = scene.design.tplId;
    if (templateId === null) return fail("SPACE_VIEW_REFERENCE_INVALID");
    const placement = projectCatalogTemplateArtPlacement(catalog, {
      templateKind: "frame",
      templateId,
    });
    if (placement.status === "unsupported") {
      return fail("SPACE_VIEW_TEMPLATE_ART_UNSUPPORTED");
    }

    let templateArt: SpaceFrameAssetRequests["templateArt"] = { status: "none" };
    if (placement.status === "stretch") {
      const projected = projectCatalogTemplateImage(catalog, {
        templateKind: "frame",
        templateId,
      });
      if (projected.status !== "available") {
        return fail("SPACE_VIEW_TEMPLATE_ART_INVALID");
      }
      const trusted = resolvePublicImageSource({
        kind: projected.sourceKind,
        value: projected.value,
      });
      if (!trusted.ok) return fail("SPACE_VIEW_TEMPLATE_ART_INVALID");
      templateArt = {
        status: "load",
        source: { kind: trusted.kind, src: trusted.src },
      };
    }

    return {
      ok: true,
      value: {
        proof: proof.value,
        templateArt,
        replayComplete: false,
      },
    };
  } catch {
    return fail("SPACE_VIEW_INVALID_INPUT");
  }
}
