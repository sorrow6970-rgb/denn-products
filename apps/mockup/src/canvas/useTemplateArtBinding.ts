// Thin React wrapper over the template art owner (spec 028 §4), identical in shape to the local
// image wrapper (spec 026): it adds no behaviour, subscribes to the snapshot, and disposes the
// controller when the owning component unmounts. The replacement controller is published from the
// effect BODY on the next mount, so a real unmount performs no state update.

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  createTemplateArtBindingController,
  type TemplateArtBindingController,
  type TemplateArtBindingState,
  type TemplateArtSource,
} from "./templateArtBinding";
import type { PreviewImageBindings } from "./types";

export interface UseTemplateArtBindingResult {
  readonly state: TemplateArtBindingState;
  readonly bindings: PreviewImageBindings;
  readonly load: (source: TemplateArtSource) => void;
  readonly clear: () => void;
}

interface OwnedController {
  readonly controller: TemplateArtBindingController;
  disposed: boolean;
}

const createOwned = (): OwnedController => ({
  controller: createTemplateArtBindingController(),
  disposed: false,
});

export function useTemplateArtBinding(): UseTemplateArtBindingResult {
  const [owned, setOwned] = useState<OwnedController>(createOwned);
  const { controller } = owned;

  useEffect(() => {
    if (owned.disposed) {
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
