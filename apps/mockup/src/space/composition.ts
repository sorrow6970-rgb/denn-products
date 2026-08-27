import {
  createFirebaseSpaceReadFacade,
  createFirebaseSpaceV2ProofReadFacade,
  createSpaceDocumentReadPort,
  createSpaceV2ProofBytesReader,
  type SpaceDocumentReadPort,
  type SpaceDocumentReadResult,
  type SpaceReadFirebaseConfig,
  type SpaceReadFirebaseFacade,
  type SpaceV2ProofReadFirebaseFacade,
} from "@denn/firebase/space-read";
import {
  createSpaceOpenPort,
  createSpaceV2OpenPort,
  type SpaceOpenPort,
  type SpaceSha256Port,
} from "@denn/spaces";
import { createSpaceV2ProofDecoderOwner } from "../space-v2/browser-png-decoder";
import {
  type SpaceV2ReplayBundle,
  type SpaceV2ReplayFactory,
  SpaceVersionedViewController,
} from "../space-v2/production-controller";
import { createSpaceV2FrameReplayController } from "../space-v2/replay-controller";
import { resolveSpaceFirebaseConfig } from "./config";

export interface SpaceCompositionDependencies {
  readonly createFacade?: (config: SpaceReadFirebaseConfig) => Promise<SpaceReadFirebaseFacade>;
  readonly opener?: SpaceOpenPort;
  readonly createProofFacade?: (
    config: SpaceReadFirebaseConfig,
  ) => Promise<SpaceV2ProofReadFirebaseFacade>;
  readonly createV2Replay?: SpaceV2ReplayFactory;
}

function unavailable(correlationId: string): SpaceDocumentReadResult {
  return {
    ok: false,
    error: { code: "SPACE_READ_FORBIDDEN", retryable: false, correlationId },
  };
}

/**
 * Building this object touches no browser API; `crypto.subtle` is read only when a V2 payload
 * actually reaches the digest step.
 */
const webCryptoSha256: SpaceSha256Port = {
  async digest(bytes) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
    return new Uint8Array(digest);
  },
};

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

/**
 * The V2 side, built at most once and ONLY when a `space-v2` document has already been read. Until
 * then nothing here runs: no Storage service, no Blob, no Image, no Canvas binding. The proof
 * reader reuses the same resolved config as the document reader, so both share the one
 * `denn-space-viewer` named app rather than owning two Firebase apps with drifting options.
 */
export function createLazySpaceV2Replay(
  env: ImportMetaEnv | Record<string, unknown> | undefined,
  createProofFacade: (
    config: SpaceReadFirebaseConfig,
  ) => Promise<SpaceV2ProofReadFirebaseFacade> = createFirebaseSpaceV2ProofReadFacade,
): SpaceV2ReplayFactory {
  const resolution = resolveSpaceFirebaseConfig(env);
  let bundlePromise: Promise<SpaceV2ReplayBundle> | null = null;

  return async () => {
    if (resolution.status !== "configured") return null;
    bundlePromise ??= (async () => {
      const facade = await createProofFacade(resolution.config);
      const owner = createSpaceV2ProofDecoderOwner();
      return {
        controller: createSpaceV2FrameReplayController({
          opener: createSpaceV2OpenPort(),
          proof: createSpaceV2ProofBytesReader(facade),
          sha256: webCryptoSha256,
          decoder: owner.decoder,
        }),
        imageBindings: owner.bindings,
        clear: owner.clear,
      };
    })();
    try {
      return await bundlePromise;
    } catch {
      // Fails closed as "cannot display", never as a silent V1 fallback.
      return null;
    }
  };
}

export function createSpaceProductionController(
  search: unknown,
  env: ImportMetaEnv | Record<string, unknown> | undefined,
  dependencies: SpaceCompositionDependencies = {},
): SpaceVersionedViewController {
  return new SpaceVersionedViewController(
    search,
    createLazySpaceDocumentReader(env, dependencies.createFacade),
    dependencies.opener ?? createSpaceOpenPort(),
    dependencies.createV2Replay ?? createLazySpaceV2Replay(env, dependencies.createProofFacade),
  );
}
