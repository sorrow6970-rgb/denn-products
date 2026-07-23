import { createPublicCatalogReader, type PublicCatalogReader } from "@denn/firebase";

// Module-level singleton (spec 015): the production reader is created ONCE, never inside a
// React render/effect. createPublicCatalogReader() performs no network at import time — the
// GET happens only when load() is called. Its in-flight dedup makes StrictMode's double mount
// share a single underlying fetch. Endpoint / 10s timeout / 5 MiB are the spec-013 defaults.
export const publicCatalogReader: PublicCatalogReader = createPublicCatalogReader();
