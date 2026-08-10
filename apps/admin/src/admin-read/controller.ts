// UI-agnostic controller for the operator remote-read card (spec 036 §6).
//
// The React component stays dumb on purpose: every rule that matters (observer authority, late
// results, disposal, single in-flight) lives here, where it is unit-testable without a DOM.

import type {
  AdminReadErrorCode,
  AdminStateReadPort,
  OperatorAuthPort,
  OperatorAuthState,
} from "@denn/firebase/admin-read";

export type AdminRemoteStatus =
  | "unconfigured"
  | "initializing"
  | "signed-out"
  | "signing-in"
  | "authenticated"
  | "loading"
  | "ready"
  | "error";

export interface AdminRemoteSnapshot {
  readonly status: AdminRemoteStatus;
  readonly errorCode: AdminReadErrorCode | null;
  /** True while the email/password form should be offered. */
  readonly canSignIn: boolean;
  /** True while the explicit "load" action is available (never automatic). */
  readonly canLoad: boolean;
}

export interface AdminRemoteController {
  subscribe(listener: (snapshot: AdminRemoteSnapshot) => void): () => void;
  getSnapshot(): AdminRemoteSnapshot;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  load(): Promise<void>;
  dispose(): void;
}

export interface AdminRemoteControllerOptions {
  /** Absent = the feature is not configured; no port is created and nothing is observed. */
  readonly ports?: { readonly auth: OperatorAuthPort; readonly read: AdminStateReadPort };
  /** Non-identifying hex id per user action; injected so tests stay deterministic. */
  readonly createCorrelationId: () => string;
}

const UNCONFIGURED: AdminRemoteSnapshot = {
  status: "unconfigured",
  errorCode: null,
  canSignIn: false,
  canLoad: false,
};

export function createAdminRemoteController(
  options: AdminRemoteControllerOptions,
): AdminRemoteController {
  const { ports, createCorrelationId } = options;
  const listeners = new Set<(snapshot: AdminRemoteSnapshot) => void>();

  let disposed = false;
  let generation = 0;
  let auth: OperatorAuthState = { status: "initializing" };
  let busy: "idle" | "signing-in" | "loading" | "signing-out" = "idle";
  let errorCode: AdminReadErrorCode | null = null;
  let hasDocument = false;
  let snapshot: AdminRemoteSnapshot = ports === undefined ? UNCONFIGURED : derive();
  let detachAuth: (() => void) | null = null;

  function derive(): AdminRemoteSnapshot {
    if (ports === undefined) return UNCONFIGURED;
    const authenticated = auth.status === "authenticated";
    // `signing-out` adds no product state and no new copy: it only closes both doors while the
    // SDK call is in flight, so a second sign-out (or a load) cannot start behind it.
    const canSignIn = !authenticated && busy === "idle";
    const canLoad = authenticated && busy === "idle";
    if (busy === "loading") return { status: "loading", errorCode: null, canSignIn, canLoad };
    if (busy === "signing-in") return { status: "signing-in", errorCode: null, canSignIn, canLoad };
    if (errorCode !== null) return { status: "error", errorCode, canSignIn, canLoad };
    switch (auth.status) {
      case "initializing":
        return { status: "initializing", errorCode: null, canSignIn: false, canLoad: false };
      case "signed-out":
        return { status: "signed-out", errorCode: null, canSignIn, canLoad };
      case "authenticated":
        return {
          status: hasDocument ? "ready" : "authenticated",
          errorCode: null,
          canSignIn,
          canLoad,
        };
      default:
        return { status: "error", errorCode: auth.code, canSignIn, canLoad };
    }
  }

  const same = (a: AdminRemoteSnapshot, b: AdminRemoteSnapshot): boolean =>
    a.status === b.status &&
    a.errorCode === b.errorCode &&
    a.canSignIn === b.canSignIn &&
    a.canLoad === b.canLoad;

  function publish(): void {
    if (disposed) return; // a disposed controller notifies nobody, ever
    const next = derive();
    if (same(next, snapshot)) return; // no-op transitions must not re-render or duplicate events
    snapshot = next;
    for (const listener of [...listeners]) listener(snapshot);
  }

  function attach(): void {
    if (ports === undefined || detachAuth !== null) return;
    detachAuth = ports.auth.subscribe((next) => {
      if (disposed) return;
      auth = next;
      // the observer is the authority: its word clears a stale action error
      errorCode = null;
      if (next.status !== "authenticated") hasDocument = false;
      publish();
    });
  }

  const subscribe = (listener: (value: AdminRemoteSnapshot) => void): (() => void) => {
    listeners.add(listener);
    listener(snapshot);
    attach();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      listeners.delete(listener);
    };
  };

  /** A result from an older action (or from before disposal) must never win. */
  const isStale = (token: number): boolean => disposed || token !== generation;

  const signIn = async (email: string, password: string): Promise<void> => {
    if (ports === undefined || busy !== "idle" || disposed) return;
    const token = ++generation;
    busy = "signing-in";
    errorCode = null;
    publish();
    const result = await ports.auth.signInWithEmailPassword(email, password, {
      correlationId: createCorrelationId(),
    });
    if (isStale(token)) return;
    busy = "idle";
    // On success nothing is asserted about the auth state — the observer publishes it (§4.3).
    errorCode = result.ok ? null : result.error.code;
    publish();
  };

  const signOut = async (): Promise<void> => {
    // the same guard as sign-in/load: while a sign-out is running, nothing else may start
    if (ports === undefined || busy !== "idle" || disposed) return;
    const token = ++generation;
    busy = "signing-out";
    errorCode = null;
    publish();
    const result = await ports.auth.signOut({ correlationId: createCorrelationId() });
    if (isStale(token)) return;
    busy = "idle";
    // On success nothing is asserted about the auth state — `signed-out` is the observer's word.
    errorCode = result.ok ? null : result.error.code;
    publish();
  };

  const load = async (): Promise<void> => {
    if (ports === undefined || busy !== "idle" || disposed) return;
    const token = ++generation;
    busy = "loading";
    errorCode = null;
    hasDocument = false;
    publish();
    const result = await ports.read.load({ correlationId: createCorrelationId() });
    if (isStale(token)) return;
    busy = "idle";
    if (result.ok) {
      // the validated document is used as a fact that the read succeeded; it is NOT stored
      // anywhere, not rendered, and not connected to the spec 035 card
      hasDocument = true;
      errorCode = null;
    } else {
      hasDocument = false;
      errorCode = result.error.code;
    }
    publish();
  };

  const dispose = (): void => {
    disposed = true;
    generation++;
    listeners.clear();
    if (detachAuth !== null) {
      const stop = detachAuth;
      detachAuth = null;
      stop();
    }
  };

  return { subscribe, getSnapshot: () => snapshot, signIn, signOut, load, dispose };
}
