// @denn/firebase — repository PORT + init-state types + the read-only PUBLIC catalog adapter.
// NO Firebase SDK, NO Auth/Firestore/Storage write, NO env vars, NO firebase config here.
// The public catalog adapter (spec 013) is a plain REST read of a public object; it does NOT
// implement the full DesignRepositoryPort or any SDK wiring. Direction @denn/firebase ->
// @denn/shared is allowed.
import type { Result } from "@denn/shared";

// Read-only public catalog adapter (spec 013).
export * from "./public-catalog";
// Remote image trust boundary for catalog thumbnails (spec 018).
export * from "./public-images";

export type FirebaseInitState = "unconfigured" | "ready";

/** Port for the design/order repository. NOT IMPLEMENTED here — a later spec wires the SDK. */
export interface DesignRepositoryPort {
  readonly kind: "design-repository-port";
}

export type LoadResult<T> = Result<T, "not-implemented">;

/**
 * Explicit boundary marker: SDK wiring, Auth, Firestore, and Storage write/delete are NOT
 * implemented. The public catalog REST read (spec 013) does not count as SDK/port implementation.
 */
export const FIREBASE_NOT_IMPLEMENTED =
  "firebase SDK/auth/write wiring is implemented in a later spec (public catalog REST read is separate)" as const;
