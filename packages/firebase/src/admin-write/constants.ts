// Fixed constants for the rebuild admin-state write path (spec 037 §4).
//
// Every value here is a module constant on purpose: the port takes no path, bucket, collection or
// document argument, so a caller cannot redirect a write.

/**
 * Storage prefix for the immutable state objects (spec 037 §4.1).
 *
 * A separate TOP-LEVEL path, deliberately not under `admin/`: there is no overlapping parent match,
 * so the OR evaluation of Storage rules cannot bypass the `resource == null` immutability condition
 * (`storage.rules` header, lines 5-7).
 */
export const REBUILD_OBJECT_PREFIX = "rebuild-admin-state/objects/";

/**
 * The ONLY object path shape this spec writes or reads.
 *
 * Deliberately opaque: no revision, customer copy, catalog id, email, uid, timestamp or filename
 * (spec 037 §4.1). The same shape is enforced independently by `validObjectPath()` in
 * `firestore.rules`, so a malformed pointer is refused on the server too.
 */
export const REBUILD_OBJECT_PATH_PATTERN =
  /^rebuild-admin-state\/objects\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/;

/** Firestore location of the single mutable source of truth (spec 037 §4.3). */
export const HEAD_COLLECTION_ID = "rebuildAdminState";
export const HEAD_DOCUMENT_ID = "head";

/** The head schema this build writes and accepts. Anything else fails closed. */
export const HEAD_SCHEMA_VERSION = 1;

/** Exactly three keys. A fourth key is a contract violation, not an extension. */
export const HEAD_ALLOWED_KEYS = ["schemaVersion", "revision", "objectPath"] as const;

/** Objects are JSON; the create rule refuses any other content type. */
export const REBUILD_OBJECT_CONTENT_TYPE = "application/json";

/**
 * 20 * 1024 * 1024 - 1 = 20,971,519 bytes — the same ceiling `okSize()` enforces in
 * `storage.rules`. Checked locally so an oversized payload never reaches the network.
 */
export const REBUILD_OBJECT_MAX_BYTES = 20_971_519;

/** Correlation ids are caller-supplied, non-identifying hex (same rule as spec 036). */
export const CORRELATION_ID_PATTERN = /^[0-9a-f]{8,64}$/;

/**
 * Logical revision of "there is no head yet" (spec 037 §4.3).
 *
 * This is why the first create still checks `expectedBase`: an editing session based on revision 5
 * must NOT be allowed to write revision 1 just because the head went missing.
 */
export const NO_HEAD_REVISION = 0;

/** Full path of the head document, for adapters that address it as a single string. */
export const HEAD_DOCUMENT_PATH = `${HEAD_COLLECTION_ID}/${HEAD_DOCUMENT_ID}`;
