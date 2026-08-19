import { describe, expect, it } from "vitest";
import { readSpaceDocument, readSpaceScene } from "./read";

const envelope = {
  salt: "AAECAwQFBgcICQoLDA0ODw==",
  iv: "EBESExQVFhcYGRob",
  ct: "l+K0Xv7nnslbRvPYSyv2Wn8V4pOc4gjyqtr55KOL3Pr4yz7eh5vAcatSzVALe0bz+8ayWLPxP3AK1SH4SafChPBViBC9",
};

const fullScene = () => ({
  schema: "space-scene-v1",
  futureTop: "ignored",
  design: {
    tplId: "tpl-1",
    sizeId: "size-1",
    colorId: "#FFFFFF",
    texts: { main: "안녕", name: "DENN", name2: "둘", date: "2026", sub: "sub", future: "ignored" },
    photoUrl: "https://example.invalid/photo.png",
    imgT: { scale: 1.25, x: 2, y: -3, rot: 1, future: 9 },
    clockOn: true,
    future: "ignored",
  },
  room: {
    bgId: "room-1",
    guideIndex: 2,
    guideBgUrl: "https://example.invalid/room.png",
    pos: { x: 0.5, y: 0.4, future: 1 },
    sunOn: false,
    sunPos: { x: 0.2, y: 0.3 },
    controls: { "rm-size": "110", "sg-on": 1, enabled: true },
    settings: { guideScale: 1.1, nested: { keep: true } },
    common: { frameCenterX: 0.5 },
    gallery: [
      {
        name: "배경 1",
        bgId: "guide-1",
        url: "https://example.invalid/guide.png",
        settings: { guideScale: 0.9 },
        future: "ignored",
      },
    ],
    future: "ignored",
  },
});

describe("space-v1 document reader", () => {
  it("projects the known legacy document fields and ignores additions", () => {
    expect(
      readSpaceDocument({
        schema: "space-v1",
        enc: { ...envelope, future: true },
        ownerMeta: { label: "고객 A", privateNote: "ignored" },
        createdAt: "2026-08-19T00:00:00.000Z",
        future: true,
      }),
    ).toEqual({
      ok: true,
      value: {
        schema: "space-v1",
        enc: envelope,
        ownerLabel: "고객 A",
        createdAt: "2026-08-19T00:00:00.000Z",
      },
    });
  });

  it("accepts omitted optional metadata from older documents", () => {
    expect(readSpaceDocument({ schema: "space-v1", enc: envelope })).toEqual({
      ok: true,
      value: { schema: "space-v1", enc: envelope, ownerLabel: "", createdAt: "" },
    });
  });

  it.each([
    null,
    {},
    { schema: "space-v2", enc: envelope },
    { schema: "space-v1", enc: { ...envelope, salt: "AA==" } },
    { schema: "space-v1", enc: { ...envelope, iv: "AA-_" } },
    { schema: "space-v1", enc: envelope, ownerMeta: { label: 1 } },
    { schema: "space-v1", enc: envelope, createdAt: 1 },
  ])("rejects malformed documents without echoing input", (value) => {
    const result = readSpaceDocument(value);
    expect(result).toEqual({ ok: false, code: "SPACE_INVALID_DOCUMENT" });
    expect(JSON.stringify(result)).not.toContain(envelope.ct);
  });

  it("fails closed for hostile document access", () => {
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error("secret");
        },
      },
    );
    expect(readSpaceDocument(hostile)).toEqual({ ok: false, code: "SPACE_INVALID_DOCUMENT" });
  });
});

describe("space-scene-v1 reader", () => {
  it("projects every known design/room field into a detached snapshot", () => {
    const input = fullScene();
    const result = readSpaceScene(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      schema: "space-scene-v1",
      design: {
        tplId: "tpl-1",
        sizeId: "size-1",
        colorId: "#FFFFFF",
        texts: { main: "안녕", name: "DENN", name2: "둘", date: "2026", sub: "sub" },
        photoUrl: "https://example.invalid/photo.png",
        imgT: { scale: 1.25, x: 2, y: -3, rot: 1 },
        clockOn: true,
      },
      room: {
        bgId: "room-1",
        guideIndex: 2,
        guideBgUrl: "https://example.invalid/room.png",
        pos: { x: 0.5, y: 0.4 },
        sunOn: false,
        sunPos: { x: 0.2, y: 0.3 },
        controls: { "rm-size": "110", "sg-on": 1, enabled: true },
        settings: { guideScale: 1.1, nested: { keep: true } },
        common: { frameCenterX: 0.5 },
        gallery: [
          {
            name: "배경 1",
            bgId: "guide-1",
            url: "https://example.invalid/guide.png",
            settings: { guideScale: 0.9 },
          },
        ],
      },
    });
    expect(result.value).not.toBe(input);
    expect(result.value.room.settings).not.toBe(input.room.settings);
    input.room.settings.guideScale = 9;
    expect(result.value.room.settings).toMatchObject({ guideScale: 1.1 });
  });

  it("accepts a minimal older scene and supplies neutral missing fields", () => {
    expect(readSpaceScene({ schema: "space-scene-v1", design: {}, room: {} })).toEqual({
      ok: true,
      value: {
        schema: "space-scene-v1",
        design: {
          tplId: null,
          sizeId: null,
          colorId: null,
          texts: { main: "", name: "", name2: "", date: "", sub: "" },
          imgT: null,
        },
        room: {
          bgId: null,
          guideIndex: null,
          pos: null,
          sunPos: null,
          controls: {},
          settings: null,
          common: null,
          gallery: [],
        },
      },
    });
  });

  it("treats nullable legacy collections as their neutral values", () => {
    const result = readSpaceScene({
      schema: "space-scene-v1",
      design: { texts: null },
      room: { controls: null, gallery: null },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.design.texts).toEqual({ main: "", name: "", name2: "", date: "", sub: "" });
    expect(result.value.room.controls).toEqual({});
    expect(result.value.room.gallery).toEqual([]);
  });

  it.each([
    null,
    {},
    { schema: "space-scene-v2", design: {}, room: {} },
    { schema: "space-scene-v1", design: { tplId: 1 }, room: {} },
    { schema: "space-scene-v1", design: { texts: { main: 1 } }, room: {} },
    { schema: "space-scene-v1", design: { imgT: { scale: 1, x: 0, y: Number.NaN } }, room: {} },
    { schema: "space-scene-v1", design: { clockOn: 1 }, room: {} },
    { schema: "space-scene-v1", design: {}, room: { guideIndex: -1 } },
    { schema: "space-scene-v1", design: {}, room: { pos: { x: Number.POSITIVE_INFINITY, y: 0 } } },
    { schema: "space-scene-v1", design: {}, room: { controls: { bad: {} } } },
    { schema: "space-scene-v1", design: {}, room: { settings: { bad: 1n } } },
    { schema: "space-scene-v1", design: {}, room: { gallery: [{ name: "x", bgId: "y" }] } },
  ])("rejects invalid known scene fields", (value) => {
    expect(readSpaceScene(value)).toEqual({ ok: false, code: "SPACE_INVALID_SCENE" });
  });

  it("rejects circular and hostile opaque data without leaking raw errors", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(
      readSpaceScene({ schema: "space-scene-v1", design: {}, room: { settings: circular } }),
    ).toEqual({
      ok: false,
      code: "SPACE_INVALID_SCENE",
    });
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error("secret-url");
        },
      },
    );
    const result = readSpaceScene(hostile);
    expect(result).toEqual({ ok: false, code: "SPACE_INVALID_SCENE" });
    expect(JSON.stringify(result)).not.toContain("secret-url");
  });
});
