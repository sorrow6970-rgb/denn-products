// Pure failure predicate for TemplateThumbnail (spec 018 stale-onError hardening).
//
// A load failure is recorded against the SPECIFIC src that failed. Therefore a stale failure for a
// previous source never marks a different (new) source as failed: once `failedSrc` holds source A,
// switching the current source to B yields `false` (B is shown, not the placeholder). Combined with
// a per-source DOM node (`key={src}` on the img) and an event-target guard, a late `error` event
// from source A cannot flip source B to the placeholder.
//
// No URL/token is stored beyond the src identity used to compare — this predicate is a pure string
// comparison and copies nothing new anywhere.
export function isThumbnailFailed(currentSrc: string | null, failedSrc: string | null): boolean {
  return currentSrc !== null && failedSrc === currentSrc;
}
