/** Local contract constants for the space V2 persistence port (spec 074). */

export const SPACE_V2_ASSET_PREFIX = "rebuild-space-assets/objects/";
export const SPACE_V2_ASSET_CONTENT_TYPE = "image/png" as const;
export const SPACE_V2_ASSET_MAX_BYTES = 20 * 1024 * 1024 - 1;

export const SPACE_V2_UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const SPACE_V2_ASSET_PATH_PATTERN =
  /^rebuild-space-assets\/objects\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.png$/;

/** Non-identifying caller correlation id; same conservative shape as admin-write. */
export const SPACE_V2_ISSUE_CORRELATION_ID_PATTERN = /^[0-9a-f]{8,64}$/;
