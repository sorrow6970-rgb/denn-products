import type { SpaceDocumentV2 } from "@denn/spaces";

export interface SpaceV2AssetUploadRequest {
  readonly objectPath: string;
  readonly bytes: Uint8Array;
  readonly contentType: "image/png";
}

/** Safe numeric receipt only. Raw Firebase metadata never crosses this boundary. */
export interface SpaceV2AssetUploadReceipt {
  readonly byteLength: number;
}

export interface SpaceV2DocumentCreateRequest {
  readonly token: string;
  readonly document: SpaceDocumentV2;
}

export interface SpaceV2ServerDocumentSnapshot {
  readonly exists: boolean;
  readonly data?: unknown;
  /** A reconciliation success must be a server result with no local pending writes. */
  readonly fromCache: boolean;
  readonly hasPendingWrites: boolean;
}

/**
 * Injectable persistence boundary. Unit tests use a synthetic fake; spec 074 provides no SDK
 * implementation and therefore has no network-capable default.
 */
export interface SpaceV2IssueWriteFacade {
  uploadProofAsset(request: SpaceV2AssetUploadRequest): Promise<SpaceV2AssetUploadReceipt>;
  createSpaceDocument(request: SpaceV2DocumentCreateRequest): Promise<void>;
  readSpaceDocumentFromServer(token: string): Promise<SpaceV2ServerDocumentSnapshot>;
}
