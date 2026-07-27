// Display-only template thumbnail (spec 018). Resolves an image reference through the pure
// @denn/shared projection + the @denn/firebase trust boundary, then renders a lazy <img> or a
// neutral placeholder. NEVER draws to a Canvas, sets crossOrigin, fetches, or builds a URL from
// storagePath.
//
// URL/base64/token live ONLY in props/closure and the real img[src] — never in React state, error,
// log, data-*, ARIA, or storage. The failure flag is a plain boolean on a per-source child keyed by
// `src`, so a source change mounts a brand-new child (fresh false) and a late `error` from the old,
// detached node cannot reach the new child's state.

import { resolvePublicImageSource } from "@denn/firebase";
import {
  type CatalogDocumentV1,
  type CatalogTemplateKind,
  projectCatalogTemplateImage,
} from "@denn/shared";
import { useMemo, useState } from "react";

// Decorative placeholder: the visible card label is the accessible name; no image string anywhere.
function ThumbnailPlaceholder(): React.JSX.Element {
  return (
    <span className="denn-tplthumb denn-tplthumb--empty" aria-hidden="true">
      이미지 없음
    </span>
  );
}

// Keyed by src in the parent → one src per instance for its whole lifetime. `failed` is a boolean
// only; onError can only ever refer to THIS src. No url/token is stored in state.
function ThumbnailImage({ src }: { src: string }): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  if (failed) return <ThumbnailPlaceholder />;
  return (
    <span className="denn-tplthumb">
      {/* alt="" — the card already shows the template name as the accessible label. */}
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </span>
  );
}

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

  if (src === null) return <ThumbnailPlaceholder />;
  // A new source mounts a new keyed child with its own fresh boolean state; the old child (and its
  // in-flight/detached <img>) unmounts, so a stale error never flips the new source.
  return <ThumbnailImage key={src} src={src} />;
}
