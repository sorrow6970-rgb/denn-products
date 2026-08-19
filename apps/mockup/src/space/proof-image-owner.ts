import type { PreviewImageBindings } from "../canvas/types";
import { resolveSpaceProofImageUrl } from "./proof-image";

export type SpaceProofImageOwnerErrorCode =
  | "INVALID_INPUT"
  | "LOAD_FAILED"
  | "INVALID_DIMENSIONS"
  | "DISPOSED";

export type SpaceProofImageOwnerState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly imageRef: string;
      readonly intrinsicSize: { readonly width: number; readonly height: number };
    }
  | { readonly status: "failed"; readonly code: SpaceProofImageOwnerErrorCode };

export interface SpaceProofImageElementPort {
  onload: ((...args: never[]) => unknown) | null;
  onerror: ((...args: never[]) => unknown) | null;
  crossOrigin: string | null;
  src: string;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
}

export interface SpaceProofImageOwnerPorts {
  createImage(): SpaceProofImageElementPort;
}

export interface SpaceProofImageOwnerOptions {
  readonly ports?: SpaceProofImageOwnerPorts;
}

export interface SpaceProofImageOwner {
  getSnapshot(): SpaceProofImageOwnerState;
  subscribe(listener: () => void): () => void;
  load(source: unknown): void;
  clear(): void;
  dispose(): void;
  readonly bindings: PreviewImageBindings;
}

const IDLE: SpaceProofImageOwnerState = { status: "idle" };
const LOADING: SpaceProofImageOwnerState = { status: "loading" };

const defaultPorts = (): SpaceProofImageOwnerPorts => ({
  createImage: () => new Image() as unknown as SpaceProofImageElementPort,
});

const positiveFinite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

interface PendingImage {
  readonly generation: number;
  readonly element: SpaceProofImageElementPort;
}

export function createSpaceProofImageOwner(
  options?: SpaceProofImageOwnerOptions,
): SpaceProofImageOwner {
  let ports: SpaceProofImageOwnerPorts;
  try {
    ports = options?.ports ?? defaultPorts();
  } catch {
    ports = {
      createImage: () => {
        throw new Error("invalid ports");
      },
    };
  }

  let state: SpaceProofImageOwnerState = IDLE;
  let disposed = false;
  let generation = 0;
  let pending: PendingImage | null = null;
  let ready: { readonly imageRef: string; readonly drawable: unknown } | null = null;
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Subscribers cannot break owner state or other subscribers.
      }
    }
  };

  const setState = (next: SpaceProofImageOwnerState): void => {
    state = next;
    notify();
  };

  const detach = (record: PendingImage): void => {
    try {
      record.element.onload = null;
      record.element.onerror = null;
    } catch {
      // A hostile element cannot make lifecycle methods throw.
    }
  };

  const cancelPending = (): void => {
    if (pending === null) return;
    const record = pending;
    pending = null;
    detach(record);
  };

  const load = (source: unknown): void => {
    if (disposed) {
      state = { status: "failed", code: "DISPOSED" };
      return;
    }

    generation += 1;
    const current = generation;
    cancelPending();
    ready = null;

    const resolved = resolveSpaceProofImageUrl(source);
    if (!resolved.ok) {
      setState({ status: "failed", code: "INVALID_INPUT" });
      return;
    }

    let element: SpaceProofImageElementPort;
    try {
      element = ports.createImage();
    } catch {
      setState({ status: "failed", code: "LOAD_FAILED" });
      return;
    }
    const record: PendingImage = { generation: current, element };
    pending = record;
    setState(LOADING);

    const settle = (next: SpaceProofImageOwnerState): void => {
      if (disposed || record.generation !== generation) return;
      pending = null;
      detach(record);
      setState(next);
    };

    try {
      element.onload = (): void => {
        if (disposed || record.generation !== generation) return;
        let width: unknown;
        let height: unknown;
        try {
          width = record.element.naturalWidth;
          height = record.element.naturalHeight;
        } catch {
          settle({ status: "failed", code: "LOAD_FAILED" });
          return;
        }
        if (!positiveFinite(width) || !positiveFinite(height)) {
          settle({ status: "failed", code: "INVALID_DIMENSIONS" });
          return;
        }
        const imageRef = `space-proof-${record.generation}`;
        ready = { imageRef, drawable: record.element };
        settle({
          status: "ready",
          imageRef,
          intrinsicSize: { width, height },
        });
      };
      element.onerror = (): void => {
        settle({ status: "failed", code: "LOAD_FAILED" });
      };
      element.crossOrigin = "anonymous";
      element.src = resolved.value.src;
    } catch {
      pending = null;
      detach(record);
      setState({ status: "failed", code: "LOAD_FAILED" });
    }
  };

  const clear = (): void => {
    if (disposed) return;
    generation += 1;
    cancelPending();
    ready = null;
    setState(IDLE);
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    generation += 1;
    cancelPending();
    ready = null;
    listeners.clear();
  };

  const bindings: PreviewImageBindings = {
    get: (imageRef: string): CanvasImageSource | undefined => {
      if (ready === null || ready.imageRef !== imageRef) return undefined;
      return ready.drawable as CanvasImageSource;
    },
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      if (disposed || typeof listener !== "function") return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    clear,
    dispose,
    bindings,
  };
}
