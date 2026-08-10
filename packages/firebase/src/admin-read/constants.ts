// Fixed constants for the private admin-state read (spec 036 §5).

/** The ONLY object this port may read. Not a parameter — callers cannot inject a path or bucket. */
export const ADMIN_STATE_OBJECT_PATH = "admin/state.json";

/**
 * 20 * 1024 * 1024 - 1 = 20,971,519 bytes.
 *
 * This is a CLIENT-side `getBytes` ceiling chosen to match the write-side `okSize()` policy in
 * `storage.rules:22`. It is NOT a server read guarantee: `admin/`'s read rule (`storage.rules:26`)
 * has no size condition, and the file header (`:14`) records why — `request.resource.size` is null
 * on reads, so a size condition there would reject everything.
 */
export const ADMIN_STATE_MAX_BYTES = 20_971_519;

/**
 * Local wrapper timeout for the READ only (spec 036 §5.4). Auth actions get no local timeout: a
 * late success after a timeout would change the real session while the returned result said it
 * failed. A read has no such side effect, so abandoning the wait is safe.
 */
export const ADMIN_STATE_READ_TIMEOUT_MS = 30_000;

/** Correlation ids are caller-supplied, non-identifying hex. Nothing derived from a person. */
export const CORRELATION_ID_PATTERN = /^[0-9a-f]{8,64}$/;
