import { describe, expect, it } from "vitest";
import { inspectRoomBackgroundInput as inspect } from "./background-input";

const fail = (code: string) => ({ ok: false, code: `ROOM_BACKGROUND_${code}` });
const segment = (marker: number, data: number[]) => [
  255,
  marker,
  (data.length + 2) >> 8,
  (data.length + 2) & 255,
  ...data,
];
const sof = (marker = 192, components = 1) =>
  segment(marker, [
    8,
    0,
    2,
    0,
    3,
    components,
    ...Array.from({ length: components }, (_, i) => [i + 1, 17, 0]).flat(),
  ]);
const sos = (ids = [1]) => segment(218, [ids.length, ...ids.flatMap((id) => [id, 0]), 0, 63, 0]);
const check = (...parts: number[][]) =>
  inspect({
    bytes: new Uint8Array([255, 216, ...parts.flat(), 255, 217]),
    budget: { maxEdge: 8000 },
  });

describe("spec104 JPEG envelope (not entropy/lookup/EXIF validation)", () => {
  it.each([192, 194])("accepts SOF %i single/three components and multiple scans", (marker) => {
    expect(check(sof(marker), sos(), [17]).ok).toBe(true);
    expect(check(sof(marker, 3), sos([1, 2, 3]), [17], sos([2]), [18]).ok).toBe(true);
  });
  it("walks stuffed bytes, fill and restarts without decoding", () => {
    expect(check(sof(), sos(), [17, 255, 0, 255, 208, 17, 255, 255, 209, 18]).ok).toBe(true);
    expect(check([255], sof(), sos(), [17]).ok).toBe(true);
    expect(check([255, 208], sof(), sos(), [17])).toEqual(fail("MALFORMED_INPUT"));
  });
  it("does not search embedded APP/COM bytes for frame or EXIF orientation", () => {
    expect(
      check(
        segment(225, [69, 120, 105, 102, 0, 0, 255, 216, ...sof(), 255, 217]),
        sof(),
        sos(),
        [1],
      ),
    ).toMatchObject({
      ok: true,
      encodedWidth: 3,
      orientation: "NOT_VERIFIED",
      decodeAllowed: false,
    });
  });
  it.each([193, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207, 220, 222, 223])(
    "rejects unsupported process/marker %i",
    (marker) => {
      expect(check(segment(marker, [1, 2]), sof(), sos(), [1])).toEqual(
        fail("UNSUPPORTED_STRUCTURE"),
      );
    },
  );
  it("rejects precision/component profiles outside the contract", () => {
    const precision = sof();
    precision[4] = 12;
    expect(check(precision, sos(), [1])).toEqual(fail("UNSUPPORTED_STRUCTURE"));
    expect(check(sof(192, 4), sos(), [1])).toEqual(fail("UNSUPPORTED_STRUCTURE"));
  });
  it("checks frame length, duplicate IDs, sampling, lookups and dimensions", () => {
    const mutations = [
      (b: number[]) => {
        b[3]--;
      },
      (b: number[]) => {
        b[10] = b[13];
      },
      (b: number[]) => {
        b[11] = 0;
      },
      (b: number[]) => {
        b[11] = 81;
      },
      (b: number[]) => {
        b[11] = 21;
      },
      (b: number[]) => {
        b[12] = 4;
      },
      (b: number[]) => {
        b[5] = 0;
        b[6] = 0;
      },
    ];
    for (const mutate of mutations) {
      const b = sof(192, 3);
      mutate(b);
      expect(check(b, sos(), [1])).toEqual(fail("MALFORMED_INPUT"));
    }
    expect(check(sof(), sof(), sos(), [1])).toEqual(fail("MALFORMED_INPUT"));
  });
  it("validates scan/frame references, count and lookup selector", () => {
    expect(check(sos(), sof(), [1])).toEqual(fail("MALFORMED_INPUT"));
    for (const ids of [[], [2], [1, 1], [1, 2, 3, 4]]) {
      expect(check(sof(), sos(ids), [1])).toEqual(fail("MALFORMED_INPUT"));
    }
    expect(check(sof(192, 3), sos([1, 1]), [1])).toEqual(fail("MALFORMED_INPUT"));
    for (const selector of [64, 4]) {
      const b = sos();
      b[6] = selector;
      expect(check(sof(), b, [1])).toEqual(fail("MALFORMED_INPUT"));
    }
  });
  it("accepts bounded lookups/comments, checks DRI length but not lookup payloads", () => {
    expect(
      check(
        segment(219, [0]),
        segment(196, [0]),
        segment(221, [0, 1]),
        segment(254, []),
        sof(),
        sos(),
        [1],
      ).ok,
    ).toBe(true);
    expect(check(segment(221, [0]), sof(), sos(), [1])).toEqual(fail("MALFORMED_INPUT"));
  });
  it("rejects truncated prefixes, missing scan, repeat SOI and trailing data", () => {
    const bytes = new Uint8Array([255, 216, ...sof(), ...sos(), 1, 255, 217]);
    for (let n = 0; n < bytes.length; n++) {
      expect(inspect({ bytes: bytes.subarray(0, n), budget: { maxEdge: 8000 } }).ok).toBe(false);
    }
    for (const parts of [[sof()], [sof(), sos(), [255, 216]], [sof(), sos(), [255, 217, 1]]]) {
      expect(check(...parts)).toEqual(fail("MALFORMED_INPUT"));
    }
    expect(check([255, 224, 255, 255])).toEqual(fail("MALFORMED_INPUT"));
    expect(check([255, 224, 0, 1])).toEqual(fail("MALFORMED_INPUT"));
    expect(check([1, 2, 3])).toEqual(fail("MALFORMED_INPUT"));
  });
  it("counts SOI, SOF, SOS and EOI as four markers; stuffing/fill do not count", () => {
    const extra = segment(254, []);
    expect(check(...Array.from({ length: 4092 }, () => extra), sof(), sos(), [1, 255, 0]).ok).toBe(
      true,
    );
    expect(check(...Array.from({ length: 4093 }, () => extra), sof(), sos(), [1])).toEqual(
      fail("SCAN_LIMIT"),
    );
    expect(check(sof(), sos(), ...Array.from({ length: 4093 }, () => [255, 208]), [1])).toEqual(
      fail("SCAN_LIMIT"),
    );
  });
});
