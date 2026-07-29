// Read-only combination of several image binding sources into ONE lookup (spec 027 §연결 경계).
//
// Framework-free and side-effect-free: it owns no drawable, creates nothing, disposes nothing and
// never touches a URL. Each source stays the single owner of its own image (spec 026); this only
// asks them in order and returns the first hit, so a plan built from several zone owners can be
// executed through a single `PreviewImageBindings` port.

import type { PreviewImageBindings } from "./types";

/**
 * Namespace one source under `prefix`.
 *
 * Each spec 026 owner numbers its images on its OWN counter, so two owners both hand out
 * `user-image-1`. A plan that draws several owners must therefore address them by a prefixed ref
 * (the caller uses the same prefix when it builds the plan input), and this view answers only refs
 * in its own namespace — a foreign ref is `undefined`, never another owner's drawable.
 */
export function withImageRefPrefix(
  prefix: string,
  source: PreviewImageBindings,
): PreviewImageBindings {
  return {
    get: (imageRef: string): CanvasImageSource | undefined => {
      if (typeof imageRef !== "string" || !imageRef.startsWith(prefix)) return undefined;
      return source.get(imageRef.slice(prefix.length));
    },
  };
}

/**
 * Combine sources into one read-only lookup. Sources are queried in order and the first non-nullish
 * drawable wins. A source that throws is skipped (a hostile lookup must not break the surface), and
 * an unknown `imageRef` yields `undefined` — never a placeholder or a "closest" match.
 */
export function createCompositeImageBindings(
  sources: readonly PreviewImageBindings[],
): PreviewImageBindings {
  const owned = [...sources];
  return {
    get: (imageRef: string): CanvasImageSource | undefined => {
      for (const source of owned) {
        let found: CanvasImageSource | undefined;
        try {
          found = source?.get(imageRef) ?? undefined;
        } catch {
          // a hostile/failing source is simply not a binding; nothing is logged
          found = undefined;
        }
        if (found !== undefined && found !== null) return found;
      }
      return undefined;
    },
  };
}
