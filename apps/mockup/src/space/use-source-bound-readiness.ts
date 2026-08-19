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

interface OwnedController {
  readonly controller: SourceBoundReadinessController;
  disposed: boolean;
}

const createOwned = (factory: SourceBoundReadinessFactory): OwnedController => ({
  controller: factory(),
  disposed: false,
});

/**
 * React ownership for the source-bound proof/art controller. Cleanup permanently disposes the
 * current controller; a StrictMode effect replay publishes a new live owner from the next effect
 * body, never from cleanup.
 */
export function useSourceBoundReadiness(
  factory: SourceBoundReadinessFactory = createSourceBoundReadinessController,
): UseSourceBoundReadinessResult {
  const [owned, setOwned] = useState<OwnedController>(() => createOwned(factory));
  const { controller } = owned;

  useEffect(() => {
    if (owned.disposed) {
      setOwned(createOwned(factory));
      return;
    }
    return () => {
      owned.controller.dispose();
      owned.disposed = true;
    };
  }, [factory, owned]);

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return { controller, snapshot };
}
