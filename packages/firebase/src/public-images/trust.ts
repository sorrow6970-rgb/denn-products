// Remote image trust boundary (spec 018 §4). A `https-image` value from the @denn/shared projection
// is NOT put into the DOM until this boundary approves it. Pure + synchronous: NO fetch/HEAD/Image
// preload, NO Firebase SDK, NO import-time network, NO storagePath→URL construction. A `data:` image
// passes without any URL judgement. The token/query is carried ONLY in the returned `src` (for the
// eventual img[src]); failures carry a reason and never the URL/token.

import { PUBLIC_CATALOG_LOCATION } from "../public-catalog/location";

/** Input mirrors the shared projection's available source kinds. */
export type PublicImageSourceInput =
  | { readonly kind: "data-image"; readonly value: string }
  | { readonly kind: "https-image"; readonly value: string };

export type PublicImageSourceResult =
  | {
      readonly ok: true;
      readonly src: string;
      readonly kind: "data-image" | "firebase-download-image";
    }
  | { readonly ok: false; readonly reason: "missing" | "invalid" | "untrusted" };

// Only the Firebase Storage REST host is trusted for remote images. The investigation confirmed no
// direct `*.firebasestorage.app` image HOST (the `.app` string appears as the bucket in the path),
// so it is intentionally NOT added here.
const TRUSTED_HOSTS: ReadonlySet<string> = new Set(["firebasestorage.googleapis.com"]);
// Path must reference the known public bucket: /v0/b/<bucket>/o/...  (evidence denn-mockup-tool.html:848)
const BUCKET_PATH_PREFIX = `/v0/b/${PUBLIC_CATALOG_LOCATION.bucket}/o/`;

/**
 * Decide whether an image source may be handed to the DOM. Untrusted HTTPS is failed WITHOUT any
 * network access (the browser never requests it because it never becomes an img src).
 */
export function resolvePublicImageSource(input: PublicImageSourceInput): PublicImageSourceResult {
  const value = typeof input?.value === "string" ? input.value : "";
  if (value.length === 0) return { ok: false, reason: "missing" };

  if (input.kind === "data-image") {
    if (!/^data:/i.test(value)) return { ok: false, reason: "invalid" };
    return { ok: true, src: value, kind: "data-image" };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "invalid" };
  // userinfo (user:pass@host) is a spoofing vector — reject.
  if (url.username !== "" || url.password !== "") return { ok: false, reason: "untrusted" };
  if (!TRUSTED_HOSTS.has(url.hostname)) return { ok: false, reason: "untrusted" };
  if (!url.pathname.startsWith(BUCKET_PATH_PREFIX)) return { ok: false, reason: "untrusted" };

  return { ok: true, src: value, kind: "firebase-download-image" };
}
