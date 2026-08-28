// PNG-only local proof owner for the admin Space V2 issue panel (spec 083 §3).
//
// One question decides this module's whole shape: WHOSE bytes get issued. The operator picks a file,
// the panel previews it, and later a frozen draft uploads it — if those were three separate reads of
// the same `File`, a file swapped on disk between them would preview one image and issue another. So
// the bytes are copied ONCE into a private array, the preview draws that copy, and `freeze()` hands
// out a handle carrying its own copy: what was previewed is structurally what gets exported.
//
// Information boundary (spec 083 §3): the file name, the blob URL, the Blob and the caller's MIME
// string never leave this closure. They are not in the snapshot, not in a failure, not in the DOM
// and not logged. The public state carries a fixed status, a synthetic `imageRef`, the intrinsic
// size, and the `imageRef → drawable` binding the Canvas executor reads — nothing else.
//
// The MIME is not evidence. The file's own type and extension are never trusted: the bytes are
// wrapped in a Blob whose type this module FIXES to `image/png`, so anything the browser cannot
// decode as a PNG fails here. The real PNG signature and descriptor checks stay where they already
// are (specs 066/068), on the issue path.
//
// No React, no import-time browser access: every global is read inside a port body.

import type { PreviewImageBindings } from "@denn/render";

/**
 * The asset contract this owner has to agree with, stated locally.
 *
 * Importing them from `@denn/firebase/space-write` would pull that whole barrel — the write facade
 * and the write port — into the admin's eager entry chunk for two constants, which is exactly the
 * lazy-SDK boundary specs 079/080 draw. So they are declared here and a unit test asserts they still
 * equal the package's `SPACE_V2_ASSET_CONTENT_TYPE` / `SPACE_V2_ASSET_MAX_BYTES`; a drift fails
 * there rather than silently accepting a file the issue path would reject.
 */
const PROOF_CONTENT_TYPE = "image/png";
const PROOF_MAX_BYTES = 20 * 1024 * 1024 - 1;

/** Fixed, identity-free failure codes. Never a file name, URL, MIME string, size or exception. */
export type AdminProofDraftErrorCode =
  // the input is not a readable file-like value, or reading its bytes threw
  | "ADMIN_PROOF_READ_FAILED"
  // zero bytes, or at/over the 20 MiB asset limit
  | "ADMIN_PROOF_SIZE_REJECTED"
  // the browser could not decode the bytes as a PNG
  | "ADMIN_PROOF_DECODE_FAILED"
  // decode succeeded but the intrinsic size is not a positive integer pair
  | "ADMIN_PROOF_INVALID_DIMENSIONS";

export type AdminProofDraftState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      /** synthetic key only — never a file name, URL, token or path. */
      readonly imageRef: string;
      readonly intrinsicWidth: number;
      readonly intrinsicHeight: number;
    }
  | { readonly status: "failed"; readonly code: AdminProofDraftErrorCode };

/**
 * The only image-element surface this owner touches. A real `HTMLImageElement` satisfies it
 * structurally (pinned by a compile-time check in the unit test), and a fake can drive
 * `onload`/`onerror` deterministically with no DOM.
 */
export interface AdminProofImageElementPort {
  onload: ((...args: never[]) => unknown) | null;
  onerror: ((...args: never[]) => unknown) | null;
  src: string;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
}

export interface AdminProofDraftPorts {
  /** Reads the picked file's bytes. The default uses `Blob.arrayBuffer()` and nothing else. */
  readBytes(file: unknown): Promise<Uint8Array>;
  createBlob(bytes: Uint8Array): Blob;
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  createImage(): AdminProofImageElementPort;
}

/**
 * One frozen proof image. It owns its OWN copy of the bytes and its own intrinsic size, so a later
 * replace, clear or dispose in the owner cannot change what this handle exports — which is exactly
 * what makes "the PNG describes this composition" structural rather than a promise.
 */
export interface AdminProofFrozenImage {
  readonly imageRef: string;
  readonly intrinsicWidth: number;
  readonly intrinsicHeight: number;
  /** A fresh copy every call: one consumer cannot corrupt another's bytes. */
  exportProofPng(): Promise<Uint8Array>;
}

export interface AdminProofDraftOwner {
  subscribe(listener: () => void): () => void;
  getSnapshot(): AdminProofDraftState;
  /** `imageRef` → drawable for the Canvas executor. Empty unless the state is `ready`. */
  readonly bindings: PreviewImageBindings;
  /** Replaces whatever is held. A load that is still running is invalidated, never merged. */
  load(file: unknown): void;
  clear(): void;
  freeze(): AdminProofFrozenImage | null;
  dispose(): void;
}

function browserPorts(): AdminProofDraftPorts {
  return {
    readBytes: async (file) => {
      const source = file as { arrayBuffer?: unknown };
      if (typeof source?.arrayBuffer !== "function") throw new Error("unreadable");
      const buffer = await (source.arrayBuffer as () => Promise<ArrayBuffer>).call(source);
      return new Uint8Array(buffer);
    },
    // The content type is FIXED here. It is never read from the picked file.
    createBlob: (bytes) =>
      new Blob([bytes.slice().buffer as ArrayBuffer], { type: PROOF_CONTENT_TYPE }),
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    createImage: () => new Image() as unknown as AdminProofImageElementPort,
  };
}

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const IDLE: AdminProofDraftState = { status: "idle" };

export function createAdminProofDraftOwner(options?: {
  readonly ports?: AdminProofDraftPorts;
}): AdminProofDraftOwner {
  const ports = options?.ports ?? browserPorts();
  const listeners = new Set<() => void>();

  let state: AdminProofDraftState = IDLE;
  let disposed = false;
  /** Bumped by every load, clear and dispose, so a late decode cannot revive a dropped draft. */
  let generation = 0;
  let sequence = 0;

  /** Exactly what one ready image owns; released as a unit. */
  interface Held {
    readonly imageRef: string;
    readonly bytes: Uint8Array;
    readonly width: number;
    readonly height: number;
    readonly drawable: unknown;
    readonly url: string;
  }
  let held: Held | null = null;
  /** The URL of a load that has not settled yet, so an abandoned load still revokes exactly once. */
  let pendingUrl: string | null = null;

  const publish = (next: AdminProofDraftState): void => {
    state = next;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // a subscriber must never break the owner, and this module prints nothing
      }
    }
  };

  /**
   * Every object URL this owner created and has not released yet. Membership is what makes a revoke
   * EXACTLY once: a superseded load and the `release()` that superseded it both reach for the same
   * URL, and revoking a URL twice is a bug the browser will not report.
   */
  const live = new Set<string>();

  const revoke = (url: string | null): void => {
    if (url === null || !live.delete(url)) return;
    try {
      ports.revokeObjectUrl(url);
    } catch {
      // a hostile port must not break teardown
    }
  };

  /** Drop the current image and any in-flight load, revoking each URL exactly once. */
  const release = (): void => {
    generation += 1;
    const url = pendingUrl;
    pendingUrl = null;
    revoke(url);
    const current = held;
    held = null;
    if (current !== null) revoke(current.url);
  };

  const load = (file: unknown): void => {
    if (disposed) return;
    release();
    const current = generation;
    const isCurrent = (): boolean => !disposed && current === generation;
    publish({ status: "loading" });

    void (async () => {
      let bytes: Uint8Array;
      try {
        const read = await ports.readBytes(file);
        if (!(read instanceof Uint8Array)) throw new Error("unreadable");
        // Copied the moment it arrives: a source that keeps mutating its buffer afterwards cannot
        // change what is previewed, exported, hashed and uploaded.
        bytes = new Uint8Array(read);
      } catch {
        if (isCurrent()) publish({ status: "failed", code: "ADMIN_PROOF_READ_FAILED" });
        return;
      }
      if (!isCurrent()) return;
      if (bytes.byteLength === 0 || bytes.byteLength > PROOF_MAX_BYTES) {
        publish({ status: "failed", code: "ADMIN_PROOF_SIZE_REJECTED" });
        return;
      }

      let url: string;
      let image: AdminProofImageElementPort;
      try {
        url = ports.createObjectUrl(ports.createBlob(bytes));
        live.add(url);
        image = ports.createImage();
      } catch {
        publish({ status: "failed", code: "ADMIN_PROOF_DECODE_FAILED" });
        return;
      }
      if (!isCurrent()) {
        revoke(url);
        return;
      }
      pendingUrl = url;

      let settled = false;
      const settle = (finish: () => void): void => {
        if (settled) return;
        settled = true;
        image.onload = null;
        image.onerror = null;
        if (!isCurrent()) {
          // A newer load (or a clear/dispose) already took over: this one revokes its own URL and
          // publishes nothing, so a superseded decode can never overwrite the current draft.
          if (pendingUrl === url) pendingUrl = null;
          revoke(url);
          return;
        }
        finish();
      };

      image.onload = (): void =>
        settle(() => {
          const width = image.naturalWidth;
          const height = image.naturalHeight;
          if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
            pendingUrl = null;
            revoke(url);
            publish({ status: "failed", code: "ADMIN_PROOF_INVALID_DIMENSIONS" });
            return;
          }
          sequence += 1;
          const imageRef = `admin-proof-${sequence}`;
          // The URL stays alive for as long as this image is the current one: a browser that drops
          // the decoded bitmap must be able to re-read it, and `release()` is the single revoke.
          pendingUrl = null;
          held = { imageRef, bytes, width, height, drawable: image, url };
          publish({ status: "ready", imageRef, intrinsicWidth: width, intrinsicHeight: height });
        });

      image.onerror = (): void =>
        settle(() => {
          pendingUrl = null;
          revoke(url);
          publish({ status: "failed", code: "ADMIN_PROOF_DECODE_FAILED" });
        });

      try {
        image.src = url;
      } catch {
        settle(() => {
          pendingUrl = null;
          revoke(url);
          publish({ status: "failed", code: "ADMIN_PROOF_DECODE_FAILED" });
        });
      }
    })();
  };

  return {
    subscribe: (listener) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    bindings: {
      get: (imageRef) => {
        if (held === null || held.imageRef !== imageRef) return undefined;
        return held.drawable as CanvasImageSource;
      },
    },
    load,
    clear: () => {
      if (disposed) return;
      release();
      publish(IDLE);
    },
    freeze: () => {
      if (disposed || held === null) return null;
      // The handle takes its own copy NOW, so it is independent of every later load/clear/dispose.
      const bytes = new Uint8Array(held.bytes);
      const frozen: AdminProofFrozenImage = {
        imageRef: held.imageRef,
        intrinsicWidth: held.width,
        intrinsicHeight: held.height,
        exportProofPng: () => Promise.resolve(new Uint8Array(bytes)),
      };
      return frozen;
    },
    dispose: () => {
      if (disposed) return;
      release();
      disposed = true;
      state = IDLE;
      listeners.clear();
    },
  };
}
