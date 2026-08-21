// Local-only space V2 issue preparation orchestrator (spec 068).
//
// Combines the three boundaries that already passed review — the spec 065 scene projector, the
// spec 066 proof-byte candidate and the spec 067 verified encryption candidate — into ONE
// snapshot-safe local flow:
//
//   snapshot + ports -> proof preparation (SHA #1) -> scene issue candidate (SHA #2)
//                    -> document encryption: evidence verify (SHA #3) + encrypt #1
//                    -> immutable-copy success handle
//
// Every caller-owned input is bound to a stable snapshot before the first await, so mutating the
// catalog, selection, transform, password or PNG bytes right after the call cannot change what the
// later stages see. The duplicate evidence verification in the document stage is deliberate and is
// NOT skipped for performance.
//
// This module is NOT wired into `App.tsx`, any route or an app barrel. It creates no token, UUID or
// random value, uploads nothing, creates no Firestore document, and touches no Firebase adapter,
// network, DOM, Canvas or clock. Because nothing is uploaded, no failure here can leave a Storage
// orphan behind.

import type { CatalogDocumentV1, FramePreviewSelection } from "@denn/shared";
import { readLegacyCatalog } from "@denn/shared";
import type {
  FrameOrientationV1,
  FrameReplayEvidenceV1,
  SpaceCryptoPort,
  SpaceDocumentV2,
  SpaceSha256Port,
} from "@denn/spaces";
import { createSpaceV2DocumentEncryptionCandidate } from "./document-encryption-candidate";
import { createSpaceV2FrameIssueCandidate } from "./issue-candidate";
import { prepareSpaceV2ProofAssetCandidate } from "./proof-asset-candidate";

/**
 * Which stage refused. A failure carries nothing else — no child error code, no raw message, no
 * password, object path, digest, bytes, ciphertext, token, UID or email — and never describes a
 * retry, merge or fallback, because this boundary performs none.
 */
export type SpaceV2LocalIssuePreparationErrorCode =
  // the input shape, a snapshot value, the password or the catalog is unusable.
  | "SPACE_V2_PREPARATION_INVALID_INPUT"
  // an injected port is missing or its method is not callable.
  | "SPACE_V2_PREPARATION_INVALID_PORT"
  // the proof bytes could not be turned into a descriptor (spec 066).
  | "SPACE_V2_PREPARATION_PROOF_FAILED"
  // the catalog/selection could not be turned into a V2 scene candidate (spec 065).
  | "SPACE_V2_PREPARATION_SCENE_FAILED"
  // the scene could not be verified and encrypted into a V2 document (spec 067).
  | "SPACE_V2_PREPARATION_DOCUMENT_FAILED";

export interface SpaceV2LocalIssuePreparationInput {
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
  /** Lowercase UUID v4 the caller already generated. This module creates no id of its own. */
  readonly assetId: string;
  readonly pngBytes: Uint8Array;
  readonly password: string;
}

/**
 * What a later upload/create adapter would receive. Every method returns a fresh detached value, so
 * one consumer cannot corrupt another's copy. The handle deliberately carries no token, plaintext
 * scene, password, catalog, selection, UID/email or timestamp.
 */
export interface PreparedSpaceV2LocalIssueCandidate {
  copyProofDescriptor(): FrameReplayEvidenceV1["proofAsset"];
  copyUploadBytes(): Uint8Array;
  copyDocument(): SpaceDocumentV2;
}

export type SpaceV2LocalIssuePreparationResult =
  | { readonly ok: true; readonly value: PreparedSpaceV2LocalIssueCandidate }
  | { readonly ok: false; readonly code: SpaceV2LocalIssuePreparationErrorCode };

const INPUT_KEYS = [
  "catalog",
  "selection",
  "frameOrientation",
  "logicalWidth",
  "frameColor",
  "transform",
  "assetId",
  "pngBytes",
  "password",
] as const;
const SELECTION_KEYS = ["frameSizeId", "templateId"] as const;
const TRANSFORM_KEYS = ["scale", "x", "y", "rotationQuarterTurns"] as const;

/**
 * Exact-key detached snapshot: every property is read ONCE into a plain object, so a hostile getter
 * or a drifting accessor cannot be observed twice with different values. An extra, missing,
 * non-enumerable or symbol key is a rejection, never a repair.
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

const fail = (
  code: SpaceV2LocalIssuePreparationErrorCode,
): { readonly ok: false; readonly code: typeof code } => ({ ok: false, code });

/**
 * Prepare one local V2 issue candidate: proof descriptor, the exact PNG bytes it describes, and the
 * encrypted document that replays them.
 *
 * The SHA-256 port runs exactly three times on the success path — once over the proof bytes, once
 * to build the evidence digest, once to verify that digest before encryption — and the crypto port
 * encrypts exactly once. Both port methods are read once, before the first await, and the same
 * always-defined adapters are handed to every child stage, so no child can fall back to a global
 * Web Crypto port. A child failure stops the flow: the next stage is not started at all.
 *
 * Never throws: a hostile, revoked or malformed input becomes a typed failure.
 */
export async function prepareSpaceV2LocalIssueCandidate(
  input: SpaceV2LocalIssuePreparationInput,
  crypto: SpaceCryptoPort,
  sha256: SpaceSha256Port,
): Promise<SpaceV2LocalIssuePreparationResult> {
  let catalog: CatalogDocumentV1;
  let selection: FramePreviewSelection;
  let transform: SpaceV2LocalIssuePreparationInput["transform"];
  let frameOrientation: unknown;
  let logicalWidth: unknown;
  let frameColor: unknown;
  let assetId: unknown;
  let pngBytes: unknown;
  let password: string;

  try {
    const issue = exactSnapshot(input, INPUT_KEYS);
    if (issue === null) return fail("SPACE_V2_PREPARATION_INVALID_INPUT");
    const selectionSnapshot = exactSnapshot(issue.selection, SELECTION_KEYS);
    const transformSnapshot = exactSnapshot(issue.transform, TRANSFORM_KEYS);
    if (selectionSnapshot === null || transformSnapshot === null) {
      return fail("SPACE_V2_PREPARATION_INVALID_INPUT");
    }

    const passwordSnapshot = issue.password;
    if (typeof passwordSnapshot !== "string" || passwordSnapshot.length === 0) {
      return fail("SPACE_V2_PREPARATION_INVALID_INPUT");
    }
    password = passwordSnapshot;

    // Detach the catalog once, before anything is projected from it, so the geometry and the art
    // verdict in the scene stage can only ever describe this one instant.
    const read = readLegacyCatalog(issue.catalog);
    if (!read.ok) return fail("SPACE_V2_PREPARATION_INVALID_INPUT");
    catalog = read.document;

    // Shape checks stay with the child boundaries; these casts only carry the snapshot forward.
    selection = selectionSnapshot as unknown as FramePreviewSelection;
    transform = transformSnapshot as unknown as SpaceV2LocalIssuePreparationInput["transform"];
    frameOrientation = issue.frameOrientation;
    logicalWidth = issue.logicalWidth;
    frameColor = issue.frameColor;
    assetId = issue.assetId;
    pngBytes = issue.pngBytes;
  } catch {
    return fail("SPACE_V2_PREPARATION_INVALID_INPUT");
  }

  // Both port methods are read ONCE, still before the first await, and must be callable. The
  // adapters below are always defined, so no child stage can reach a default global Web Crypto
  // port, and `.call(port, …)` keeps a method-style port's own receiver.
  let digestMethod: unknown;
  let encryptMethod: unknown;
  try {
    digestMethod = (sha256 as { readonly digest?: unknown } | null | undefined)?.digest;
    encryptMethod = (crypto as { readonly encryptJson?: unknown } | null | undefined)?.encryptJson;
  } catch {
    return fail("SPACE_V2_PREPARATION_INVALID_PORT");
  }
  if (typeof digestMethod !== "function" || typeof encryptMethod !== "function") {
    return fail("SPACE_V2_PREPARATION_INVALID_PORT");
  }
  const digestCall = digestMethod as (this: unknown, bytes: Uint8Array) => Promise<Uint8Array>;
  const encryptCall = encryptMethod as (
    this: unknown,
    value: unknown,
    password: string,
  ) => Promise<unknown>;
  const injectedSha256: SpaceSha256Port = { digest: (bytes) => digestCall.call(sha256, bytes) };
  const injectedCrypto: SpaceCryptoPort = {
    encryptJson: (value, secret) =>
      encryptCall.call(crypto, value, secret) as ReturnType<SpaceCryptoPort["encryptJson"]>,
    // This boundary never decrypts. The stub exists only to satisfy the port shape and fails
    // closed if anything ever tried to use it.
    decryptJson: async () => ({ ok: false, code: "SPACE_DECRYPT_FAILED" }),
  };

  // Called before this function's first await, so the spec 066 boundary copies the caller's PNG
  // bytes immediately; `pngBytes` is never read again after this point.
  const proofPending = prepareSpaceV2ProofAssetCandidate(
    { assetId, pngBytes } as unknown as Parameters<typeof prepareSpaceV2ProofAssetCandidate>[0],
    injectedSha256,
  );

  const proof = await proofPending;
  if (!proof.ok) return fail("SPACE_V2_PREPARATION_PROOF_FAILED");

  const scene = await createSpaceV2FrameIssueCandidate(
    {
      catalog,
      selection,
      frameOrientation: frameOrientation as FrameOrientationV1,
      logicalWidth: logicalWidth as number,
      frameColor: frameColor as string,
      transform,
      proofAsset: proof.value.descriptor,
    },
    injectedSha256,
  );
  if (!scene.ok) return fail("SPACE_V2_PREPARATION_SCENE_FAILED");

  const document = await createSpaceV2DocumentEncryptionCandidate(
    { scene: scene.value, password },
    injectedCrypto,
    injectedSha256,
  );
  if (!document.ok) return fail("SPACE_V2_PREPARATION_DOCUMENT_FAILED");

  const descriptor = proof.value.descriptor;
  const encrypted = document.value;
  return {
    ok: true,
    value: {
      copyProofDescriptor: () => ({ ...descriptor }),
      copyUploadBytes: () => proof.value.copyUploadBytes(),
      copyDocument: () => ({ schema: encrypted.schema, enc: { ...encrypted.enc } }),
    },
  };
}
