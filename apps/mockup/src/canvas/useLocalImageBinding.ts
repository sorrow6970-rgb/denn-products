// Thin React wrapper over the framework-free local image binding owner (spec 026 §3).
//
// It adds NO behaviour: the controller keeps every lifecycle rule (generation, revoke-once, binding
// replacement) and this hook only subscribes to its snapshot and disposes it when the OWNER
// component unmounts.
//
// Ownership record (spec 026 보완 라운드 1): the controller is held inside a small record whose
// `disposed` flag is set by the effect cleanup. The replacement controller is published from the
// effect BODY on the next mount — never from the cleanup — so a real unmount performs no state
// update at all, while StrictMode's mount → cleanup → remount still ends up with a live controller.

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

interface OwnedController {
  readonly controller: LocalImageBindingController;
  /** set by the cleanup of the effect that owns this record; read on the next mount only. */
  disposed: boolean;
}

const createOwned = (): OwnedController => ({
  controller: createLocalImageBindingController(),
  disposed: false,
});

export function useLocalImageBinding(): UseLocalImageBindingResult {
  const [owned, setOwned] = useState<OwnedController>(createOwned);
  const { controller } = owned;

  useEffect(() => {
    if (owned.disposed) {
      // StrictMode re-ran this effect with the record its own cleanup already disposed. Publishing
      // the replacement here (during mount) keeps the unmount path free of state updates.
      setOwned(createOwned());
      return;
    }
    return () => {
      owned.controller.dispose();
      owned.disposed = true;
    };
  }, [owned]);

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
