// React wiring for the preview Canvas surface (spec 022 §5). The element, its ResizeObserver and
// its pending rAF are owned by ONE React 19 callback ref with a cleanup return — no second effect
// re-creates the observer, so StrictMode's mount→cleanup→mount leaves exactly one active owner.
//
// The callback ref identity is stable (useCallback with an empty dep list), so a re-render never
// detaches/re-attaches the element. The latest plan/bindings are handed to the engine through a ref
// and read at DRAW time, which is also why a stale frame can never overwrite a newer plan.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPreviewSurface,
  type PreviewSurface,
  type PreviewSurfaceSnapshot,
  type PreviewSurfaceState,
} from "./surface";

export function usePreviewCanvasSurface(snapshot: PreviewSurfaceSnapshot): {
  ref: (element: HTMLCanvasElement | null) => (() => void) | undefined;
  state: PreviewSurfaceState;
} {
  const [state, setState] = useState<PreviewSurfaceState>("waiting-for-size");
  // Initialised with the first snapshot so the very first attach (refs run before effects) already
  // draws the right plan; later identities are published by the effect below.
  const snapshotRef = useRef(snapshot);
  const surfaceRef = useRef<PreviewSurface | null>(null);

  const ref = useCallback((element: HTMLCanvasElement | null) => {
    if (element === null) return;
    // Content-box size from the observer entry when available; the bounding rect covers the very
    // first draw (canvas carries no padding/border, so the two agree).
    let observed: { width: number; height: number } | null = null;

    const surface = createPreviewSurface({
      canvas: element,
      getSnapshot: () => snapshotRef.current,
      measure: () => {
        if (observed !== null) return observed;
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      },
      getDevicePixelRatio: () => window.devicePixelRatio,
      schedule: (callback) => window.requestAnimationFrame(callback),
      cancel: (handle) => window.cancelAnimationFrame(handle),
      observe: (onResize) => {
        const observer = new ResizeObserver((entries) => {
          const entry = entries[entries.length - 1];
          const box = entry?.contentBoxSize?.[0];
          if (box) observed = { width: box.inlineSize, height: box.blockSize };
          else if (entry)
            observed = { width: entry.contentRect.width, height: entry.contentRect.height };
          onResize();
        });
        observer.observe(element);
        return () => observer.disconnect();
      },
      onState: setState,
    });

    surfaceRef.current = surface;
    surface.requestDraw();

    return () => {
      surface.dispose();
      if (surfaceRef.current === surface) surfaceRef.current = null;
    };
  }, []);

  // A new plan / binding identity publishes the snapshot and draws again on the CURRENT owner; it
  // never rebuilds the observer or re-attaches the element.
  const { plan, imageBindings } = snapshot;
  useEffect(() => {
    snapshotRef.current = { plan, imageBindings };
    surfaceRef.current?.requestDraw();
  }, [plan, imageBindings]);

  return { ref, state };
}
