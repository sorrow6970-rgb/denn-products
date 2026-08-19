import { createCompositeImageBindings } from "../canvas/compositeImageBindings";
import {
  createTemplateArtBindingController,
  type TemplateArtBindingController,
  type TemplateArtBindingState,
  type TemplateArtSource,
} from "../canvas/templateArtBinding";
import type { PreviewImageBindings } from "../canvas/types";
import type { SourceBoundProofResolver, SourceBoundTemplateArtResolver } from "./frame-plan";
import {
  createSpaceProofImageOwner,
  type SpaceProofImageOwner,
  type SpaceProofImageOwnerState,
} from "./proof-image-owner";
import { resolveSpaceProofImageUrl } from "./proof-image";

export type SourceBoundReadinessSnapshot =
  | {
      readonly status: "active";
      readonly proof: SpaceProofImageOwnerState;
      readonly templateArt: TemplateArtBindingState;
    }
  | { readonly status: "disposed" };

export interface SourceBoundReadinessDependencies {
  readonly createProofOwner?: () => SpaceProofImageOwner;
  readonly createTemplateArtOwner?: () => TemplateArtBindingController;
}

export interface SourceBoundReadinessController {
  getSnapshot(): SourceBoundReadinessSnapshot;
  subscribe(listener: () => void): () => void;
  loadProof(source: unknown): void;
  clearProof(): void;
  loadTemplateArt(source: unknown): void;
  clearTemplateArt(): void;
  dispose(): void;
  readonly proofResolver: SourceBoundProofResolver;
  readonly templateArtResolver: SourceBoundTemplateArtResolver;
  readonly bindings: PreviewImageBindings;
}

const PROOF_REF = /^space-proof-[1-9][0-9]*$/;
const ART_REF = /^template-art-[1-9][0-9]*$/;
const invalidProof: SpaceProofImageOwnerState = { status: "failed", code: "LOAD_FAILED" };
const invalidArt: TemplateArtBindingState = { status: "failed", code: "LOAD_FAILED" };

const readArtSource = (source: unknown): TemplateArtSource | null => {
  try {
    if (source === null || typeof source !== "object" || Array.isArray(source)) return null;
    const record = source as Record<string, unknown>;
    const kind = record.kind;
    const src = record.src;
    if (kind !== "data-image" && kind !== "firebase-download-image") return null;
    if (typeof src !== "string" || src.length === 0) return null;
    return { kind, src };
  } catch {
    return null;
  }
};

const sameArtSource = (left: TemplateArtSource | null, right: TemplateArtSource): boolean =>
  left !== null && left.kind === right.kind && left.src === right.src;

export function createSourceBoundReadinessController(
  dependencies: SourceBoundReadinessDependencies = {},
): SourceBoundReadinessController {
  const inertProof = (): SpaceProofImageOwner =>
    createSpaceProofImageOwner({
      ports: {
        createImage: () => {
          throw new Error("unavailable");
        },
      },
    });
  const inertArt = (): TemplateArtBindingController =>
    createTemplateArtBindingController({
      ports: {
        createImage: () => {
          throw new Error("unavailable");
        },
      },
    });
  let proofOwner: SpaceProofImageOwner;
  let artOwner: TemplateArtBindingController;
  try {
    const candidate = (dependencies.createProofOwner ?? createSpaceProofImageOwner)();
    proofOwner = candidate && typeof candidate === "object" ? candidate : inertProof();
  } catch {
    proofOwner = inertProof();
  }
  try {
    const candidate = (dependencies.createTemplateArtOwner ?? createTemplateArtBindingController)();
    artOwner = candidate && typeof candidate === "object" ? candidate : inertArt();
  } catch {
    artOwner = inertArt();
  }
  const listeners = new Set<() => void>();
  let disposed = false;
  let proofSource: string | null = null;
  let artSource: TemplateArtSource | null = null;
  let blockedProofRef: string | null = null;
  let blockedArtRef: string | null = null;

  const readProofState = (): SpaceProofImageOwnerState => {
    try {
      return proofOwner.getSnapshot();
    } catch {
      return invalidProof;
    }
  };
  const readArtState = (): TemplateArtBindingState => {
    try {
      return artOwner.getSnapshot();
    } catch {
      return invalidArt;
    }
  };

  let snapshot: SourceBoundReadinessSnapshot = {
    status: "active",
    proof: readProofState(),
    templateArt: readArtState(),
  };

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A subscriber cannot break lifecycle or another subscriber.
      }
    }
  };

  const refresh = (): void => {
    if (disposed) return;
    snapshot = {
      status: "active",
      proof: readProofState(),
      templateArt: readArtState(),
    };
    notify();
  };

  let unsubscribeProof = (): void => undefined;
  let unsubscribeArt = (): void => undefined;
  try {
    unsubscribeProof = proofOwner.subscribe(refresh);
  } catch {
    // A hostile owner cannot escape construction; reads resolve as unavailable.
  }
  try {
    unsubscribeArt = artOwner.subscribe(refresh);
  } catch {
    // Same containment for the art owner.
  }

  const clearProofOwner = (): void => {
    try {
      proofOwner.clear();
    } catch {
      refresh();
    }
  };
  const clearArtOwner = (): void => {
    try {
      artOwner.clear();
    } catch {
      refresh();
    }
  };

  const loadProof = (source: unknown): void => {
    if (disposed) return;
    const previous = readProofState();
    blockedProofRef = previous.status === "ready" ? previous.imageRef : blockedProofRef;
    proofSource = null;
    const resolved = resolveSpaceProofImageUrl(source);
    if (!resolved.ok) {
      clearProofOwner();
      return;
    }
    proofSource = resolved.value.src;
    try {
      proofOwner.load(resolved.value.src);
    } catch {
      proofSource = null;
      clearProofOwner();
    }
  };

  const loadTemplateArt = (source: unknown): void => {
    if (disposed) return;
    const previous = readArtState();
    blockedArtRef = previous.status === "ready" ? previous.imageRef : blockedArtRef;
    artSource = null;
    const valid = readArtSource(source);
    if (valid === null) {
      clearArtOwner();
      return;
    }
    artSource = valid;
    try {
      artOwner.load(valid);
    } catch {
      artSource = null;
      clearArtOwner();
    }
  };

  const proofResolver: SourceBoundProofResolver = {
    resolve(source) {
      if (disposed) return { ok: false };
      const resolved = resolveSpaceProofImageUrl(source);
      if (!resolved.ok || proofSource !== resolved.value.src) return { ok: false };
      const state = readProofState();
      if (
        state.status !== "ready" ||
        !PROOF_REF.test(state.imageRef) ||
        state.imageRef === blockedProofRef
      ) {
        return { ok: false };
      }
      try {
        if (proofOwner.bindings.get(state.imageRef) == null) return { ok: false };
      } catch {
        return { ok: false };
      }
      const { width, height } = state.intrinsicSize;
      if (![width, height].every((value) => Number.isFinite(value) && value > 0)) {
        return { ok: false };
      }
      return { ok: true, imageRef: state.imageRef, intrinsicSize: { width, height } };
    },
  };

  const templateArtResolver: SourceBoundTemplateArtResolver = {
    resolve(source) {
      if (disposed) return { ok: false };
      const valid = readArtSource(source);
      if (valid === null || !sameArtSource(artSource, valid)) return { ok: false };
      const state = readArtState();
      if (
        state.status !== "ready" ||
        !ART_REF.test(state.imageRef) ||
        state.imageRef === blockedArtRef
      ) {
        return { ok: false };
      }
      try {
        if (artOwner.bindings.get(state.imageRef) == null) return { ok: false };
      } catch {
        return { ok: false };
      }
      return { ok: true, imageRef: state.imageRef };
    },
  };

  const bindings = createCompositeImageBindings([proofOwner.bindings, artOwner.bindings]);

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (disposed || typeof listener !== "function") return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    loadProof,
    clearProof() {
      if (disposed) return;
      const previous = readProofState();
      blockedProofRef = previous.status === "ready" ? previous.imageRef : blockedProofRef;
      proofSource = null;
      clearProofOwner();
    },
    loadTemplateArt,
    clearTemplateArt() {
      if (disposed) return;
      const previous = readArtState();
      blockedArtRef = previous.status === "ready" ? previous.imageRef : blockedArtRef;
      artSource = null;
      clearArtOwner();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      proofSource = null;
      artSource = null;
      blockedProofRef = null;
      blockedArtRef = null;
      try {
        unsubscribeProof();
      } catch {
        // best effort containment
      }
      try {
        unsubscribeArt();
      } catch {
        // best effort containment
      }
      try {
        proofOwner.dispose();
      } catch {
        // no exception leaves disposal
      }
      try {
        artOwner.dispose();
      } catch {
        // no exception leaves disposal
      }
      snapshot = { status: "disposed" };
      listeners.clear();
    },
    proofResolver,
    templateArtResolver,
    bindings,
  };
}
