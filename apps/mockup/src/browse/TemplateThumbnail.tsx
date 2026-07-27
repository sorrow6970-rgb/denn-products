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
import { isThumbnailFailed } from "./thumbnailState";

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

  // Track failure by the specific src that failed (pure predicate). A stale failure for a previous
  // source never marks a new source as failed.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src === null || isThumbnailFailed(src, failedSrc)) {
    // Decorative: the visible card label is the accessible name; no image string anywhere.
    return (
      <span className="denn-tplthumb denn-tplthumb--empty" aria-hidden="true">
        이미지 없음
      </span>
    );
  }
  return (
    <span className="denn-tplthumb">
      {/* alt="" — the card already shows the template name as the accessible label.
          key={src} gives EACH source its own DOM node, so a late `error` from a previous source
          fires on the old, detached node — never on this one. The guard re-checks the event's own
          node so a stale error can never flip a newer source to the placeholder. Only the src
          identity is stored; no URL/token is copied into state/ARIA/data/error/log. */}
      <img
        key={src}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(event) => {
          if (event.currentTarget.getAttribute("src") === src) setFailedSrc(src);
        }}
      />
    </span>
  );
}
