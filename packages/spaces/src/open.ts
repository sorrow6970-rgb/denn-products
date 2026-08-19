import { createSpaceCrypto, type SpaceCryptoPort } from "./crypto";
import { readSpaceDocument, readSpaceScene, type SpaceDocumentV1, type SpaceSceneV1 } from "./read";

export type SpaceOpenErrorCode =
  | "SPACE_OPEN_INVALID_INPUT"
  | "SPACE_OPEN_INVALID_DOCUMENT"
  | "SPACE_OPEN_DECRYPT_FAILED"
  | "SPACE_OPEN_INVALID_SCENE";

export interface OpenedSpaceV1 {
  readonly ownerLabel: string;
  readonly createdAt: string;
  readonly scene: SpaceSceneV1;
}

export type SpaceOpenResult =
  | { readonly ok: true; readonly value: OpenedSpaceV1 }
  | { readonly ok: false; readonly code: SpaceOpenErrorCode };

export interface SpaceOpenPort {
  open(document: unknown, password: unknown): Promise<SpaceOpenResult>;
}

type DecryptPort = Pick<SpaceCryptoPort, "decryptJson">;

function opened(document: SpaceDocumentV1, scene: SpaceSceneV1): SpaceOpenResult {
  return {
    ok: true,
    value: {
      ownerLabel: document.ownerLabel,
      createdAt: document.createdAt,
      scene,
    },
  };
}

export function createSpaceOpenPort(cryptoPort: DecryptPort = createSpaceCrypto()): SpaceOpenPort {
  return {
    async open(input, password) {
      const document = readSpaceDocument(input);
      if (!document.ok) return { ok: false, code: "SPACE_OPEN_INVALID_DOCUMENT" };
      if (typeof password !== "string" || password.length === 0) {
        return { ok: false, code: "SPACE_OPEN_INVALID_INPUT" };
      }

      try {
        const plaintext = await cryptoPort.decryptJson(document.value.enc, password);
        if (!plaintext.ok) return { ok: false, code: "SPACE_OPEN_DECRYPT_FAILED" };
        const scene = readSpaceScene(plaintext.value);
        if (!scene.ok) return { ok: false, code: "SPACE_OPEN_INVALID_SCENE" };
        return opened(document.value, scene.value);
      } catch {
        return { ok: false, code: "SPACE_OPEN_DECRYPT_FAILED" };
      }
    },
  };
}
