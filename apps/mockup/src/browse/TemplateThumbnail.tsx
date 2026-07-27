// Display-only template thumbnail (spec 018). Resolves an image reference through the pure
// @denn/shared projection + the @denn/firebase trust boundary, then renders a lazy <img> or a
// neutral placeholder. NEVER draws to a Canvas, sets crossOrigin, fetches, or builds a URL from
// storagePath. The image string lives ONLY in img[src]; the component keeps only a boolean failure
// state — no URL/token in state, ARIA, data-*, text, console, or storage.

import { resolvePublicImageSource } from "@denn/firebase";
import {
  type CatalogDocumentV1,
  type CatalogTemplateKind,
  projectCatalogTemplateImage,
} from "@denn/shared";
import { useMemo, useState } from "react";

export function TemplateThumbnail({
  document,
  templateKind,
  templateId,
}: {
  document: CatalogDocumentV1;
  templateKind: CatalogTemplateKind;
  templateId: string;
}): React.JSX.Element {
  // Recompute only when the catalog identity or this template changes (spec 018 §6, §16-style).
  const src = useMemo<string | null>(() => {
    const projection = projectCatalogTemplateImage(document, { templateKind, templateId });
    if (projection.status !== "available") return null;
    const resolved = resolvePublicImageSource({
      kind: projection.sourceKind,
      value: projection.value,
    });
    return resolved.ok ? resolved.src : null;
  }, [document, templateKind, templateId]);

  // Track failure by the specific src that failed. When src changes (new catalog/template) the
  // failure no longer applies, so the new image is attempted — no effect, no stale-onError bleed.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc !== null && failedSrc === src;

  if (src === null || failed) {
    // Decorative: the visible card label is the accessible name; no image string anywhere.
    return (
      <span className="denn-tplthumb denn-tplthumb--empty" aria-hidden="true">
        이미지 없음
      </span>
    );
  }
  return (
    <span className="denn-tplthumb">
      {/* alt="" — the card already shows the template name as the accessible label. */}
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailedSrc(src)} />
    </span>
  );
}
