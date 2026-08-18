import { readLegacyCatalog } from "../read";
import type { CatalogDocumentV1 } from "../types";
import { evaluateOperatorPrintSizeInput, type OperatorPrintSizeIssue } from "./print-size";

export type FramePrintSizeEditError =
  | { readonly code: "INVALID_DOCUMENT" }
  | { readonly code: "INVALID_FRAME_SIZE_ID" }
  | { readonly code: "FRAME_SIZE_NOT_FOUND" }
  | { readonly code: "LEGACY_PRINT_SIZE_READ_ONLY" }
  | { readonly code: "INVALID_PRINT_SIZE"; readonly issues: readonly OperatorPrintSizeIssue[] };

export type FramePrintSizeEditResult =
  | {
      readonly ok: true;
      readonly value: { readonly document: CatalogDocumentV1; readonly changed: boolean };
    }
  | { readonly ok: false; readonly error: FramePrintSizeEditError };

export interface FramePrintSizeEditRequest {
  readonly frameSizeId: string;
  readonly widthText: string;
  readonly heightText: string;
}

/** Build one validated, immutable whole-catalog CAS candidate. No I/O and no persistence. */
export function applyFramePrintSizeEdit(
  document: CatalogDocumentV1,
  request: FramePrintSizeEditRequest,
): FramePrintSizeEditResult {
  if (typeof request.frameSizeId !== "string" || request.frameSizeId.trim() === "") {
    return { ok: false, error: { code: "INVALID_FRAME_SIZE_ID" } };
  }

  let source: ReturnType<typeof readLegacyCatalog>;
  try {
    source = readLegacyCatalog(document);
  } catch {
    return { ok: false, error: { code: "INVALID_DOCUMENT" } };
  }
  if (!source.ok) return { ok: false, error: { code: "INVALID_DOCUMENT" } };

  const sizes = source.document.data.frameSizes ?? [];
  const index = sizes.findIndex((item) => item.id === request.frameSizeId);
  if (index < 0) return { ok: false, error: { code: "FRAME_SIZE_NOT_FOUND" } };
  const current = sizes[index];
  if (Object.hasOwn(current, "wcm") || Object.hasOwn(current, "hcm")) {
    return { ok: false, error: { code: "LEGACY_PRINT_SIZE_READ_ONLY" } };
  }

  const evaluated = evaluateOperatorPrintSizeInput(request.widthText, request.heightText);
  if (evaluated.status !== "ok") {
    return {
      ok: false,
      error: {
        code: "INVALID_PRINT_SIZE",
        issues: evaluated.status === "rejected" ? evaluated.issues : [],
      },
    };
  }

  const changed =
    current.printWidthCm !== evaluated.value.widthCm ||
    current.printHeightCm !== evaluated.value.heightCm;
  if (!changed) return { ok: true, value: { document: source.document, changed: false } };

  const nextSizes = sizes.slice();
  nextSizes[index] = {
    ...current,
    printWidthCm: evaluated.value.widthCm,
    printHeightCm: evaluated.value.heightCm,
  };
  const candidate: CatalogDocumentV1 = {
    ...source.document,
    data: { ...source.document.data, frameSizes: nextSizes },
  };
  const verified = readLegacyCatalog(candidate);
  if (!verified.ok) return { ok: false, error: { code: "INVALID_DOCUMENT" } };
  return { ok: true, value: { document: verified.document, changed: true } };
}
