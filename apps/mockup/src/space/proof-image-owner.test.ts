import { describe, expect, it } from "vitest";
import { createSpaceProofImageOwner, type SpaceProofImageElementPort } from "./proof-image-owner";

const TOKEN = "PRIVATE_TOKEN_MARKER";
const SOURCE = `https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Fphoto.png?alt=media&token=${TOKEN}`;

interface FakeElement extends SpaceProofImageElementPort {
  readonly writes: string[];
  fireLoad(): void;
  fireError(): void;
}

function harness(sizes: readonly { width?: number; height?: number }[] = [{}]) {
  const elements: FakeElement[] = [];
  let creates = 0;
  const owner = createSpaceProofImageOwner({
    ports: {
      createImage: () => {
        const size = sizes[creates] ?? {};
        creates += 1;
        let onload: ((...args: never[]) => unknown) | null = null;
        let onerror: ((...args: never[]) => unknown) | null = null;
        let crossOrigin: string | null = null;
        let src = "";
        const writes: string[] = [];
        const element: FakeElement = {
          get onload() {
            return onload;
          },
          set onload(value) {
            onload = value;
          },
          get onerror() {
            return onerror;
          },
          set onerror(value) {
            onerror = value;
          },
          get crossOrigin() {
            return crossOrigin;
          },
          set crossOrigin(value) {
            crossOrigin = value;
            writes.push(`crossOrigin=${String(value)}`);
          },
          get src() {
            return src;
          },
          set src(value) {
            src = value;
            writes.push("src");
          },
          naturalWidth: size.width ?? 120,
          naturalHeight: size.height ?? 80,
          writes,
          fireLoad: () => onload?.(),
          fireError: () => onerror?.(),
        };
        elements.push(element);
        return element;
      },
    },
  });
  return { owner, elements, creates: () => creates };
}

describe("createSpaceProofImageOwner", () => {
  it("revalidates trust before creating an image", () => {
    const h = harness();
    for (const input of [
      null,
      "",
      "https://evil.invalid/proofs/photo.png",
      SOURCE.replace("proofs", "templates"),
    ]) {
      h.owner.load(input);
      expect(h.owner.getSnapshot()).toEqual({ status: "failed", code: "INVALID_INPUT" });
    }
    expect(h.creates()).toBe(0);
  });

  it("sets anonymous CORS before assigning src exactly once", () => {
    const h = harness();
    h.owner.load(SOURCE);
    expect(h.owner.getSnapshot()).toEqual({ status: "loading" });
    expect(h.elements[0].writes).toEqual(["crossOrigin=anonymous", "src"]);
  });

  it("publishes only synthetic identity and positive intrinsic size, then binds the drawable", () => {
    const h = harness([{ width: 640, height: 480 }]);
    h.owner.load(SOURCE);
    h.elements[0].fireLoad();
    expect(h.owner.getSnapshot()).toEqual({
      status: "ready",
      imageRef: "space-proof-1",
      intrinsicSize: { width: 640, height: 480 },
    });
    expect(h.owner.bindings.get("space-proof-1")).toBe(h.elements[0]);
    expect(h.owner.bindings.get("space-proof-2")).toBeUndefined();
    expect(JSON.stringify(h.owner.getSnapshot())).not.toContain(TOKEN);
  });

  it.each([
    { width: 0, height: 1 },
    { width: 1, height: 0 },
    { width: Number.NaN, height: 1 },
    { width: 1, height: Number.POSITIVE_INFINITY },
  ])("rejects invalid decoded dimensions: %o", (size) => {
    const h = harness([size]);
    h.owner.load(SOURCE);
    h.elements[0].fireLoad();
    expect(h.owner.getSnapshot()).toEqual({ status: "failed", code: "INVALID_DIMENSIONS" });
    expect(h.owner.bindings.get("space-proof-1")).toBeUndefined();
  });

  it("maps image error to one safe failure with no retry", () => {
    const h = harness();
    h.owner.load(SOURCE);
    h.elements[0].fireError();
    expect(h.owner.getSnapshot()).toEqual({ status: "failed", code: "LOAD_FAILED" });
    expect(h.creates()).toBe(1);
    expect(h.elements[0].writes).toEqual(["crossOrigin=anonymous", "src"]);
  });

  it("replacement detaches A and ignores its late events while B owns the only binding", () => {
    const h = harness([
      { width: 10, height: 20 },
      { width: 30, height: 40 },
    ]);
    h.owner.load(SOURCE);
    const firstLoad = h.elements[0].onload;
    const firstError = h.elements[0].onerror;
    h.owner.load(SOURCE.replace("photo.png", "second.png"));
    firstLoad?.();
    firstError?.();
    expect(h.owner.getSnapshot()).toEqual({ status: "loading" });
    expect(h.owner.bindings.get("space-proof-1")).toBeUndefined();
    h.elements[1].fireLoad();
    expect(h.owner.getSnapshot()).toMatchObject({ status: "ready", imageRef: "space-proof-2" });
    expect(h.owner.bindings.get("space-proof-2")).toBe(h.elements[1]);
  });

  it("clear drops pending and ready state without accepting late results", () => {
    const h = harness();
    h.owner.load(SOURCE);
    const late = h.elements[0].onload;
    h.owner.clear();
    late?.();
    expect(h.owner.getSnapshot()).toEqual({ status: "idle" });
    expect(h.owner.bindings.get("space-proof-1")).toBeUndefined();
  });

  it("dispose drops bindings and later load fails without creating another image", () => {
    const h = harness();
    h.owner.load(SOURCE);
    h.elements[0].fireLoad();
    h.owner.dispose();
    expect(h.owner.bindings.get("space-proof-1")).toBeUndefined();
    h.owner.load(SOURCE);
    expect(h.owner.getSnapshot()).toEqual({ status: "failed", code: "DISPOSED" });
    expect(h.creates()).toBe(1);
  });

  it("isolates subscriber failures and supports unsubscribe", () => {
    const h = harness();
    let calls = 0;
    h.owner.subscribe(() => {
      throw new Error("PRIVATE_ERROR");
    });
    const unsubscribe = h.owner.subscribe(() => {
      calls += 1;
    });
    h.owner.load(SOURCE);
    expect(calls).toBe(1);
    unsubscribe();
    h.elements[0].fireLoad();
    expect(calls).toBe(1);
  });

  it("contains createImage, assignment and dimension getter failures", () => {
    const createFailure = createSpaceProofImageOwner({
      ports: {
        createImage: () => {
          throw new Error("PRIVATE_CREATE");
        },
      },
    });
    createFailure.load(SOURCE);
    expect(createFailure.getSnapshot()).toEqual({ status: "failed", code: "LOAD_FAILED" });

    const assignmentFailure = createSpaceProofImageOwner({
      ports: {
        createImage: () => ({
          onload: null,
          onerror: null,
          crossOrigin: null,
          set src(_value: string) {
            throw new Error("PRIVATE_ASSIGN");
          },
          get src() {
            return "";
          },
          naturalWidth: 1,
          naturalHeight: 1,
        }),
      },
    });
    assignmentFailure.load(SOURCE);
    expect(assignmentFailure.getSnapshot()).toEqual({ status: "failed", code: "LOAD_FAILED" });

    let fire: (() => unknown) | null = null;
    const dimensionFailure = createSpaceProofImageOwner({
      ports: {
        createImage: () => ({
          get onload() {
            return fire as never;
          },
          set onload(value) {
            fire = value;
          },
          onerror: null,
          crossOrigin: null,
          src: "",
          get naturalWidth(): number {
            throw new Error("PRIVATE_DIMENSION");
          },
          naturalHeight: 1,
        }),
      },
    });
    dimensionFailure.load(SOURCE);
    (fire as (() => unknown) | null)?.();
    expect(dimensionFailure.getSnapshot()).toEqual({ status: "failed", code: "LOAD_FAILED" });
    expect(JSON.stringify(dimensionFailure.getSnapshot())).not.toContain("PRIVATE");
  });
});
