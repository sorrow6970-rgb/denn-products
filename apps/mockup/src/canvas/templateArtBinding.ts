// Template art binding owner (spec 028 §4). Framework-free, no IO at import: the browser image is
// created through an injectable port, exactly like the local image owner (spec 026).
//
// What differs from the local photo owner:
//  - the input is a source STRING that already passed the spec 018 projection and the @denn/firebase
//    trust boundary; this owner never classifies, rewrites or validates a URL itself,
//  - there is no object URL to revoke — instead, a remote source must get `crossOrigin = "anonymous"`
//    BEFORE `src` is assigned, or the decoded image would taint the canvas at print/export time,
//  - a failed anonymous load is NEVER retried without `crossOrigin` (the legacy retry at
//    denn-mockup-tool.html:12138 produces a tainted canvas → a 0x0 print file).
//
// Information boundary: the `src` string stays inside this closure and the real drawable. It is not
// in the public snapshot, not in an error, not in the DOM, not logged, not stored, and never in a
// plan — the plan only ever sees the synthetic `template-art-<generation>` key.

import type { PreviewImageBindings } from "./types";

/** Only the two kinds the trust boundary can approve (spec 018 §4 / @denn/firebase). */
export type TemplateArtSourceKind = "data-image" | "firebase-download-image";

export interface TemplateArtSource {
  readonly kind: TemplateArtSourceKind;
  readonly src: string;
}

/** Identity-free failure codes. A failure never carries a URL, token, source kind or exception. */
export type TemplateArtErrorCode =
  // the source object/string is unusable
  | "INVALID_INPUT"
  // the browser reported an error (a CORS refusal and a broken file are indistinguishable here)
  | "LOAD_FAILED"
  // the image decoded but has no usable natural size
  | "INVALID_DIMENSIONS"
  // the owner was disposed before this load
  | "DISPOSED";

export type TemplateArtBindingState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly imageRef: string }
  | { readonly status: "failed"; readonly code: TemplateArtErrorCode };

/** The only image-element surface this owner touches; a real HTMLImageElement satisfies it. */
export interface TemplateArtElementPort {
  onload: ((...args: never[]) => unknown) | null;
  onerror: ((...args: never[]) => unknown) | null;
  crossOrigin: string | null;
  src: string;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
}

export interface TemplateArtPorts {
  createImage(): TemplateArtElementPort;
}

export interface TemplateArtBindingOptions {
  readonly ports?: TemplateArtPorts;
}

export interface TemplateArtBindingController {
  getSnapshot(): TemplateArtBindingState;
  subscribe(listener: () => void): () => void;
  load(source: TemplateArtSource): void;
  clear(): void;
  dispose(): void;
  readonly bindings: PreviewImageBindings;
}

const IDLE: TemplateArtBindingState = { status: "idle" };
const LOADING: TemplateArtBindingState = { status: "loading" };

const isFinitePositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** Default port. Reads the browser global only when CALLED, never at import. */
function browserPorts(): TemplateArtPorts {
  return { createImage: () => new Image() as unknown as TemplateArtElementPort };
}

interface PendingArt {
  readonly generation: number;
  readonly element: TemplateArtElementPort;
}

/**
 * Create a template art owner. One load at a time, generation-guarded, with NO cache: a new
 * selection disposes this owner and the next one starts from `idle`, so a source string never
 * outlives the owner that needed it (spec 028 §4).
 */
export function createTemplateArtBindingController(
  options?: TemplateArtBindingOptions,
): TemplateArtBindingController {
  const ports = options?.ports ?? browserPorts();

  let state: TemplateArtBindingState = IDLE;
  let disposed = false;
  let generation = 0;
  let pending: PendingArt | null = null;
  let ready: { readonly imageRef: string; readonly drawable: unknown } | null = null;
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // a subscriber must never break the owner, and this module prints nothing
      }
    }
  };

  const setState = (next: TemplateArtBindingState): void => {
    state = next;
    notify();
  };

  const detach = (record: PendingArt): void => {
    try {
      record.element.onload = null;
      record.element.onerror = null;
    } catch {
      // hostile setter
    }
  };

  const cancelPending = (): void => {
    if (pending === null) return;
    const record = pending;
    pending = null;
    detach(record);
  };

  const load = (source: TemplateArtSource): void => {
    if (disposed) {
      state = { status: "failed", code: "DISPOSED" };
      return;
    }

    generation += 1;
    const current = generation;
    cancelPending();
    ready = null;

    if (source === null || typeof source !== "object") {
      setState({ status: "failed", code: "INVALID_INPUT" });
      return;
    }
    const kind = source.kind;
    const src = source.src;
    if (kind !== "data-image" && kind !== "firebase-download-image") {
      setState({ status: "failed", code: "INVALID_INPUT" });
      return;
    }
    if (typeof src !== "string" || src.length === 0) {
      setState({ status: "failed", code: "INVALID_INPUT" });
      return;
    }

    let element: TemplateArtElementPort;
    try {
      element = ports.createImage();
    } catch {
      setState({ status: "failed", code: "LOAD_FAILED" });
      return;
    }

    const record: PendingArt = { generation: current, element };
    pending = record;
    setState(LOADING);

    const settle = (next: TemplateArtBindingState): void => {
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
        if (!isFinitePositive(width) || !isFinitePositive(height)) {
          settle({ status: "failed", code: "INVALID_DIMENSIONS" });
          return;
        }
        const imageRef = `template-art-${record.generation}`;
        ready = { imageRef, drawable: record.element };
        settle({ status: "ready", imageRef });
      };
      element.onerror = (): void => {
        // A CORS refusal and a broken/missing file are indistinguishable to a page, and this owner
        // does NOT retry without crossOrigin. One safe code closes both.
        settle({ status: "failed", code: "LOAD_FAILED" });
      };
      // crossOrigin MUST be set before src: setting it afterwards has no effect on the request.
      // A `data:` source is same-origin by construction and gets no crossOrigin attribute.
      if (kind === "firebase-download-image") element.crossOrigin = "anonymous";
      element.src = src;
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
      // whatever the port produced: a real HTMLImageElement in the browser, a stand-in in unit tests
      return ready.drawable as CanvasImageSource;
    },
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load,
    clear,
    dispose,
    bindings,
  };
}
