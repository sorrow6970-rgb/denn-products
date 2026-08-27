// Browser PNG decoder + drawable owner for the space V2 proof asset (spec 080 §3 N-2).
//
// The spec 078 replay controller only receives a synthetic `imageRef` from `decode()`, which is not
// enough for the spec 021 Canvas executor — it needs a real drawable behind that key. So the decoder
// and the `imageRef → drawable` binding are ONE owner, and the existing spec 026
// `createLocalImageBindingController` supplies the whole lifecycle (private blob URL, generation,
// exactly-once revoke, superseded-load invalidation). No second image loader is written here.
//
// Information boundary: the object URL, the Blob and the MIME string never leave this closure, and
// no object path, token, password or digest is ever used to build the blob URL or the `imageRef`.

import {
  createLocalImageBindingController,
  type LocalImageElementPort,
} from "../canvas/localImageBinding";
import type { PreviewImageBindings } from "../canvas/types";
import type { SpaceV2PngDecodePort } from "./replay-controller";

const PROOF_CONTENT_TYPE = "image/png";

/** Identity-free failure codes. The replay controller maps any rejection to its own safe code. */
export type SpaceV2ProofDecodeErrorCode =
  | "SPACE_V2_PROOF_DECODE_INVALID_INPUT"
  | "SPACE_V2_PROOF_DECODE_FAILED"
  | "SPACE_V2_PROOF_DECODE_SUPERSEDED"
  | "SPACE_V2_PROOF_DECODE_DISPOSED";

export interface SafeSpaceV2ProofDecodeError extends Error {
  readonly code: SpaceV2ProofDecodeErrorCode;
}

export interface SpaceV2ProofDecoderPorts {
  createBlob(bytes: Uint8Array): Blob;
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  createImage(): LocalImageElementPort;
}

export interface SpaceV2ProofDecoderOwner {
  /** The spec 078 decoder port. Browser APIs are touched only inside `decode()`. */
  readonly decoder: SpaceV2PngDecodePort;
  /** `imageRef` → drawable for the Canvas executor. Empty unless a decode is currently ready. */
  readonly bindings: PreviewImageBindings;
  clear(): void;
  dispose(): void;
}

/**
 * Default browser ports. Building this object touches NO browser API — every global is read inside
 * a port body, i.e. on the first `decode()` and never at module import or factory time.
 */
function browserPorts(): SpaceV2ProofDecoderPorts {
  return {
    // The MIME is fixed here; it is never derived from metadata the reader returned.
    createBlob: (bytes) =>
      new Blob([bytes.slice().buffer as ArrayBuffer], { type: PROOF_CONTENT_TYPE }),
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    createImage: () => new Image() as unknown as LocalImageElementPort,
  };
}

function decodeError(code: SpaceV2ProofDecodeErrorCode): SafeSpaceV2ProofDecodeError {
  const error = new Error(code) as Error & { code: SpaceV2ProofDecodeErrorCode };
  error.name = "SpaceV2ProofDecodeError";
  error.code = code;
  return error;
}

export function createSpaceV2ProofDecoderOwner(options?: {
  readonly ports?: SpaceV2ProofDecoderPorts;
}): SpaceV2ProofDecoderOwner {
  const ports = options?.ports ?? browserPorts();
  const binding = createLocalImageBindingController({
    ports: {
      createObjectUrl: (blob) => ports.createObjectUrl(blob),
      revokeObjectUrl: (url) => ports.revokeObjectUrl(url),
      createImage: () => ports.createImage(),
    },
  });

  let generation = 0;
  let disposed = false;
  // `dispose()` drops the binding controller's listeners without notifying them, so a decode that
  // is still waiting would never hear about it. These callbacks are invoked explicitly instead, so
  // every decode promise settles exactly once on every exit path.
  const waiting = new Set<() => void>();

  const decode: SpaceV2PngDecodePort["decode"] = (bytes) =>
    new Promise((resolve, reject) => {
      if (disposed) {
        reject(decodeError("SPACE_V2_PROOF_DECODE_DISPOSED"));
        return;
      }
      if (!(bytes instanceof Uint8Array)) {
        reject(decodeError("SPACE_V2_PROOF_DECODE_INVALID_INPUT"));
        return;
      }

      let blob: Blob;
      try {
        // Fresh copy BEFORE anything is handed to a browser API: the caller's array can never be
        // observed (or mutated) by the decode that follows.
        blob = ports.createBlob(new Uint8Array(bytes));
      } catch {
        reject(decodeError("SPACE_V2_PROOF_DECODE_INVALID_INPUT"));
        return;
      }

      const current = ++generation;
      let settled = false;
      let unsubscribe: () => void = () => undefined;

      const finish = (settle: () => void): void => {
        settled = true;
        waiting.delete(check);
        unsubscribe();
        settle();
      };

      function check(): void {
        if (settled) return;
        // A newer decode (or a clear/dispose) has taken over: this promise must not resolve with
        // the other load's drawable, and it must not touch the current binding either.
        if (disposed || current !== generation) {
          finish(() =>
            reject(
              decodeError(
                disposed ? "SPACE_V2_PROOF_DECODE_DISPOSED" : "SPACE_V2_PROOF_DECODE_SUPERSEDED",
              ),
            ),
          );
          return;
        }
        const snapshot = binding.getSnapshot();
        if (snapshot.status === "ready") {
          finish(() =>
            resolve({
              imageRef: snapshot.imageState.imageRef,
              intrinsicWidth: snapshot.imageState.intrinsicSize.width,
              intrinsicHeight: snapshot.imageState.intrinsicSize.height,
            }),
          );
          return;
        }
        if (snapshot.status === "failed") {
          finish(() => reject(decodeError("SPACE_V2_PROOF_DECODE_FAILED")));
        }
      }

      waiting.add(check);
      unsubscribe = binding.subscribe(check);
      binding.load(blob);
      // A port that settles synchronously (a unit-test fake) has already notified; re-checking here
      // covers a snapshot that was reached before `subscribe` could observe it.
      check();
    });

  return {
    decoder: { decode },
    bindings: binding.bindings,
    clear: () => {
      generation += 1;
      binding.clear();
      for (const settle of [...waiting]) settle();
    },
    dispose: () => {
      disposed = true;
      generation += 1;
      binding.dispose();
      for (const settle of [...waiting]) settle();
    },
  };
}
