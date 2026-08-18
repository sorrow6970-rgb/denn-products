import {
  createAdminStateReadPort,
  createOperatorAuthPort,
  type AdminFirebaseConfig,
  type AdminFirebaseFacade,
  type AdminStateReadPort,
  type OperatorAuthPort,
} from "@denn/firebase/admin-read";
import type {
  AdminStateBaselineResult,
  AdminStateSaveResult,
  AdminStateWritePort,
} from "@denn/firebase/admin-write";
import { createLazyFacade, createCorrelationId } from "../admin-read/create";
import { resolveAdminFirebaseConfig, resolveAdminWriteEnabled } from "../admin-read/config";
import { createAdminRemoteController } from "../admin-read/controller";
import type { AdminRemoteController } from "../admin-read/controller";
import { createAdminWriteSessionController } from "../admin-write/session-controller";
import type { AdminWriteSessionController } from "../admin-write/session-controller";

type WritePortFactory = (options: {
  readonly config: AdminFirebaseConfig;
  readonly auth: OperatorAuthPort;
  readonly legacyRead: AdminStateReadPort;
}) => Promise<AdminStateWritePort>;

export interface AdminOperatorCompositionDependencies {
  readonly makeReadFacade?: (config: AdminFirebaseConfig) => Promise<AdminFirebaseFacade>;
  readonly makeWritePort?: WritePortFactory;
  readonly createCorrelationId?: () => string;
}

export interface AdminOperatorComposition {
  readonly remoteController: AdminRemoteController;
  readonly writeController: AdminWriteSessionController | null;
  dispose(): void;
}

const unexpectedLoad = (correlationId: string): AdminStateBaselineResult => ({
  ok: false,
  error: {
    category: "UNKNOWN",
    code: "UNEXPECTED_ADMIN_READ_ERROR",
    retryable: false,
    correlationId,
  },
});

const invalidSave = (correlationId: string): AdminStateSaveResult => ({
  ok: false,
  error: {
    category: "VALIDATION",
    code: "WRITE_INVALID_INPUT",
    retryable: false,
    correlationId,
  },
});

/**
 * Holds no SDK object until the first explicit baseline load. A failed construction is not cached:
 * only another explicit user load can trigger another attempt. A successful port is fixed for the
 * exact load→save lifetime so its F-D baseline provenance cannot drift.
 */
export function createLazyAdminStateWritePort(
  factory: () => Promise<AdminStateWritePort>,
): AdminStateWritePort {
  let ready: AdminStateWritePort | null = null;
  let pending: Promise<AdminStateWritePort> | null = null;

  const acquire = (): Promise<AdminStateWritePort> => {
    if (ready !== null) return Promise.resolve(ready);
    pending ??= factory().then(
      (port) => {
        ready = port;
        pending = null;
        return port;
      },
      (error: unknown) => {
        pending = null;
        throw error;
      },
    );
    return pending;
  };

  return {
    loadBaseline: async (request) => {
      try {
        return await (await acquire()).loadBaseline(request);
      } catch {
        return unexpectedLoad(request.correlationId);
      }
    },
    save: async (request) => {
      // A successful baseline load always creates `ready`; bypassing it must fail without creating
      // an adapter or guessing whether any remote write happened.
      if (ready === null) return invalidSave(request.correlationId);
      try {
        return await ready.save(request);
      } catch {
        return {
          ok: false,
          error: {
            category: "UNKNOWN",
            code: "WRITE_COMMIT_OUTCOME_UNKNOWN",
            retryable: false,
            correlationId: request.correlationId,
          },
        };
      }
    },
  };
}

const makeProductionWritePort: WritePortFactory = async ({ config, auth, legacyRead }) => {
  const module = await import("@denn/firebase/admin-write");
  const facade = await module.createFirebaseAdminWriteFacade(config);
  return module.createAdminStateWritePort({ facade, auth, legacyRead });
};

export function createAdminOperatorCompositionFromEnv(
  env: ImportMetaEnv | Record<string, unknown> | undefined,
  dependencies: AdminOperatorCompositionDependencies = {},
): AdminOperatorComposition {
  const correlationId = dependencies.createCorrelationId ?? createCorrelationId;
  const resolution = resolveAdminFirebaseConfig(env);
  if (resolution.status === "unconfigured") {
    const remoteController = createAdminRemoteController({ createCorrelationId: correlationId });
    return { remoteController, writeController: null, dispose: () => remoteController.dispose() };
  }

  const facade = dependencies.makeReadFacade
    ? createLazyFacade(resolution.config, dependencies.makeReadFacade)
    : createLazyFacade(resolution.config);
  const auth = createOperatorAuthPort(facade);
  const legacyRead = createAdminStateReadPort({ facade, auth });
  const remoteController = createAdminRemoteController({
    ports: { auth, read: legacyRead },
    createCorrelationId: correlationId,
  });

  if (!resolveAdminWriteEnabled(env, resolution)) {
    return { remoteController, writeController: null, dispose: () => remoteController.dispose() };
  }

  const makeWritePort = dependencies.makeWritePort ?? makeProductionWritePort;
  const lazyWrite = createLazyAdminStateWritePort(() =>
    makeWritePort({ config: resolution.config, auth, legacyRead }),
  );
  const writeController = createAdminWriteSessionController({
    auth,
    write: lazyWrite,
    createCorrelationId: correlationId,
  });
  let disposed = false;
  return {
    remoteController,
    writeController,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      writeController.dispose();
      remoteController.dispose();
    },
  };
}
