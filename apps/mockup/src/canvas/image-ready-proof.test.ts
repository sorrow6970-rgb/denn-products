import { describe, expect, it, vi } from "vitest";
import { createRoomCommittedSourceOwner } from "../room-placement/committed-source";
import { createLocalImageBindingController } from "./localImageBinding";
import { createTemplateArtBindingController } from "./templateArtBinding";

type Kind = "local" | "art";
function setup(kind: Kind) {
  const elements: {
    onload: (() => unknown) | null;
    onerror: (() => unknown) | null;
    src: string;
    crossOrigin: string | null;
    naturalWidth: number;
    naturalHeight: number;
  }[] = [];
  const createImage = vi.fn(() => {
    const element = {
      onload: null,
      onerror: null,
      src: "",
      crossOrigin: null,
      naturalWidth: 40,
      naturalHeight: 20,
    };
    elements.push(element);
    return element;
  });
  const createObjectUrl = vi.fn(() => "blob:synthetic");
  const revokeObjectUrl = vi.fn();
  const local =
    kind === "local"
      ? createLocalImageBindingController({
          ports: { createImage, createObjectUrl, revokeObjectUrl },
        })
      : null;
  const art =
    kind === "art" ? createTemplateArtBindingController({ ports: { createImage } }) : null;
  const controller = local ?? art;
  if (!controller) throw new Error("setup");
  const load = () =>
    local
      ? local.load(new Blob(["synthetic"]))
      : art?.load({ kind: "data-image", src: "data:image/png;base64,QQ" });
  const invalid = () => (local ? local.load(null as unknown as Blob) : art?.load(null as never));
  const ready = () => {
    load();
    elements.at(-1)?.onload?.();
    const state = controller.getSnapshot();
    expect(state.status).toBe("ready");
    const proof = controller.readReadyProof(state);
    if (!proof) throw new Error("setup");
    return { state, proof };
  };
  return {
    controller,
    load,
    invalid,
    ready,
    elements,
    createImage,
    createObjectUrl,
    revokeObjectUrl,
  };
}

describe.each(["local", "art"] as const)("%s ready owner proof (spec130)", (kind) => {
  it("returns null when idle, loading or failed without creating extra work", () => {
    const s = setup(kind),
      c = s.controller;
    expect(c.readReadyProof(c.getSnapshot())).toBeNull();
    expect(s.createImage).not.toHaveBeenCalled();
    s.load();
    expect(c.readReadyProof(c.getSnapshot())).toBeNull();
    s.elements[0].onerror?.();
    expect(c.readReadyProof(c.getSnapshot())).toBeNull();
    expect(s.createImage).toHaveBeenCalledTimes(1);
    c.dispose();
  });
  it("returns a frozen minimal proof without IO, snapshot changes or notifications", () => {
    const s = setup(kind),
      r = s.ready(),
      notify = vi.fn();
    s.controller.subscribe(notify);
    s.createImage.mockClear();
    s.createObjectUrl.mockClear();
    s.revokeObjectUrl.mockClear();
    expect(Object.keys(r.proof)).toEqual(["isCurrent"]);
    expect(Object.isFrozen(r.proof)).toBe(true);
    expect(JSON.stringify(r.proof)).toBe("{}");
    for (let i = 0; i < 5; i++) {
      expect(r.proof.isCurrent()).toBe(true);
      expect(s.controller.readReadyProof(r.state)?.isCurrent()).toBe(true);
      expect(s.controller.getSnapshot()).toBe(r.state);
    }
    expect(notify).not.toHaveBeenCalled();
    expect(s.createImage).not.toHaveBeenCalled();
    expect(s.createObjectUrl).not.toHaveBeenCalled();
    expect(s.revokeObjectUrl).not.toHaveBeenCalled();
    s.controller.dispose();
  });
  it("requires the exact snapshot; foreign/proxy input has zero getter reads", () => {
    const s = setup(kind),
      r = s.ready(),
      get = vi.fn(() => {
        throw new Error("private");
      });
    expect(s.controller.readReadyProof({ ...r.state })).toBeNull();
    expect(s.controller.readReadyProof(new Proxy({}, { get }))).toBeNull();
    expect(s.controller.readReadyProof(null)).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(r.proof.isCurrent()).toBe(true);
    s.controller.dispose();
  });
  it.each(["clear", "load", "invalid", "error", "dispose"] as const)(
    "%s invalidates synchronously and cannot revive an old proof",
    (action) => {
      const s = setup(kind),
        r = s.ready(),
        c = s.controller;
      if (action === "clear" || action === "dispose") c[action]();
      else if (action === "invalid") s.invalid();
      else {
        s.load();
        if (action === "error") s.elements.at(-1)?.onerror?.();
      }
      expect(r.proof.isCurrent()).toBe(false);
      expect(c.readReadyProof(r.state)).toBeNull();
      if (action !== "dispose") {
        expect(s.ready().proof.isCurrent()).toBe(true);
        expect(r.proof.isCurrent()).toBe(false);
        expect(c.readReadyProof(r.state)).toBeNull();
      }
      c.dispose();
      expect(r.proof.isCurrent()).toBe(false);
    },
  );
  it("does not trust a disposed ready snapshot or a new owner's identical imageRef", () => {
    const first = setup(kind),
      a = first.ready();
    first.controller.dispose();
    expect(first.controller.getSnapshot()).toBe(a.state);
    const second = setup(kind),
      b = second.ready();
    expect(b.state).toEqual(a.state);
    expect(a.proof.isCurrent()).toBe(false);
    expect(first.controller.readReadyProof(a.state)).toBeNull();
    expect(second.controller.readReadyProof(a.state)).toBeNull();
    expect(b.proof.isCurrent()).toBe(true);
    second.controller.dispose();
  });
  it("invalidates when a saved completion handler replaces ready within the same load", () => {
    const s = setup(kind);
    s.load();
    const complete = s.elements[0].onload;
    complete?.();
    const state = s.controller.getSnapshot(),
      proof = s.controller.readReadyProof(state);
    expect(proof?.isCurrent()).toBe(true);
    complete?.();
    expect(proof?.isCurrent()).toBe(false);
    expect(s.controller.readReadyProof(state)).toBeNull();
    expect(s.controller.readReadyProof(s.controller.getSnapshot())?.isCurrent()).toBe(true);
    s.controller.dispose();
  });
  it("late superseded completion cannot replace the new proof", () => {
    const s = setup(kind);
    s.load();
    const late = s.elements[0].onload;
    const r = s.ready();
    late?.();
    expect(s.controller.getSnapshot()).toBe(r.state);
    expect(r.proof.isCurrent()).toBe(true);
    s.controller.dispose();
  });
  it("a subscriber disposing at ready cannot issue a proof", () => {
    const s = setup(kind);
    s.controller.subscribe(() => {
      if (s.controller.getSnapshot().status === "ready") s.controller.dispose();
    });
    s.load();
    s.elements[0].onload?.();
    expect(s.controller.getSnapshot().status).toBe("ready");
    expect(s.controller.readReadyProof(s.controller.getSnapshot())).toBeNull();
  });
  it("proof checking never consults the borrowed drawable", () => {
    const s = setup(kind),
      r = s.ready(),
      get = vi.fn(() => {
        throw new Error("private");
      });
    Object.defineProperty(s.elements[0], "naturalWidth", { get });
    Object.defineProperty(s.elements[0], "src", { get });
    expect(r.proof.isCurrent()).toBe(true);
    expect(s.controller.readReadyProof(r.state)?.isCurrent()).toBe(true);
    expect(get).not.toHaveBeenCalled();
    s.controller.dispose();
  });
  it("revokes the real spec129 source when the image owner is disposed", () => {
    const s = setup(kind),
      r = s.ready(),
      onInvalidate = vi.fn();
    const made = createRoomCommittedSourceOwner({ onInvalidate });
    if (!made.ok) throw new Error("setup");
    const ticket = made.owner.begin();
    expect(
      ticket?.commit({
        kind: "frame",
        projectionOk: true,
        planReady: true,
        clockPreview: null,
        plan: { kind: "frame", logicalCanvas: { width: 40, height: 20 } },
        imageBindings: s.controller.bindings,
        isCurrent: r.proof.isCurrent,
      }),
    ).toBe(true);
    const source = made.owner.readSource();
    expect(source).not.toBeNull();
    s.controller.dispose();
    expect(made.owner.readSource()).toBeNull();
    expect(source?.imageBindings.get("user-image-1")).toBeUndefined();
    expect(onInvalidate).toHaveBeenCalledTimes(1);
    made.owner.dispose();
    expect(onInvalidate).toHaveBeenCalledTimes(1);
  });
});

it("local proof cannot be issued while ready settlement is reentering the revoke port", () => {
  const s = setup("local");
  const answers: unknown[] = [];
  s.revokeObjectUrl.mockImplementation(() => {
    answers.push(s.controller.readReadyProof(s.controller.getSnapshot()));
  });
  const r = s.ready();
  expect(answers).toEqual([null]);
  expect(r.proof.isCurrent()).toBe(true);
  s.controller.dispose();
});
