// Unit contract for the local user image binding owner (spec 026 §테스트 unit). Deterministic and
// DOM-free: every browser call goes through fake ports, so decode success/failure, replacement and
// disposal are driven explicitly. Real decode, real blob URLs and device behaviour are covered by
// the Chromium E2E fixture, not here.

import { describe, expect, it } from "vitest";
import {
  createLocalImageBindingController,
  type LocalImageBindingPorts,
  type LocalImageBindingState,
  type LocalImageElementPort,
} from "./localImageBinding";

interface FakeElement {
  onload: ((...args: never[]) => unknown) | null;
  onerror: ((...args: never[]) => unknown) | null;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

interface Harness {
  readonly ports: LocalImageBindingPorts;
  readonly created: string[];
  readonly revoked: string[];
  readonly elements: FakeElement[];
}

function harness(options: { width?: number; height?: number } = {}): Harness {
  const created: string[] = [];
  const revoked: string[] = [];
  const elements: FakeElement[] = [];
  let next = 0;
  return {
    created,
    revoked,
    elements,
    ports: {
      createObjectUrl: () => {
        next += 1;
        const url = `blob:fake/${next}`;
        created.push(url);
        return url;
      },
      revokeObjectUrl: (url) => {
        revoked.push(url);
      },
      createImage: () => {
        const element: FakeElement = {
          onload: null,
          onerror: null,
          src: "",
          naturalWidth: options.width ?? 100,
          naturalHeight: options.height ?? 50,
        };
        elements.push(element);
        return element;
      },
    },
  };
}

const blob = (): Blob => new Blob(["fake-image-bytes"], { type: "image/png" });
const fire = (element: FakeElement, event: "onload" | "onerror"): void => {
  const handler = element[event];
  if (handler) (handler as () => void)();
};
const readyState = (
  state: LocalImageBindingState,
): Extract<LocalImageBindingState, { status: "ready" }> => {
  expect(state.status).toBe("ready");
  if (state.status !== "ready") throw new Error(state.status);
  return state;
};

describe("createLocalImageBindingController — construction", () => {
  it("touches no browser API at import or construction (node env, no DOM)", () => {
    // This whole file runs in the node environment: there is no `Image`, and nothing below may
    // reach for one until a load actually happens.
    expect(typeof (globalThis as { Image?: unknown }).Image).toBe("undefined");
    const controller = createLocalImageBindingController();
    expect(controller.getSnapshot()).toEqual({ status: "idle" });
    expect(controller.bindings.get("user-image-1")).toBeUndefined();
    const unsubscribe = controller.subscribe(() => undefined);
    unsubscribe();
    controller.clear();
    controller.dispose();
  });

  it("closes a default-port load safely when the browser API is absent (no throw)", () => {
    const controller = createLocalImageBindingController();
    expect(() => controller.load(blob())).not.toThrow();
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "DECODE_FAILED" });
  });

  it("accepts a real HTMLImageElement as the element port (compile-time)", () => {
    const satisfied: HTMLImageElement extends LocalImageElementPort ? true : false = true;
    expect(satisfied).toBe(true);
  });
});

describe("createLocalImageBindingController — load", () => {
  it("goes idle → loading → ready with the intrinsic size and the fixed transform", () => {
    const h = harness({ width: 640, height: 480 });
    const controller = createLocalImageBindingController({ ports: h.ports });
    const seen: string[] = [];
    controller.subscribe(() => seen.push(controller.getSnapshot().status));

    controller.load(blob());
    expect(controller.getSnapshot()).toEqual({ status: "loading" });
    fire(h.elements[0], "onload");

    const state = readyState(controller.getSnapshot());
    expect(state.imageState.intrinsicSize).toEqual({ width: 640, height: 480 });
    expect(state.imageState.transform).toEqual({ scale: 1, x: 0, y: 0 });
    expect(seen).toEqual(["loading", "ready"]);
  });

  it("synthesizes a spec 020 imageRef that increments and ignores the file name", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    const named = Object.assign(new Blob(["x"], { type: "image/png" }), {
      name: "SECRET_FILE_MARKER.png",
    });

    controller.load(named);
    fire(h.elements[0], "onload");
    const first = readyState(controller.getSnapshot()).imageState.imageRef;
    controller.load(named);
    fire(h.elements[1], "onload");
    const second = readyState(controller.getSnapshot()).imageState.imageRef;

    expect(first).toBe("user-image-1");
    expect(second).toBe("user-image-2");
    for (const ref of [first, second]) {
      expect(ref).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
      expect(ref.length).toBeLessThanOrEqual(128);
      expect(ref).not.toContain("SECRET_FILE_MARKER");
    }
  });

  it("binds the drawable identity under exactly the ready imageRef", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob());
    expect(controller.bindings.get("user-image-1")).toBeUndefined(); // still loading
    fire(h.elements[0], "onload");

    const ref = readyState(controller.getSnapshot()).imageState.imageRef;
    expect(controller.bindings.get(ref)).toBe(h.elements[0]);
    expect(controller.bindings.get("user-image-999")).toBeUndefined();
    expect(controller.bindings.get("")).toBeUndefined();
  });

  it("revokes the object URL only after the decode completed, keeping the binding", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob());
    expect(h.revoked).toEqual([]); // still decoding — revoking now could break the load
    fire(h.elements[0], "onload");

    expect(h.revoked).toEqual([h.created[0]]);
    const ref = readyState(controller.getSnapshot()).imageState.imageRef;
    expect(controller.bindings.get(ref)).toBe(h.elements[0]);
  });

  it("reports a decode error without a binding, revoking exactly once", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob());
    fire(h.elements[0], "onerror");

    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "DECODE_FAILED" });
    expect(controller.bindings.get("user-image-1")).toBeUndefined();
    expect(h.revoked).toEqual([h.created[0]]);
  });

  it.each([
    ["zero", 0, 50],
    ["negative", -10, 50],
    ["NaN", Number.NaN, 50],
    ["Infinity", Number.POSITIVE_INFINITY, 50],
    ["zero height", 100, 0],
  ])("rejects a %s natural size as INVALID_DIMENSIONS", (_label, width, height) => {
    const h = harness({ width, height });
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob());
    fire(h.elements[0], "onload");

    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "INVALID_DIMENSIONS" });
    expect(controller.bindings.get("user-image-1")).toBeUndefined();
    expect(h.revoked).toEqual([h.created[0]]);
  });

  it.each([null, undefined, 42, "blob"])(
    "rejects a malformed input (%s) as INVALID_INPUT without throwing",
    (value) => {
      const h = harness();
      const controller = createLocalImageBindingController({ ports: h.ports });
      expect(() => controller.load(value as unknown as Blob)).not.toThrow();
      expect(controller.getSnapshot()).toEqual({ status: "failed", code: "INVALID_INPUT" });
      expect(h.created).toEqual([]);
    },
  );

  it("does not mutate or retain the input blob", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    const input = blob();
    const before = { size: input.size, type: input.type };
    controller.load(input);
    fire(h.elements[0], "onload");
    expect({ size: input.size, type: input.type }).toEqual(before);
    expect(JSON.stringify(controller.getSnapshot())).not.toContain("image/png");
  });
});

describe("createLocalImageBindingController — generations and replacement", () => {
  it("ignores a late success of a superseded load", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob()); // A
    controller.load(blob()); // B supersedes A
    fire(h.elements[1], "onload"); // B finishes
    const refB = readyState(controller.getSnapshot()).imageState.imageRef;

    const settled = controller.getSnapshot();
    fire(h.elements[0], "onload"); // A arrives late

    expect(controller.getSnapshot()).toBe(settled); // same reference: nothing changed
    expect(readyState(controller.getSnapshot()).imageState.imageRef).toBe(refB);
    // the only bound drawable is B's element — A's is unreachable under every ref
    expect(controller.bindings.get(refB)).toBe(h.elements[1]);
    for (const ref of ["user-image-1", "user-image-2", "user-image-3"]) {
      expect(controller.bindings.get(ref)).not.toBe(h.elements[0]);
    }
  });

  it("ignores a late failure of a superseded load", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob());
    controller.load(blob());
    fire(h.elements[1], "onload");
    const ready = controller.getSnapshot();

    fire(h.elements[0], "onerror");

    expect(controller.getSnapshot()).toBe(ready);
  });

  it("detaches and revokes the superseded load immediately", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob());
    controller.load(blob());

    expect(h.elements[0].onload).toBeNull();
    expect(h.elements[0].onerror).toBeNull();
    expect(h.revoked).toEqual([h.created[0]]);
  });

  it("removes the previous binding as soon as a new load starts", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob());
    fire(h.elements[0], "onload");
    const refA = readyState(controller.getSnapshot()).imageState.imageRef;

    controller.load(blob());
    expect(controller.getSnapshot()).toEqual({ status: "loading" });
    expect(controller.bindings.get(refA)).toBeUndefined();
  });

  it("revokes every created URL exactly once across a replace/clear sequence", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob());
    controller.load(blob());
    fire(h.elements[1], "onload");
    controller.load(blob());
    fire(h.elements[2], "onerror");
    controller.clear();

    expect(h.created).toHaveLength(3);
    expect([...h.revoked].sort()).toEqual([...h.created].sort());
    expect(new Set(h.revoked).size).toBe(h.revoked.length);
  });
});

describe("createLocalImageBindingController — clear and dispose", () => {
  it("clear cancels the pending load, drops the binding and returns to idle", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob());
    fire(h.elements[0], "onload");
    const ref = readyState(controller.getSnapshot()).imageState.imageRef;
    controller.load(blob()); // pending

    controller.clear();

    expect(controller.getSnapshot()).toEqual({ status: "idle" });
    expect(controller.bindings.get(ref)).toBeUndefined();
    expect(h.elements[1].onload).toBeNull();
    expect(h.revoked).toEqual([...h.created]);
  });

  it("a cleared pending load cannot come back", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.load(blob());
    controller.clear();
    fire(h.elements[0], "onload");
    expect(controller.getSnapshot()).toEqual({ status: "idle" });
    expect(controller.bindings.get("user-image-1")).toBeUndefined();
  });

  it("dispose reclaims the pending handler, URL, binding and listeners", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    let notifications = 0;
    controller.subscribe(() => {
      notifications += 1;
    });
    controller.load(blob());
    fire(h.elements[0], "onload");
    const ref = readyState(controller.getSnapshot()).imageState.imageRef;
    const before = notifications;

    controller.dispose();

    expect(controller.bindings.get(ref)).toBeUndefined();
    expect(h.revoked).toEqual([...h.created]);
    expect(notifications).toBe(before); // dispose itself notifies nobody
  });

  it("neutralises callbacks after dispose and never throws", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    let notifications = 0;
    controller.subscribe(() => {
      notifications += 1;
    });
    controller.load(blob());
    controller.dispose();

    expect(() => fire(h.elements[0], "onload")).not.toThrow();
    expect(() => controller.clear()).not.toThrow();
    expect(() => controller.dispose()).not.toThrow();
    expect(() => controller.load(blob())).not.toThrow();

    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "DISPOSED" });
    expect(controller.bindings.get("user-image-1")).toBeUndefined();
    expect(notifications).toBe(1); // only the "loading" transition before dispose
    expect(h.created).toHaveLength(1); // the post-dispose load creates no URL
  });

  it("never calls a listener after it unsubscribed", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    let calls = 0;
    const unsubscribe = controller.subscribe(() => {
      calls += 1;
    });
    controller.load(blob());
    expect(calls).toBe(1);

    unsubscribe();
    fire(h.elements[0], "onload");
    controller.clear();
    expect(calls).toBe(1);
  });

  it("a throwing listener cannot break the owner", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    controller.subscribe(() => {
      throw new Error("hostile listener");
    });
    let reached = 0;
    controller.subscribe(() => {
      reached += 1;
    });

    expect(() => controller.load(blob())).not.toThrow();
    expect(() => fire(h.elements[0], "onload")).not.toThrow();
    expect(reached).toBe(2);
    expect(controller.getSnapshot().status).toBe("ready");
  });
});

describe("createLocalImageBindingController — hostile ports and leak safety", () => {
  const base = (): LocalImageBindingPorts => harness().ports;

  it("closes safely when createObjectUrl throws", () => {
    const ports: LocalImageBindingPorts = {
      ...base(),
      createObjectUrl: () => {
        throw new Error("hostile url port");
      },
    };
    const controller = createLocalImageBindingController({ ports });
    expect(() => controller.load(blob())).not.toThrow();
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "INVALID_INPUT" });
  });

  it.each(["", 42])("closes safely when createObjectUrl returns a non-URL (%s)", (value) => {
    const ports: LocalImageBindingPorts = {
      ...base(),
      createObjectUrl: () => value as unknown as string,
    };
    const controller = createLocalImageBindingController({ ports });
    controller.load(blob());
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "INVALID_INPUT" });
  });

  it("closes safely and still revokes when createImage throws", () => {
    const h = harness();
    const ports: LocalImageBindingPorts = {
      ...h.ports,
      createImage: () => {
        throw new Error("hostile image port");
      },
    };
    const controller = createLocalImageBindingController({ ports });
    expect(() => controller.load(blob())).not.toThrow();
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "DECODE_FAILED" });
    expect(h.revoked).toEqual([...h.created]);
  });

  it("closes safely when the src setter throws", () => {
    const h = harness();
    const ports: LocalImageBindingPorts = {
      ...h.ports,
      createImage: () => {
        const element = {
          onload: null,
          onerror: null,
          naturalWidth: 10,
          naturalHeight: 10,
        } as unknown as LocalImageElementPort;
        Object.defineProperty(element, "src", {
          set() {
            throw new Error("hostile src setter");
          },
          get: () => "",
        });
        return element;
      },
    };
    const controller = createLocalImageBindingController({ ports });
    expect(() => controller.load(blob())).not.toThrow();
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "DECODE_FAILED" });
    expect(h.revoked).toEqual([...h.created]);
  });

  it("closes safely when a natural-size getter throws", () => {
    const h = harness();
    let created: LocalImageElementPort | null = null;
    const ports: LocalImageBindingPorts = {
      ...h.ports,
      createImage: () => {
        const element = {
          onload: null,
          onerror: null,
          src: "",
        } as unknown as LocalImageElementPort;
        Object.defineProperty(element, "naturalWidth", {
          get() {
            throw new Error("hostile size getter");
          },
        });
        Object.defineProperty(element, "naturalHeight", { get: () => 10 });
        created = element;
        return element;
      },
    };
    const controller = createLocalImageBindingController({ ports });
    controller.load(blob());
    const element = created as LocalImageElementPort | null;
    expect(element).not.toBeNull();
    expect(() => (element?.onload as (() => void) | null)?.()).not.toThrow();
    expect(controller.getSnapshot()).toEqual({ status: "failed", code: "DECODE_FAILED" });
  });

  it("closes safely when revokeObjectUrl throws", () => {
    const h = harness();
    const ports: LocalImageBindingPorts = {
      ...h.ports,
      revokeObjectUrl: () => {
        throw new Error("hostile revoke port");
      },
    };
    const controller = createLocalImageBindingController({ ports });
    controller.load(blob());
    expect(() => fire(h.elements[0], "onload")).not.toThrow();
    expect(controller.getSnapshot().status).toBe("ready");
  });

  it("keeps URLs, file names, MIME strings and exceptions out of every snapshot", () => {
    const h = harness();
    const controller = createLocalImageBindingController({ ports: h.ports });
    const snapshots: string[] = [];
    controller.subscribe(() => snapshots.push(JSON.stringify(controller.getSnapshot())));

    controller.load(
      Object.assign(new Blob(["x"], { type: "image/png" }), { name: "SECRET_FILE_MARKER.png" }),
    );
    fire(h.elements[0], "onload");
    controller.load(blob());
    fire(h.elements[1], "onerror");
    snapshots.push(JSON.stringify(controller.getSnapshot()));

    const serialized = snapshots.join("|");
    for (const forbidden of [
      "blob:",
      "SECRET_FILE_MARKER",
      "image/png",
      "base64",
      "data:",
      "hostile",
      "Error",
      "fake/",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
