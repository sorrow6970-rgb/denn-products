// Unit contract for the read-only binding combiner (spec 027 §연결 경계).

import { describe, expect, it } from "vitest";
import { createCompositeImageBindings, withImageRefPrefix } from "./compositeImageBindings";
import type { PreviewImageBindings } from "./types";

const drawable = (tag: string): CanvasImageSource => ({ tag }) as unknown as CanvasImageSource;

const source = (entries: Record<string, CanvasImageSource>): PreviewImageBindings => ({
  get: (imageRef: string) => entries[imageRef],
});

describe("createCompositeImageBindings", () => {
  it("returns the drawable identity from whichever source owns the ref", () => {
    const a = drawable("a");
    const b = drawable("b");
    const bindings = createCompositeImageBindings([
      source({ "user-image-1": a }),
      source({ "user-image-2": b }),
    ]);
    expect(bindings.get("user-image-1")).toBe(a);
    expect(bindings.get("user-image-2")).toBe(b);
  });

  it("asks sources in order and takes the first hit", () => {
    const first = drawable("first");
    const second = drawable("second");
    const asked: string[] = [];
    const bindings = createCompositeImageBindings([
      {
        get: (ref) => {
          asked.push("first");
          return ref === "shared" ? first : undefined;
        },
      },
      {
        get: (ref) => {
          asked.push("second");
          return ref === "shared" ? second : undefined;
        },
      },
    ]);
    expect(bindings.get("shared")).toBe(first);
    expect(asked).toEqual(["first"]); // the second source is not even consulted
  });

  it("returns undefined for an unknown ref and for no sources at all", () => {
    expect(createCompositeImageBindings([]).get("user-image-1")).toBeUndefined();
    expect(createCompositeImageBindings([source({})]).get("user-image-1")).toBeUndefined();
  });

  it("skips a throwing source without throwing", () => {
    const good = drawable("good");
    const bindings = createCompositeImageBindings([
      {
        get: () => {
          throw new Error("hostile source");
        },
      },
      source({ "user-image-1": good }),
    ]);
    let found: CanvasImageSource | undefined;
    expect(() => {
      found = bindings.get("user-image-1");
    }).not.toThrow();
    expect(found).toBe(good);
  });

  it("keeps two owners apart even though both number their images from 1", () => {
    // this is the real collision: every spec 026 owner hands out `user-image-1` first
    const zeroPhoto = drawable("zone-0");
    const onePhoto = drawable("zone-1");
    const bindings = createCompositeImageBindings([
      withImageRefPrefix("case-zone-0.", source({ "user-image-1": zeroPhoto })),
      withImageRefPrefix("case-zone-1.", source({ "user-image-1": onePhoto })),
    ]);
    expect(bindings.get("case-zone-0.user-image-1")).toBe(zeroPhoto);
    expect(bindings.get("case-zone-1.user-image-1")).toBe(onePhoto);
    expect(bindings.get("user-image-1")).toBeUndefined(); // an unprefixed ref belongs to nobody
  });

  it("takes a snapshot of the source list (a later push cannot add a binding)", () => {
    const sources: PreviewImageBindings[] = [source({})];
    const bindings = createCompositeImageBindings(sources);
    sources.push(source({ "user-image-1": drawable("late") }));
    expect(bindings.get("user-image-1")).toBeUndefined();
  });
});

describe("withImageRefPrefix", () => {
  it("answers only refs in its own namespace and strips the prefix once", () => {
    const photo = drawable("photo");
    const view = withImageRefPrefix("frame-image.", source({ "user-image-2": photo }));
    expect(view.get("frame-image.user-image-2")).toBe(photo);
    expect(view.get("user-image-2")).toBeUndefined();
    expect(view.get("other.user-image-2")).toBeUndefined();
    expect(view.get("frame-image.frame-image.user-image-2")).toBeUndefined();
  });

  it("produces refs that still satisfy the spec 020 identifier grammar", () => {
    for (const slotId of ["case-zone-0", "case-zone-11", "frame-image"]) {
      const ref = `${slotId}.user-image-1`;
      expect(ref).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
      expect(ref.length).toBeLessThanOrEqual(128);
    }
  });
});
