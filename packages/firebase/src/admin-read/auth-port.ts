// Operator auth port (spec 036 §4). The observer is the single authority for the auth state:
// sign-in / sign-out resolve with a correlationId only, so a caller has no value to overwrite it
// with and cannot depend on which of the two finishes first.

import { CORRELATION_ID_PATTERN } from "./constants";
import { mapAuthError, safeError } from "./errors";
import type { AdminFacadeUser, AdminFirebaseFacade } from "./facade";
import type { OperatorAuthActionResult, OperatorAuthPort, OperatorAuthState } from "./types";

const INITIALIZING: OperatorAuthState = { status: "initializing" };

const isValidCorrelationId = (value: unknown): value is string =>
  typeof value === "string" && CORRELATION_ID_PATTERN.test(value);

/** Anonymous sessions satisfy no rule here: `storage.rules` op() requires a non-anonymous provider. */
function stateFromUser(user: AdminFacadeUser | null): OperatorAuthState {
  if (user === null) return { status: "signed-out" };
  if (user.isAnonymous) return { status: "error", code: "ANONYMOUS_NOT_ALLOWED" };
  return { status: "authenticated" };
}

export function createOperatorAuthPort(facade: AdminFirebaseFacade): OperatorAuthPort {
  let state: OperatorAuthState = INITIALIZING;
  const listeners = new Set<(next: OperatorAuthState) => void>();
  let detach: (() => void) | null = null;

  const publish = (next: OperatorAuthState): void => {
    state = next;
    for (const listener of [...listeners]) listener(next);
  };

  const subscribe = (listener: (next: OperatorAuthState) => void): (() => void) => {
    listeners.add(listener);
    // The observer is attached with the first subscriber and detached with the last, so a
    // StrictMode double-subscribe stays balanced instead of leaking a second registration.
    if (detach === null) {
      detach = facade.onAuthStateChanged(
        (user) => publish(stateFromUser(user)),
        // An SDK/init failure must NOT leave the port in `initializing` forever, and the raw error
        // must not travel any further than this line.
        (error) => publish({ status: "error", code: mapAuthError(error) }),
      );
    }
    listener(state);
    let active = true;
    return () => {
      if (!active) return; // an unsubscribe called twice must not detach someone else's observer
      active = false;
      listeners.delete(listener);
      if (listeners.size === 0 && detach !== null) {
        const stop = detach;
        detach = null;
        state = INITIALIZING;
        stop();
      }
    };
  };

  const signInWithEmailPassword = async (
    email: string,
    password: string,
    request: { readonly correlationId: string },
  ): Promise<OperatorAuthActionResult> => {
    const correlationId = request?.correlationId;
    if (!isValidCorrelationId(correlationId)) {
      return { ok: false, error: safeError("INVALID_REQUEST", "") };
    }
    try {
      // fail-closed: without local persistence the session would silently not survive a reload
      await facade.setPersistenceLocal();
    } catch {
      return { ok: false, error: safeError("AUTH_PERSISTENCE_FAILED", correlationId) };
    }
    try {
      await facade.signInWithEmailPassword(email, password);
    } catch (error) {
      return { ok: false, error: safeError(mapAuthError(error), correlationId) };
    }
    // NOTE: no state is published here. `authenticated` arrives (only) through the observer.
    return { ok: true, value: { correlationId } };
  };

  const signOut = async (request: {
    readonly correlationId: string;
  }): Promise<OperatorAuthActionResult> => {
    const correlationId = request?.correlationId;
    if (!isValidCorrelationId(correlationId)) {
      return { ok: false, error: safeError("INVALID_REQUEST", "") };
    }
    try {
      await facade.signOut();
    } catch (error) {
      return { ok: false, error: safeError(mapAuthError(error), correlationId) };
    }
    // Same rule as sign-in: `signed-out` is the observer's to publish, not this promise's.
    return { ok: true, value: { correlationId } };
  };

  return {
    subscribe,
    currentOperator: () => state,
    signInWithEmailPassword,
    signOut,
  };
}
