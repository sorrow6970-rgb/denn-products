// Unit contract for the template art owner (spec 028 §4). DOM-free: the image element is a fake
// port, so crossOrigin ordering, generations, failure and disposal are driven deterministically.
// Real decode, real CORS and real pixels are covered by the Chromium E2E, not here.

import { describe, expect, it } from "vitest";
import {
  createTemplateArtBindingController,
  type TemplateArtElementPort,
  type TemplateArtPorts,
} from "./templateArtBinding";

interface FakeElement {
  onload: ((...args: never[]) => unknown) | null;
  onerror: ((...args: never[]) => unknown) | null;
  crossOrigin: string | null;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  /** every property write in order — this is how "crossOrigin before src" is proven. */
  readonly writes: string[];
}

interface Harness {
  readonly ports: TemplateArtPorts;
  readonly elements: FakeElement[];
}

function harness(size: { width?: number; height?: number } = {}): Harness {
  const elements: FakeElement[] = [];
  return {
    elements,
    ports: {
      createImage: () => {
        const writes: string[] = [];
        const element = {
          onload: null,
          onerror: null,
          naturalWidth: size.width ?? 120,
          naturalHeight: size.height ?? 80,
          writes,
          _crossOrigin: null as string | null,
          _src: "",
        } as unknown as FakeElement & { _crossOrigin: string | null; _src: string };
        Object.defineProperty(element, "crossOrigin", {
          get: () => element._crossOrigin,
          set: (value: string | null) => {
            element._crossOrigin = value;
            writes.push(`crossOrigin=${String(value)}`);
          },
        });
        Object.defineProperty(element, "src", {
          get: () => element._src,
          set: (value: string) => {
            element._src = value;
            writes.push("src");
          },
        });
        elements.push(element);
        return element as unknown as TemplateArtElementPort;
      },
    },
  };
}

const fire = (element: FakeElement, event: "onload" | "onerror"): void => {
  const handler = element[event];
  if (handler) (handler as () => void)();
};

const DATA_SOURCE = { kind: "data-image", src: "data:image/png;base64,QQ" } as const;
const REMOTE_SOURCE = {
  kind: "firebase-download-image",
  src: "https://firebasestorage.googleapis.com/v0/b/bucket/o/a.png?alt=media&token=SECRETMARKER",
} as const;

describe("createTemplateArtBindingController — loading", () => {
  it("sets crossOrigin BEFORE src for a remote source", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    controller.load(REMOTE_SOURCE);
    expect(h.elements[0].writes).toEqual(["crossOrigin=anonymous", "src"]);
    expect(controller.getSnapshot()).toEqual({ status: "loading" });
  });

  it("sets no crossOrigin for a data source", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    controller.load(DATA_SOURCE);
    expect(h.elements[0].writes).toEqual(["src"]);
    expect(h.elements[0].crossOrigin).toBeNull();
  });

  it("becomes ready with a synthetic key and binds the drawable identity", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    controller.load(DATA_SOURCE);
    fire(h.elements[0], "onload");

    const state = controller.getSnapshot();
    expect(state.status).toBe("ready");
    if (state.status !== "ready") throw new Error(state.status);
    expect(state.imageRef).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    expect(state.imageRef).toBe("template-art-1");
    expect(controller.bindings.get(state.imageRef)).toBe(h.elements[0]);
    expect(controller.bindings.get("template-art-2")).toBeUndefined();
  });

  it("reports a load error with one safe code and never retries without crossOrigin", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    controller.load(REMOTE_SOURCE);
    fire(h.elements[0], "onerror");

    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "LOAD_FAILED" });
    expect(h.elements).toHaveLength(1); // no second element, i.e. no retry
    expect(controller.bindings.get("template-art-1")).toBeUndefined();
  });

  it.each([
    ["zero", 0, 80],
    ["NaN", Number.NaN, 80],
    ["zero height", 120, 0],
  ])("rejects a %s natural size", (_label, width, height) => {
    const h = harness({ width, height });
    const controller = createTemplateArtBindingController({ ports: h.ports });
    controller.load(DATA_SOURCE);
    fire(h.elements[0], "onload");
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "INVALID_DIMENSIONS" });
  });

  it.each([
    ["null", null],
    ["primitive", 42],
    ["unknown kind", { kind: "https-image", src: "https://x/y.png" }],
    ["blank src", { kind: "data-image", src: "" }],
    ["missing src", { kind: "data-image" }],
  ])("rejects an unusable source (%s) without throwing", (_label, source) => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    expect(() => controller.load(source as never)).not.toThrow();
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "INVALID_INPUT" });
    expect(h.elements).toHaveLength(0);
  });
});

describe("createTemplateArtBindingController — generations, cleanup, cache", () => {
  it("ignores a late completion of a superseded load", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    controller.load(DATA_SOURCE); // A
    controller.load(DATA_SOURCE); // B
    fire(h.elements[1], "onload");
    const settled = controller.getSnapshot();

    fire(h.elements[0], "onload");
    fire(h.elements[0], "onerror");

    expect(controller.getSnapshot()).toBe(settled);
    expect(h.elements[0].onload).toBeNull();
    expect(h.elements[0].onerror).toBeNull();
  });

  it("keeps NO cache: the same source after clear loads again from scratch", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    controller.load(DATA_SOURCE);
    fire(h.elements[0], "onload");
    const first = controller.getSnapshot();
    if (first.status !== "ready") throw new Error(first.status);

    controller.clear();
    expect(controller.getSnapshot()).toEqual({ status: "idle" });
    expect(controller.bindings.get(first.imageRef)).toBeUndefined();

    controller.load(DATA_SOURCE);
    expect(controller.getSnapshot()).toEqual({ status: "loading" }); // not served from a cache
    expect(h.elements).toHaveLength(2);
  });

  it("drops the previous binding as soon as a new load starts", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    controller.load(DATA_SOURCE);
    fire(h.elements[0], "onload");
    controller.load(DATA_SOURCE);
    expect(controller.bindings.get("template-art-1")).toBeUndefined();
  });

  it("dispose reclaims handlers, binding and listeners and closes later loads", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    let notifications = 0;
    controller.subscribe(() => {
      notifications += 1;
    });
    controller.load(DATA_SOURCE);
    fire(h.elements[0], "onload");
    const before = notifications;

    controller.dispose();
    expect(controller.bindings.get("template-art-1")).toBeUndefined();
    expect(notifications).toBe(before);
    expect(() => fire(h.elements[0], "onload")).not.toThrow();
    expect(() => controller.load(DATA_SOURCE)).not.toThrow();
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "DISPOSED" });
    expect(h.elements).toHaveLength(1);
  });
});

describe("createTemplateArtBindingController — leak safety", () => {
  it("keeps the source url, token and kind out of every public snapshot", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    const seen: string[] = [];
    controller.subscribe(() => seen.push(JSON.stringify(controller.getSnapshot())));

    controller.load(REMOTE_SOURCE);
    fire(h.elements[0], "onload");
    controller.load(REMOTE_SOURCE);
    fire(h.elements[1], "onerror");
    seen.push(JSON.stringify(controller.getSnapshot()));

    const serialized = seen.join("|");
    for (const forbidden of [
      "SECRETMARKER",
      "https",
      "firebasestorage",
      "token",
      "base64",
      "data:",
      "firebase-download-image",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("closes safely when the element port throws", () => {
    const controller = createTemplateArtBindingController({
      ports: {
        createImage: () => {
          throw new Error("hostile port");
        },
      },
    });
    expect(() => controller.load(DATA_SOURCE)).not.toThrow();
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "LOAD_FAILED" });
  });

  it("closes safely when the src setter throws", () => {
    const controller = createTemplateArtBindingController({
      ports: {
        createImage: () => {
          const element = {
            onload: null,
            onerror: null,
            crossOrigin: null,
            naturalWidth: 10,
            naturalHeight: 10,
          } as unknown as TemplateArtElementPort;
          Object.defineProperty(element, "src", {
            set() {
              throw new Error("hostile src setter");
            },
            get: () => "",
          });
          return element;
        },
      },
    });
    expect(() => controller.load(DATA_SOURCE)).not.toThrow();
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "LOAD_FAILED" });
  });

  it("accepts a real HTMLImageElement as the element port (compile-time)", () => {
    const satisfied: HTMLImageElement extends TemplateArtElementPort ? true : false = true;
    expect(satisfied).toBe(true);
  });
});

describe("createTemplateArtBindingController — source snapshot (보완 라운드 1)", () => {
  /** An object whose `key` getter counts reads and drifts after the first one. */
  const drifting = (
    key: "kind" | "src",
    first: unknown,
    later: unknown,
  ): { source: unknown; reads: () => number } => {
    const base: Record<string, unknown> = { kind: "data-image", src: "data:image/png;base64,QQ" };
    const source: Record<string, unknown> = { ...base };
    let reads = 0;
    Object.defineProperty(source, key, {
      get() {
        reads += 1;
        return reads === 1 ? first : later;
      },
      enumerable: true,
    });
    return { source, reads: () => reads };
  };

  it.each(["kind", "src"] as const)("reads source.%s exactly once", (key) => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    const drift = drifting(key, key === "kind" ? "data-image" : "data:image/png;base64,QQ", "");
    controller.load(drift.source as never);
    fire(h.elements[0], "onload");
    expect(drift.reads()).toBe(1);
    expect(controller.getSnapshot().status).toBe("ready");
  });

  it("uses the FIRST snapshot when the kind drifts to a remote kind", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    const drift = drifting("kind", "data-image", "firebase-download-image");
    controller.load(drift.source as never);
    // the drifted (remote) kind must not retroactively add a crossOrigin attribute
    expect(h.elements[0].writes).toEqual(["src"]);
    expect(drift.reads()).toBe(1);
  });

  it("uses the FIRST snapshot when the src drifts", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    const drift = drifting("src", "data:image/png;base64,FIRST", "data:image/png;base64,LATER");
    controller.load(drift.source as never);
    expect(h.elements[0].src).toBe("data:image/png;base64,FIRST");
    expect(drift.reads()).toBe(1);
  });

  it.each(["kind", "src"] as const)(
    "closes safely when source.%s throws instead of letting it escape",
    (key) => {
      const h = harness();
      const controller = createTemplateArtBindingController({ ports: h.ports });
      const source: Record<string, unknown> = {
        kind: "data-image",
        src: "data:image/png;base64,QQ",
      };
      delete source[key];
      Object.defineProperty(source, key, {
        get() {
          throw new Error("hostile source getter");
        },
        enumerable: true,
      });
      expect(() => controller.load(source as never)).not.toThrow();
      expect(controller.getSnapshot()).toEqual({ status: "failed", code: "INVALID_INPUT" });
      expect(h.elements).toHaveLength(0);
      expect(JSON.stringify(controller.getSnapshot())).not.toContain("hostile");
    },
  );

  it("closes safely for a throwing Proxy trap and a revoked Proxy", () => {
    const h = harness();
    const controller = createTemplateArtBindingController({ ports: h.ports });
    const trap = new Proxy(
      { kind: "data-image", src: "data:image/png;base64,QQ" },
      {
        get() {
          throw new Error("hostile trap");
        },
        has() {
          throw new Error("hostile has trap");
        },
      },
    );
    const revocable = Proxy.revocable({ kind: "data-image", src: "data:x" }, {});
    revocable.revoke();

    for (const hostile of [trap, revocable.proxy]) {
      expect(() => controller.load(hostile as never)).not.toThrow();
      expect(controller.getSnapshot()).toEqual({ status: "failed", code: "INVALID_INPUT" });
    }
    expect(h.elements).toHaveLength(0);
  });
});
