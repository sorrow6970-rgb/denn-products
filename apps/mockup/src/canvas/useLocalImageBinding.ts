// Thin React wrapper over the framework-free local image binding owner (spec 026 §3).
//
// It adds NO behaviour: the controller keeps every lifecycle rule (generation, revoke-once, binding
// replacement) and this hook only subscribes to its snapshot and disposes it on unmount. Under
// StrictMode the simulated unmount disposes the current controller and hands the remount a fresh
// one, so a disposed controller is never left in use.

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  createLocalImageBindingController,
  type LocalImageBindingController,
  type LocalImageBindingState,
} from "./localImageBinding";
import type { PreviewImageBindings } from "./types";

export interface UseLocalImageBindingResult {
  readonly state: LocalImageBindingState;
  readonly bindings: PreviewImageBindings;
  readonly load: (input: Blob) => void;
  readonly clear: () => void;
}

export function useLocalImageBinding(): UseLocalImageBindingResult {
  const [controller, setController] = useState<LocalImageBindingController>(
    createLocalImageBindingController,
  );

  useEffect(() => {
    return () => {
      controller.dispose();
      // StrictMode remounts this component with the SAME instance, so publish a fresh controller
      // for the next mount. After a real unmount this state update is a no-op.
      setController(() => createLocalImageBindingController());
    };
  }, [controller]);

  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return {
    state,
    bindings: controller.bindings,
    load: controller.load,
    clear: controller.clear,
  };
}
