import { useEffect, useState, useSyncExternalStore } from "react";
import {
  createSourceBoundReadinessController,
  type SourceBoundReadinessController,
  type SourceBoundReadinessSnapshot,
} from "./source-bound-readiness";

export type SourceBoundReadinessFactory = () => SourceBoundReadinessController;

export interface UseSourceBoundReadinessResult {
  readonly controller: SourceBoundReadinessController;
  readonly snapshot: SourceBoundReadinessSnapshot;
}

const INERT_CONTROLLER: SourceBoundReadinessController = {
  getSnapshot: () => ({ status: "disposed" }),
  subscribe: () => () => undefined,
  loadProof: () => undefined,
  clearProof: () => undefined,
  loadTemplateArt: () => undefined,
  clearTemplateArt: () => undefined,
  dispose: () => undefined,
  proofResolver: { resolve: () => ({ ok: false }) },
  templateArtResolver: { resolve: () => ({ ok: false }) },
  bindings: { get: () => undefined },
};

/**
 * React ownership for the source-bound proof/art controller. The render initializer is inert, so
 * StrictMode may call it twice without creating an owner. Each effect setup creates exactly the
 * controller its matching cleanup disposes; the replay's second setup publishes a fresh live one.
 */
export function useSourceBoundReadiness(
  factory: SourceBoundReadinessFactory = createSourceBoundReadinessController,
): UseSourceBoundReadinessResult {
  const [controller, setController] = useState<SourceBoundReadinessController>(INERT_CONTROLLER);

  useEffect(() => {
    const owned = factory();
    setController(owned);
    return () => {
      owned.dispose();
    };
  }, [factory]);

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return { controller, snapshot };
}
