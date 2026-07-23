import type { PublicCatalogErrorCode } from "@denn/firebase";
import type { CatalogDocumentV1 } from "@denn/shared";

/**
 * UI state for the public catalog connection (spec 015). No raw response, full URL,
 * correlationId, or issue path is stored — only the success document (in memory) plus
 * warning count / error code / retryable.
 */
export type PublicCatalogUiState =
  | { status: "idle" }
  | { status: "loading"; requestId: number }
  | { status: "ready"; requestId: number; document: CatalogDocumentV1; warningCount: number }
  | { status: "error"; requestId: number; code: PublicCatalogErrorCode; retryable: boolean };
