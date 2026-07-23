// Public catalog object location + deterministic Firebase Storage media URL (spec 013).
// This location is PUBLIC Firebase configuration (bucket + object path), NOT a secret.
// Evidence: denn-mockup-tool.html public fetch of published/state.json (L848).

export interface PublicCatalogLocation {
  readonly bucket: string;
  readonly objectPath: string;
}

/** Fixed public location of the operator-published catalog. */
export const PUBLIC_CATALOG_LOCATION: PublicCatalogLocation = {
  bucket: "denn-products.firebasestorage.app",
  objectPath: "published/state.json",
} as const;

/**
 * Build the deterministic Storage media REST URL for the fixed public location:
 *   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded-object>?alt=media
 * The whole object path is percent-encoded so `/` becomes `%2F`. No parameters, cache-buster,
 * token, or user input — the URL is a constant. The endpoint is NOT caller-injectable.
 */
export function buildPublicCatalogUrl(): string {
  const { bucket, objectPath } = PUBLIC_CATALOG_LOCATION;
  const encoded = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
}
