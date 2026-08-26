import { createSpaceCrypto, type SpaceCryptoPort } from "./crypto";
import {
  readSpaceDocumentV2,
  readSpaceSceneV2,
  SPACE_DOCUMENT_V2_VERSION,
  verifyFrameReplayEvidenceDigestV1,
  type SpaceSceneV2,
  type SpaceSha256Port,
} from "./v2";

export type SpaceV2OpenErrorCode =
  | "SPACE_V2_OPEN_INVALID_INPUT"
  | "SPACE_V2_OPEN_INVALID_DOCUMENT"
  | "SPACE_V2_OPEN_DECRYPT_FAILED"
  | "SPACE_V2_OPEN_INVALID_SCENE"
  | "SPACE_V2_OPEN_EVIDENCE_FAILED";

export interface OpenedSpaceV2 {
  readonly schema: typeof SPACE_DOCUMENT_V2_VERSION;
  readonly scene: SpaceSceneV2;
}

export type SpaceV2OpenResult =
  | { readonly ok: true; readonly value: OpenedSpaceV2 }
  | { readonly ok: false; readonly code: SpaceV2OpenErrorCode };

export interface SpaceV2OpenPort {
  open(document: unknown, password: unknown): Promise<SpaceV2OpenResult>;
}

type DecryptPort = Pick<SpaceCryptoPort, "decryptJson">;

const fail = (code: SpaceV2OpenErrorCode): SpaceV2OpenResult => ({ ok: false, code });

export function createSpaceV2OpenPort(
  cryptoPort: DecryptPort = createSpaceCrypto(),
  sha256?: SpaceSha256Port,
): SpaceV2OpenPort {
  let decrypt: DecryptPort["decryptJson"] | null = null;
  try {
    const method = cryptoPort.decryptJson;
    if (typeof method === "function") decrypt = method.bind(cryptoPort);
  } catch {
    decrypt = null;
  }

  return {
    async open(input, password) {
      const document = readSpaceDocumentV2(input);
      if (!document.ok) return fail("SPACE_V2_OPEN_INVALID_DOCUMENT");
      if (typeof password !== "string" || password.length === 0) {
        return fail("SPACE_V2_OPEN_INVALID_INPUT");
      }
      if (decrypt === null) return fail("SPACE_V2_OPEN_DECRYPT_FAILED");

      let plaintext: unknown;
      try {
        const decrypted = await decrypt(document.value.enc, password);
        if (!decrypted.ok) return fail("SPACE_V2_OPEN_DECRYPT_FAILED");
        plaintext = decrypted.value;
      } catch {
        return fail("SPACE_V2_OPEN_DECRYPT_FAILED");
      }

      const scene = readSpaceSceneV2(plaintext);
      if (!scene.ok) return fail("SPACE_V2_OPEN_INVALID_SCENE");

      let verified: Awaited<ReturnType<typeof verifyFrameReplayEvidenceDigestV1>>;
      try {
        verified =
          sha256 === undefined
            ? await verifyFrameReplayEvidenceDigestV1(
                scene.value.frameEvidence,
                scene.value.frameEvidenceDigest,
              )
            : await verifyFrameReplayEvidenceDigestV1(
                scene.value.frameEvidence,
                scene.value.frameEvidenceDigest,
                sha256,
              );
      } catch {
        return fail("SPACE_V2_OPEN_EVIDENCE_FAILED");
      }
      if (!verified.ok) return fail("SPACE_V2_OPEN_EVIDENCE_FAILED");

      return {
        ok: true,
        value: {
          schema: SPACE_DOCUMENT_V2_VERSION,
          scene: {
            schema: scene.value.schema,
            productKind: scene.value.productKind,
            frameEvidence: verified.value,
            frameEvidenceDigest: {
              algorithm: scene.value.frameEvidenceDigest.algorithm,
              encoding: scene.value.frameEvidenceDigest.encoding,
              value: scene.value.frameEvidenceDigest.value,
            },
            roomCapability: scene.value.roomCapability,
          },
        },
      };
    },
  };
}
