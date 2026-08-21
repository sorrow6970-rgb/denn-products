// Local-only space V2 issue candidate projector (spec 065).
//
// Composition boundary: the admin app joins the already-validated `@denn/shared` catalog projection
// (spec 023/018) to the strict `@denn/spaces` V2 replay evidence contract (spec 064). Neither
// package learns about the other — the join lives here.
//
// This module is NOT wired into `App.tsx` or any route. It has no network, Firebase, token,
// encryption, upload, document create, DOM, Canvas, Date, random or global state. The only
// cryptography is the spec 064 SHA-256 port, injected or defaulted by that package.
//
// Everything outside the first approved capability (operator text zones, a physical clock, real
// template art, or art whose absence cannot be proven) fails CLOSED before the digest port is
// called, so no evidence can claim `templateArt: none` for a state that has art.

import {
  type CatalogDocumentV1,
  type FramePreviewSelection,
  projectCatalogTemplateImage,
  projectFramePreviewGeometry,
} from "@denn/shared";
import {
  createFrameReplayEvidenceDigestV1,
  FRAME_REPLAY_CONTRACT_V1,
  type FrameOrientationV1,
  type FrameReplayEvidenceV1,
  readSpaceSceneV2,
  SPACE_SCENE_V2_VERSION,
  type SpaceSceneV2,
  type SpaceSha256Port,
} from "@denn/spaces";

/**
 * Fixed by the spec 064 evidence contract. The literal is re-stated here (not imported) because
 * `@denn/spaces` keeps the constant module-private; the indexed access type makes a drift from that
 * contract a compile error rather than a runtime rejection.
 */
const TRANSFORM_ENCODING: FrameReplayEvidenceV1["transformEncoding"] = "normalized-max-pan-v1";

/**
 * Failure meanings. A code never carries a catalog value, a selection id, an object path, a digest,
 * a token, a password, a UID/email, customer text or a thrown SDK message, and never describes a
 * retry, a merge or a fallback — there is none.
 */
export type SpaceV2IssueErrorCode =
  // the issue input shape/values are unusable, or the assembled evidence fails the spec 064
  // contract (logical width, colour, transform, proof descriptor, orientation vs projected aspect).
  | "SPACE_V2_ISSUE_INVALID_INPUT"
  // the catalog/selection could not be projected at all.
  | "SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED"
  // the projection succeeded but describes a state outside the first capability.
  | "SPACE_V2_ISSUE_UNSUPPORTED_CAPABILITY"
  // the injected/default SHA-256 port threw, rejected or returned an unusable digest.
  | "SPACE_V2_ISSUE_DIGEST_FAILED";

export type SpaceV2IssueResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: SpaceV2IssueErrorCode };

/**
 * The explicit issue input. `catalog` must be a validated spec 012 `CatalogDocumentV1`; geometry is
 * only ever taken from `projectFramePreviewGeometry`, never re-read from raw catalog fields, and is
 * never clamped, defaulted or repaired here. No proof bytes, token, password, email, UID, customer
 * text, raw URL/base64 or Firebase object is accepted.
 */
export interface SpaceV2FrameIssueCandidateInput {
  readonly catalog: CatalogDocumentV1;
  readonly selection: FramePreviewSelection;
  readonly frameOrientation: FrameOrientationV1;
  readonly logicalWidth: number;
  readonly frameColor: string;
  readonly transform: {
    readonly scale: number;
    readonly x: number;
    readonly y: number;
    readonly rotationQuarterTurns: 0 | 1 | 2 | 3;
  };
  /**
   * Descriptor of an already-prepared proof object, produced by a later asset-preparation boundary.
   * This projector re-checks its SHAPE through the spec 064 validator and never reads, hashes or
   * fetches the bytes it describes.
   */
  readonly proofAsset: FrameReplayEvidenceV1["proofAsset"];
}

const INPUT_KEYS = [
  "catalog",
  "selection",
  "frameOrientation",
  "logicalWidth",
  "frameColor",
  "transform",
  "proofAsset",
] as const;
const SELECTION_KEYS = ["frameSizeId", "templateId"] as const;
const TRANSFORM_KEYS = ["scale", "x", "y", "rotationQuarterTurns"] as const;
const PROOF_KEYS = [
  "objectPath",
  "sha256",
  "byteLength",
  "contentType",
  "intrinsicWidth",
  "intrinsicHeight",
] as const;

/**
 * Exact-key detached snapshot. Every property is read ONCE into a plain object, so a hostile getter,
 * a Proxy trap or a drifting accessor cannot be observed twice with different values, and a later
 * mutation of the caller's object cannot reach the result. An extra, missing, non-enumerable or
 * symbol key is a rejection, never a repair.
 *
 * Duplicated from the spec 064 reader on purpose: this unit may not modify `@denn/spaces`.
 */
function exactSnapshot<const Keys extends readonly string[]>(
  input: unknown,
  expectedKeys: Keys,
): { readonly [Key in Keys[number]]: unknown } | null {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.length !== expectedKeys.length || ownKeys.some((key) => typeof key !== "string")) {
    return null;
  }
  for (const key of ownKeys) {
    if (!Reflect.getOwnPropertyDescriptor(input, key)?.enumerable) return null;
  }
  const keySet = new Set(ownKeys as string[]);
  if (expectedKeys.some((key) => !keySet.has(key))) return null;

  const snapshot: Record<string, unknown> = {};
  const source = input as Record<string, unknown>;
  for (const key of expectedKeys) snapshot[key] = source[key];
  return snapshot as { readonly [Key in Keys[number]]: unknown };
}

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";

const isRotation = (value: unknown): value is 0 | 1 | 2 | 3 =>
  value === 0 || value === 1 || value === 2 || value === 3;

const fail = (code: SpaceV2IssueErrorCode): { readonly ok: false; readonly code: typeof code } => ({
  ok: false,
  code,
});

/**
 * Assemble one immutable `SpaceSceneV2` candidate from a validated catalog projection plus the
 * caller's explicit orientation, logical width, appearance, transform and proof descriptor.
 *
 * The spec 064 validator stays the single authority on ranges, formats and the orientation/aspect
 * agreement: the local checks below only narrow types, so those rules are never re-stated (and so
 * never drift) here. Because `createFrameReplayEvidenceDigestV1` encodes before it hashes, invalid
 * evidence never reaches the SHA-256 port; on success the port is called exactly once, with the
 * canonical evidence bytes. The returned scene is re-read through `readSpaceSceneV2`, so it is a
 * detached value that shares no reference with the input.
 *
 * Never throws: a hostile, revoked, drifting or circular input becomes a typed failure.
 */
export async function createSpaceV2FrameIssueCandidate(
  input: SpaceV2FrameIssueCandidateInput,
  sha256?: SpaceSha256Port,
): Promise<SpaceV2IssueResult<SpaceSceneV2>> {
  try {
    const issue = exactSnapshot(input, INPUT_KEYS);
    if (!issue) return fail("SPACE_V2_ISSUE_INVALID_INPUT");
    const selection = exactSnapshot(issue.selection, SELECTION_KEYS);
    const transform = exactSnapshot(issue.transform, TRANSFORM_KEYS);
    const proofAsset = exactSnapshot(issue.proofAsset, PROOF_KEYS);
    if (selection === null || transform === null || proofAsset === null) {
      return fail("SPACE_V2_ISSUE_INVALID_INPUT");
    }

    const frameOrientation = issue.frameOrientation;
    if (frameOrientation !== "portrait" && frameOrientation !== "landscape") {
      return fail("SPACE_V2_ISSUE_INVALID_INPUT");
    }
    if (
      !isNumber(issue.logicalWidth) ||
      !isString(issue.frameColor) ||
      !isString(selection.frameSizeId) ||
      !isString(selection.templateId) ||
      !isNumber(transform.scale) ||
      !isNumber(transform.x) ||
      !isNumber(transform.y) ||
      !isRotation(transform.rotationQuarterTurns) ||
      !isString(proofAsset.objectPath) ||
      !isString(proofAsset.sha256) ||
      !isNumber(proofAsset.byteLength) ||
      proofAsset.contentType !== "image/png" ||
      !isNumber(proofAsset.intrinsicWidth) ||
      !isNumber(proofAsset.intrinsicHeight)
    ) {
      return fail("SPACE_V2_ISSUE_INVALID_INPUT");
    }

    // Both catalog reads use the SAME selection snapshot, so the geometry and the art verdict can
    // never come from two different selections.
    const catalog = issue.catalog as CatalogDocumentV1;
    const frameSelection: FramePreviewSelection = {
      frameSizeId: selection.frameSizeId,
      templateId: selection.templateId,
    };
    const projected = projectFramePreviewGeometry(catalog, frameSelection);
    if (!projected.ok) return fail("SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED");
    const geometry = projected.value;

    // `projectCatalogTemplateImage` has no exception boundary of its own, so a hostile document
    // reaches us as a throw; that is a failed catalog projection, not a usable "no art" answer.
    let templateImage: ReturnType<typeof projectCatalogTemplateImage>;
    try {
      templateImage = projectCatalogTemplateImage(catalog, {
        templateKind: "frame",
        templateId: frameSelection.templateId,
      });
    } catch {
      return fail("SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED");
    }

    // First capability: image-only, no operator text, no physical clock, and art that is provably
    // absent. `invalid-reference` means a source string existed but could not be classified, so
    // absence is NOT proven and the candidate must not claim `templateArt: none`.
    if (
      geometry.textZones.length > 0 ||
      geometry.clockPreview !== null ||
      templateImage.status === "available" ||
      templateImage.reason === "invalid-reference"
    ) {
      return fail("SPACE_V2_ISSUE_UNSUPPORTED_CAPABILITY");
    }

    const evidence: FrameReplayEvidenceV1 = {
      replayContract: FRAME_REPLAY_CONTRACT_V1,
      frameOrientation,
      logicalWidth: issue.logicalWidth,
      geometry: {
        aspect: geometry.aspect,
        borderPercentOfWidth: geometry.borderPercentOfWidth,
        matColor: geometry.matColor,
        contentInsetPx: geometry.contentInsetPx,
      },
      frameColor: issue.frameColor,
      transformEncoding: TRANSFORM_ENCODING,
      transform: {
        scale: transform.scale,
        x: transform.x,
        y: transform.y,
        rotationQuarterTurns: transform.rotationQuarterTurns,
      },
      proofAsset: {
        objectPath: proofAsset.objectPath,
        sha256: proofAsset.sha256,
        byteLength: proofAsset.byteLength,
        contentType: "image/png",
        intrinsicWidth: proofAsset.intrinsicWidth,
        intrinsicHeight: proofAsset.intrinsicHeight,
      },
      templateArt: { kind: "none" },
      textMode: "none",
      clockMode: "off",
    };

    const digest = await createFrameReplayEvidenceDigestV1(evidence, sha256);
    if (!digest.ok) {
      return fail(
        digest.code === "SPACE_V2_DIGEST_FAILED"
          ? "SPACE_V2_ISSUE_DIGEST_FAILED"
          : "SPACE_V2_ISSUE_INVALID_INPUT",
      );
    }

    const candidate = readSpaceSceneV2({
      schema: SPACE_SCENE_V2_VERSION,
      productKind: "frame",
      frameEvidence: evidence,
      frameEvidenceDigest: digest.value,
      roomCapability: "unsupported",
    });
    if (!candidate.ok) return fail("SPACE_V2_ISSUE_INVALID_INPUT");
    return { ok: true, value: candidate.value };
  } catch {
    return fail("SPACE_V2_ISSUE_INVALID_INPUT");
  }
}
