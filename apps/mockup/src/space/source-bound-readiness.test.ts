import type {
  TemplateArtBindingController,
  TemplateArtBindingState,
  TemplateArtSource,
} from "../canvas/templateArtBinding";
import type { PreviewImageBindings } from "../canvas/types";
import type { SpaceProofImageOwner, SpaceProofImageOwnerState } from "./proof-image-owner";
import { describe, expect, it, vi } from "vitest";
import { createSourceBoundReadinessController } from "./source-bound-readiness";

const PROOF =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Fone.png?alt=media";
const PROOF_2 =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Ftwo.png?alt=media";
const ART: TemplateArtSource = { kind: "data-image", src: "data:image/png;base64,AA==" };
const ART_2: TemplateArtSource = { kind: "data-image", src: "data:image/png;base64,AQ==" };

class FakeProofOwner implements SpaceProofImageOwner {
  state: SpaceProofImageOwnerState = { status: "idle" };
  drawable: unknown;
  readonly listeners = new Set<() => void>();
  readonly load = vi.fn((_source: unknown) => {
    this.state = { status: "loading" };
    this.emit();
  });
  readonly clear = vi.fn(() => {
    this.state = { status: "idle" };
    this.drawable = undefined;
    this.emit();
  });
  readonly dispose = vi.fn(() => {
    this.drawable = undefined;
    this.listeners.clear();
  });
  readonly bindings: PreviewImageBindings = {
    get: (ref) =>
      this.state.status === "ready" && this.state.imageRef === ref
        ? (this.drawable as CanvasImageSource | undefined)
        : undefined,
  };
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  emit() {
    for (const listener of [...this.listeners]) listener();
  }
  ready(ref = "space-proof-1") {
    this.drawable = { owner: "proof" };
    this.state = {
      status: "ready",
      imageRef: ref,
      intrinsicSize: { width: 1200, height: 800 },
    };
    this.emit();
  }
}

class FakeArtOwner implements TemplateArtBindingController {
  state: TemplateArtBindingState = { status: "idle" };
  drawable: unknown;
  readonly listeners = new Set<() => void>();
  readonly load = vi.fn((_source: TemplateArtSource) => {
    this.state = { status: "loading" };
    this.emit();
  });
  readonly clear = vi.fn(() => {
    this.state = { status: "idle" };
    this.drawable = undefined;
    this.emit();
  });
  readonly dispose = vi.fn(() => {
    this.drawable = undefined;
    this.listeners.clear();
  });
  readonly bindings: PreviewImageBindings = {
    get: (ref) =>
      this.state.status === "ready" && this.state.imageRef === ref
        ? (this.drawable as CanvasImageSource | undefined)
        : undefined,
  };
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  emit() {
    for (const listener of [...this.listeners]) listener();
  }
  ready(ref = "template-art-1") {
    this.drawable = { owner: "art" };
    this.state = { status: "ready", imageRef: ref };
    this.emit();
  }
}

const harness = () => {
  const proof = new FakeProofOwner();
  const art = new FakeArtOwner();
  const controller = createSourceBoundReadinessController({
    createProofOwner: () => proof,
    createTemplateArtOwner: () => art,
  });
  return { controller, proof, art };
};

describe("createSourceBoundReadinessController", () => {
  it("contains hostile owner factories with inert no-Image owners", () => {
    const controller = createSourceBoundReadinessController({
      createProofOwner: () => {
        throw new Error("PRIVATE_FACTORY");
      },
      createTemplateArtOwner: () => null as never,
    });
    expect(() => controller.loadProof(PROOF)).not.toThrow();
    expect(() => controller.loadTemplateArt(ART)).not.toThrow();
    expect(controller.proofResolver.resolve(PROOF)).toEqual({ ok: false });
    expect(controller.templateArtResolver.resolve(ART)).toEqual({ ok: false });
    expect(JSON.stringify(controller.getSnapshot())).not.toContain("PRIVATE_FACTORY");
  });

  it("passes detached exact sources once and resolves only current ready bindings", () => {
    const h = harness();
    h.controller.loadProof(PROOF);
    h.controller.loadTemplateArt(ART);
    expect(h.proof.load).toHaveBeenCalledWith(PROOF);
    expect(h.art.load).toHaveBeenCalledWith(ART);
    expect(h.controller.proofResolver.resolve(PROOF)).toEqual({ ok: false });
    expect(h.controller.templateArtResolver.resolve(ART)).toEqual({ ok: false });

    h.proof.ready();
    h.art.ready();
    expect(h.controller.proofResolver.resolve(PROOF)).toEqual({
      ok: true,
      imageRef: "space-proof-1",
      intrinsicSize: { width: 1200, height: 800 },
    });
    expect(h.controller.templateArtResolver.resolve(ART)).toEqual({
      ok: true,
      imageRef: "template-art-1",
    });
    expect(h.controller.bindings.get("space-proof-1")).toEqual({ owner: "proof" });
    expect(h.controller.bindings.get("template-art-1")).toEqual({ owner: "art" });
    expect(h.controller.bindings.get("unknown")).toBeUndefined();
  });

  it("invalid or hostile sources clear the old binding without calling owner load", () => {
    const h = harness();
    h.controller.loadProof(PROOF);
    h.proof.ready();
    h.controller.loadProof("https://example.invalid/not-proof.png");
    expect(h.proof.load).toHaveBeenCalledTimes(1);
    expect(h.proof.clear).toHaveBeenCalledOnce();
    expect(h.controller.proofResolver.resolve(PROOF)).toEqual({ ok: false });

    h.controller.loadTemplateArt(ART);
    h.art.ready();
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error("PRIVATE_SOURCE");
        },
      },
    );
    h.controller.loadTemplateArt(hostile);
    expect(h.art.load).toHaveBeenCalledTimes(1);
    expect(h.art.clear).toHaveBeenCalledOnce();
    expect(h.controller.templateArtResolver.resolve(ART)).toEqual({ ok: false });
  });

  it("invalidates the old source before replacement and ignores a late old ready snapshot", () => {
    const h = harness();
    h.controller.loadProof(PROOF);
    h.proof.ready("space-proof-1");
    expect(h.controller.proofResolver.resolve(PROOF).ok).toBe(true);

    h.controller.loadProof(PROOF_2);
    expect(h.controller.proofResolver.resolve(PROOF)).toEqual({ ok: false });
    h.proof.ready("space-proof-1");
    expect(h.controller.proofResolver.resolve(PROOF)).toEqual({ ok: false });
    expect(h.controller.proofResolver.resolve(PROOF_2)).toEqual({ ok: false });
    h.proof.ready("space-proof-2");
    expect(h.controller.proofResolver.resolve(PROOF_2).ok).toBe(true);

    h.controller.loadTemplateArt(ART);
    h.art.ready("template-art-1");
    h.controller.loadTemplateArt(ART_2);
    h.art.ready("template-art-1");
    expect(h.controller.templateArtResolver.resolve(ART)).toEqual({ ok: false });
    expect(h.controller.templateArtResolver.resolve(ART_2)).toEqual({ ok: false });
    h.art.ready("template-art-2");
    expect(h.controller.templateArtResolver.resolve(ART_2).ok).toBe(true);
  });

  it("requires owner-specific refs, positive proof dimensions and a live binding", () => {
    const h = harness();
    h.controller.loadProof(PROOF);
    h.proof.ready("template-art-1");
    expect(h.controller.proofResolver.resolve(PROOF)).toEqual({ ok: false });
    h.proof.ready();
    h.proof.drawable = undefined;
    expect(h.controller.proofResolver.resolve(PROOF)).toEqual({ ok: false });
    h.proof.drawable = {};
    h.proof.state = {
      status: "ready",
      imageRef: "space-proof-1",
      intrinsicSize: { width: 0, height: 1 },
    };
    expect(h.controller.proofResolver.resolve(PROOF)).toEqual({ ok: false });

    h.controller.loadTemplateArt(ART);
    h.art.ready("space-proof-1");
    expect(h.controller.templateArtResolver.resolve(ART)).toEqual({ ok: false });
  });

  it("keeps proof and art lifecycle independent and clear affects only its owner", () => {
    const h = harness();
    h.controller.loadProof(PROOF);
    h.controller.loadTemplateArt(ART);
    h.proof.ready();
    h.art.ready();
    h.controller.clearProof();
    expect(h.controller.proofResolver.resolve(PROOF)).toEqual({ ok: false });
    expect(h.controller.templateArtResolver.resolve(ART).ok).toBe(true);
    expect(h.art.clear).not.toHaveBeenCalled();
    h.controller.clearTemplateArt();
    expect(h.controller.templateArtResolver.resolve(ART)).toEqual({ ok: false });
  });

  it("combines owner notifications, isolates subscriber errors and exposes no source", () => {
    const h = harness();
    const safe = vi.fn();
    h.controller.subscribe(() => {
      throw new Error("SUBSCRIBER_PRIVATE");
    });
    h.controller.subscribe(safe);
    h.controller.loadProof(PROOF);
    h.proof.ready();
    expect(safe).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(h.controller.getSnapshot())).not.toContain(PROOF);
    expect(JSON.stringify(h.controller.proofResolver.resolve(PROOF))).not.toContain(PROOF);
  });

  it("disposes both owners once and permanently disables loads, resolves and bindings", () => {
    const h = harness();
    h.controller.loadProof(PROOF);
    h.controller.loadTemplateArt(ART);
    h.proof.ready();
    h.art.ready();
    h.controller.dispose();
    h.controller.dispose();
    expect(h.proof.dispose).toHaveBeenCalledOnce();
    expect(h.art.dispose).toHaveBeenCalledOnce();
    expect(h.controller.getSnapshot()).toEqual({ status: "disposed" });
    expect(h.controller.proofResolver.resolve(PROOF)).toEqual({ ok: false });
    expect(h.controller.templateArtResolver.resolve(ART)).toEqual({ ok: false });
    expect(h.controller.bindings.get("space-proof-1")).toBeUndefined();
    h.controller.loadProof(PROOF_2);
    h.controller.loadTemplateArt(ART_2);
    expect(h.proof.load).toHaveBeenCalledTimes(1);
    expect(h.art.load).toHaveBeenCalledTimes(1);
  });
});
