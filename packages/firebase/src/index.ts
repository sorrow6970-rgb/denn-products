// @denn/firebase — repository PORT + init-state types only.
// NO Firebase SDK, NO network calls, NO env vars, NO firebase config.
// Real implementation (SDK wiring) is a later spec. Direction @denn/firebase -> @denn/shared is allowed.
import type { Result } from "@denn/shared";

export type FirebaseInitState = "unconfigured" | "ready";

/** Port for the design/order repository. NOT IMPLEMENTED here — a later spec wires the SDK. */
export interface DesignRepositoryPort {
  readonly kind: "design-repository-port";
}

export type LoadResult<T> = Result<T, "not-implemented">;

/** Explicit boundary marker so a placeholder is never mistaken for a real implementation. */
export const FIREBASE_NOT_IMPLEMENTED =
  "firebase SDK wiring is implemented in a later spec" as const;
