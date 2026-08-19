import {
  createFirebaseSpaceReadFacade,
  createSpaceDocumentReadPort,
  type SpaceDocumentReadPort,
  type SpaceDocumentReadResult,
  type SpaceReadFirebaseConfig,
  type SpaceReadFirebaseFacade,
} from "@denn/firebase/space-read";
import { createSpaceOpenPort, type SpaceOpenPort } from "@denn/spaces";
import { resolveSpaceFirebaseConfig } from "./config";
import { SpaceLinkOpenController } from "./controller";

export interface SpaceCompositionDependencies {
  readonly createFacade?: (config: SpaceReadFirebaseConfig) => Promise<SpaceReadFirebaseFacade>;
  readonly opener?: SpaceOpenPort;
}

function unavailable(correlationId: string): SpaceDocumentReadResult {
  return {
    ok: false,
    error: { code: "SPACE_READ_FORBIDDEN", retryable: false, correlationId },
  };
}

export function createLazySpaceDocumentReader(
  env: ImportMetaEnv | Record<string, unknown> | undefined,
  createFacade: (
    config: SpaceReadFirebaseConfig,
  ) => Promise<SpaceReadFirebaseFacade> = createFirebaseSpaceReadFacade,
): SpaceDocumentReadPort {
  const resolution = resolveSpaceFirebaseConfig(env);
  let readerPromise: Promise<SpaceDocumentReadPort> | null = null;

  return {
    async load(request) {
      const correlationId = typeof request?.correlationId === "string" ? request.correlationId : "";
      if (resolution.status !== "configured") return unavailable(correlationId);
      readerPromise ??= createFacade(resolution.config).then(createSpaceDocumentReadPort);
      try {
        const reader = await readerPromise;
        return await reader.load(request);
      } catch {
        return {
          ok: false,
          error: { code: "SPACE_READ_UNEXPECTED", retryable: false, correlationId },
        };
      }
    },
  };
}

export function createSpaceProductionController(
  search: unknown,
  env: ImportMetaEnv | Record<string, unknown> | undefined,
  dependencies: SpaceCompositionDependencies = {},
): SpaceLinkOpenController {
  return new SpaceLinkOpenController(
    search,
    createLazySpaceDocumentReader(env, dependencies.createFacade),
    dependencies.opener ?? createSpaceOpenPort(),
  );
}
