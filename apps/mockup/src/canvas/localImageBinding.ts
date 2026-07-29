// Local user image binding owner (spec 026). Framework-free, synchronous API, no React/DOM at
// import time: every browser call goes through injectable ports, and the default ports read
// `URL.createObjectURL` / `URL.revokeObjectURL` / `Image` only when they are CALLED.
//
// What this module owns (and nothing else owns): the private blob URL, the decoded drawable, the
// generation that invalidates a superseded load, and the `imageRef → drawable` binding the spec 021
// executor reads. Colour, logical width, zone assignment, pointer transforms and the customer screen
// are deliberately NOT here.
//
// Information boundary (spec 026 §4): the blob URL, the `Blob`, the file name and the MIME string
// never leave this closure — they are not in the public snapshot, not in an error, not in the DOM,
// not logged and not stored. A failure carries a fixed code only, and the public state carries only
// a synthetic `imageRef`, the intrinsic size and the fixed initial transform.

import type { PreviewImageBindings } from "./types";

/** Fixed, identity-free failure codes. Never a URL, file name, MIME string or exception. */
export type LocalImageBindingErrorCode =
  // the input is not a usable Blob (or the object URL port refused it)
  | "INVALID_INPUT"
  // the browser reported a load error, or the element/port threw while decoding
  | "DECODE_FAILED"
  // decode succeeded but the natural size is not a finite positive pair
  | "INVALID_DIMENSIONS"
  // the controller was disposed before this load
  | "DISPOSED";

/** The safe, public description of the loaded image (spec 025 `UserImageState` shape). */
export interface LocalUserImageState {
  /** synthetic key only — never a file name, URL, token or path. */
  readonly imageRef: string;
  readonly intrinsicSize: { readonly width: number; readonly height: number };
  /** fixed by this spec; pointer pan/zoom is a later spec. */
  readonly transform: { readonly scale: 1; readonly x: 0; readonly y: 0 };
}

export type LocalImageBindingState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly imageState: LocalUserImageState }
  | { readonly status: "failed"; readonly code: LocalImageBindingErrorCode };

/**
 * The only image-element surface this owner touches. A real `HTMLImageElement` satisfies it
 * structurally (pinned by a compile-time check in the unit test), and a unit-test fake can drive
 * `onload`/`onerror` deterministically with no DOM.
 */
export interface LocalImageElementPort {
  onload: ((...args: never[]) => unknown) | null;
  onerror: ((...args: never[]) => unknown) | null;
  src: string;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
}

export interface LocalImageBindingPorts {
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  createImage(): LocalImageElementPort;
}

export interface LocalImageBindingOptions {
  readonly ports?: LocalImageBindingPorts;
}

export interface LocalImageBindingController {
  /** Stable reference until the state actually changes (safe for `useSyncExternalStore`). */
  getSnapshot(): LocalImageBindingState;
  subscribe(listener: () => void): () => void;
  load(input: Blob): void;
  clear(): void;
  dispose(): void;
  /** `imageRef` → drawable lookup for the spec 021 executor. Empty unless the state is `ready`. */
  readonly bindings: PreviewImageBindings;
}

const IDLE: LocalImageBindingState = { status: "idle" };
const LOADING: LocalImageBindingState = { status: "loading" };

const isFinitePositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * Default browser ports. Constructing this object touches NO browser API — the globals are read
 * inside the port bodies, i.e. on the first `load()` (spec 026 §구현 요구사항 2).
 */
function browserPorts(): LocalImageBindingPorts {
  return {
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    createImage: () => new Image() as unknown as LocalImageElementPort,
  };
}

interface PendingLoad {
  readonly generation: number;
  readonly url: string;
  readonly element: LocalImageElementPort;
  revoked: boolean;
}

/**
 * Create a controller that owns exactly one in-flight load and at most one ready drawable.
 *
 * Lifecycle guarantees (spec 026 §5): every `load` bumps a generation, a superseded load has its
 * handlers detached and its URL revoked EXACTLY once, a late completion of a superseded load can
 * change neither the snapshot nor the binding, and `clear`/`dispose` reclaim the pending handler,
 * the URL, the binding and (for `dispose`) the listeners. Nothing here throws on a normal path, and
 * a hostile port or accessor closes as a safe, identity-free failure.
 */
export function createLocalImageBindingController(
  options?: LocalImageBindingOptions,
): LocalImageBindingController {
  const ports = options?.ports ?? browserPorts();

  let state: LocalImageBindingState = IDLE;
  let disposed = false;
  let generation = 0;
  let sequence = 0;
  let pending: PendingLoad | null = null;
  let ready: { readonly imageRef: string; readonly drawable: unknown } | null = null;
  const listeners = new Set<() => void>();

  const notify = (): void => {
    // a copy: a listener may unsubscribe (or subscribe) while being notified
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // a subscriber must never break the owner, and this module prints nothing
      }
    }
  };

  const setState = (next: LocalImageBindingState): void => {
    state = next;
    notify();
  };

  const revokeOnce = (record: PendingLoad): void => {
    if (record.revoked) return;
    record.revoked = true;
    try {
      ports.revokeObjectUrl(record.url);
    } catch {
      // a hostile/failing revoke port is not a product failure; the URL is already unreachable
    }
  };

  const detach = (record: PendingLoad): void => {
    try {
      record.element.onload = null;
      record.element.onerror = null;
    } catch {
      // hostile setter
    }
  };

  /** Drop the in-flight load: handlers off, URL revoked exactly once. */
  const cancelPending = (): void => {
    if (pending === null) return;
    const record = pending;
    pending = null;
    detach(record);
    revokeOnce(record);
  };

  const load = (input: Blob): void => {
    if (disposed) {
      // no listeners remain after dispose, so this only closes the snapshot
      state = { status: "failed", code: "DISPOSED" };
      return;
    }

    // a new load invalidates the previous one AND the previous binding (never re-queried later)
    generation += 1;
    const current = generation;
    cancelPending();
    ready = null;

    if (input === null || typeof input !== "object") {
      setState({ status: "failed", code: "INVALID_INPUT" });
      return;
    }

    let url: string;
    try {
      url = ports.createObjectUrl(input);
    } catch {
      setState({ status: "failed", code: "INVALID_INPUT" });
      return;
    }
    if (typeof url !== "string" || url.length === 0) {
      setState({ status: "failed", code: "INVALID_INPUT" });
      return;
    }

    let element: LocalImageElementPort;
    try {
      element = ports.createImage();
    } catch {
      try {
        ports.revokeObjectUrl(url);
      } catch {
        // see revokeOnce
      }
      setState({ status: "failed", code: "DECODE_FAILED" });
      return;
    }

    const record: PendingLoad = { generation: current, url, element, revoked: false };
    pending = record;
    setState(LOADING);

    /** Finish THIS load, unless it was superseded or disposed in the meantime. */
    const settle = (next: LocalImageBindingState): void => {
      if (disposed || record.generation !== generation) return;
      pending = null;
      detach(record);
      revokeOnce(record);
      setState(next);
    };

    try {
      element.onload = (): void => {
        if (disposed || record.generation !== generation) return;
        let width: unknown;
        let height: unknown;
        try {
          // read the natural size BEFORE the URL is revoked; a hostile accessor closes as a failure
          width = record.element.naturalWidth;
          height = record.element.naturalHeight;
        } catch {
          settle({ status: "failed", code: "DECODE_FAILED" });
          return;
        }
        if (!isFinitePositive(width) || !isFinitePositive(height)) {
          settle({ status: "failed", code: "INVALID_DIMENSIONS" });
          return;
        }
        sequence += 1;
        const imageRef = `user-image-${sequence}`;
        ready = { imageRef, drawable: record.element };
        settle({
          status: "ready",
          imageState: {
            imageRef,
            intrinsicSize: { width, height },
            transform: { scale: 1, x: 0, y: 0 },
          },
        });
      };
      element.onerror = (): void => {
        settle({ status: "failed", code: "DECODE_FAILED" });
      };
      // assigning src starts the decode; the URL never leaves this closure
      element.src = url;
    } catch {
      pending = null;
      detach(record);
      revokeOnce(record);
      setState({ status: "failed", code: "DECODE_FAILED" });
    }
  };

  const clear = (): void => {
    if (disposed) return;
    generation += 1; // invalidate an in-flight load
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
      // Whatever the port produced: a real HTMLImageElement in the browser (which IS a
      // CanvasImageSource) or a structural stand-in in unit tests. Only the executor's drawImage
      // ever touches it; this module never reads it as a URL.
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
