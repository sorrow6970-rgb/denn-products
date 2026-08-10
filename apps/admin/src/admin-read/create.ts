// Wiring: environment -> (optional) ports -> controller (spec 036 §3, §6).
//
// When the feature is not configured, NOTHING is created: no facade, no SDK import, no observer,
// no Storage call. The SDK is only reached through a lazy facade whose dynamic import fires on the
// first real use, so an enabled-but-idle admin page still loads no Firebase code.

import {
  createAdminStateReadPort,
  createFirebaseAdminFacade,
  createOperatorAuthPort,
} from "@denn/firebase/admin-read";
import type { AdminFirebaseConfig, AdminFirebaseFacade } from "@denn/firebase/admin-read";
import { resolveAdminFirebaseConfig } from "./config";
import { createAdminRemoteController } from "./controller";
import type { AdminRemoteController } from "./controller";

/** 16 hex chars of non-identifying randomness — no time, no email, no uid (spec 036 §4.2). */
export function createCorrelationId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Defers the SDK import to the first actual call, keeping controller construction synchronous. */
function createLazyFacade(config: AdminFirebaseConfig): AdminFirebaseFacade {
  let pending: Promise<AdminFirebaseFacade> | null = null;
  const facade = (): Promise<AdminFirebaseFacade> => {
    pending ??= createFirebaseAdminFacade(config);
    return pending;
  };
  return {
    setPersistenceLocal: async () => {
      await (await facade()).setPersistenceLocal();
    },
    onAuthStateChanged: (listener) => {
      let stop: (() => void) | null = null;
      let cancelled = false;
      void facade().then((real) => {
        if (cancelled) return;
        stop = real.onAuthStateChanged(listener);
      });
      return () => {
        cancelled = true;
        stop?.();
        stop = null;
      };
    },
    signInWithEmailPassword: async (email, password) => {
      await (await facade()).signInWithEmailPassword(email, password);
    },
    signOut: async () => {
      await (await facade()).signOut();
    },
    readObjectBytes: async (request) => (await facade()).readObjectBytes(request),
  };
}

/**
 * Builds the controller for the current environment. An unconfigured environment yields a
 * controller with no ports at all — the "unconfigured" state is a fact about wiring, not a failure.
 */
export function createAdminRemoteControllerFromEnv(
  env: ImportMetaEnv | Record<string, unknown> | undefined,
): AdminRemoteController {
  const resolution = resolveAdminFirebaseConfig(env);
  if (resolution.status === "unconfigured") {
    return createAdminRemoteController({ createCorrelationId });
  }
  const facade = createLazyFacade(resolution.config);
  const auth = createOperatorAuthPort(facade);
  const read = createAdminStateReadPort({ facade, auth });
  return createAdminRemoteController({ ports: { auth, read }, createCorrelationId });
}
