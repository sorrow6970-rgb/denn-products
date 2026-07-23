import type { PublicCatalogReader } from "@denn/firebase";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { PublicCatalogController } from "./controller";
import type { PublicCatalogUiState } from "./types";

/**
 * Wire the framework-free controller to React (spec 015). The controller is created once per
 * component instance (useRef); the reader is the module singleton. On mount the initial load
 * starts; on unmount the current caller is aborted. Under StrictMode the effect runs
 * mount→cleanup→mount on the same instance — the reader's in-flight dedup + the controller's
 * generation guard keep the underlying fetch to exactly one and drop stale results.
 */
export function usePublicCatalog(reader: PublicCatalogReader): {
  state: PublicCatalogUiState;
  retry: () => void;
} {
  const ref = useRef<PublicCatalogController | null>(null);
  if (ref.current === null) ref.current = new PublicCatalogController(reader);
  const controller = ref.current;

  const state = useSyncExternalStore(controller.subscribe, controller.getState);

  useEffect(() => {
    controller.start();
    return () => {
      controller.detach();
    };
  }, [controller]);

  return { state, retry: controller.retry };
}
