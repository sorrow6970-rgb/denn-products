import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoomBackgroundPngCapabilityProbe } from "./background-png-capability";

afterEach(() => vi.unstubAllGlobals());

function environment(mode = "match") {
  const colors = [
    [240, 32, 32],
    [32, 224, 48],
    [32, 64, 224],
    [240, 208, 32],
  ];
  const maps = [
    [0, 1, 2, 3],
    [1, 0, 3, 2],
    [2, 3, 0, 1],
    [3, 2, 1, 0],
    [0, 3, 2, 1],
    [3, 0, 1, 2],
    [2, 1, 0, 3],
    [1, 2, 3, 0],
  ];
  const closes = vi.fn(() => {
    if (mode === "close-throw") throw new Error("sensitive-native-error");
  });
  const canvases: { width: number; height: number }[] = [];
  const decode = vi.fn(async (blob: Blob) => {
    if (mode === "reject") throw new Error("sensitive-native-error");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(bytes.buffer);
    const w = view.getUint32(16),
      h = view.getUint32(20);
    const orientation = bytes[37] === 101 ? view.getUint16(59, true) : 0;
    const swap = mode !== "identity" && orientation >= 5;
    return {
      width: mode === "size" ? 49 : swap ? h : w,
      height: swap ? w : h,
      orientation,
      close: closes,
    };
  });
  const createElement = vi.fn(() => {
    let orientation = 0,
      sample = 0;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () =>
        mode === "context"
          ? null
          : {
              drawImage: (bitmap: { orientation: number }) => {
                orientation = bitmap.orientation;
              },
              getImageData: () => {
                const index = sample++;
                const mapped =
                  mode === "identity" ? index : maps[Math.max(1, orientation) - 1][index];
                const data = [...colors[mapped], mode === "alpha" ? 0 : 255];
                if (mode === "color") data[0] ^= 1;
                return { data };
              },
            },
    };
    canvases.push(canvas);
    return canvas;
  });
  vi.stubGlobal("document", { createElement });
  vi.stubGlobal("createImageBitmap", decode);
  return { decode, closes, createElement, canvases };
}

describe("spec117 synthetic PNG capability, never photo permission", () => {
  it("uses the independently generated fixed bytes and closes before each next decode", async () => {
    const e = environment();
    const decode = e.decode.getMockImplementation();
    if (!decode) throw new Error("missing fake");
    e.decode.mockImplementation((blob) => {
      expect(e.closes).toHaveBeenCalledTimes(e.decode.mock.calls.length - 1);
      return decode(blob);
    });
    await createRoomBackgroundPngCapabilityProbe().run();
    const hash = createHash("sha256");
    for (const [blob] of e.decode.mock.calls) hash.update(new Uint8Array(await blob.arrayBuffer()));
    expect(hash.digest("hex")).toBe(
      "8fbfee562fa7054e2f0b4db7a5f8bf4cc25334f709a56def01fb3b5a763e89fe",
    );
  });
  it("factory has zero I/O, caches one promise and closes all 18 before success", async () => {
    const e = environment();
    const probe = createRoomBackgroundPngCapabilityProbe();
    expect(e.decode).not.toHaveBeenCalled();
    expect(e.createElement).not.toHaveBeenCalled();
    const pending = probe.run();
    expect(pending).toBe(probe.run());
    const result = await pending;
    expect(result).toEqual({
      status: "synthetic-match",
      reason: "complete",
      checked: 18,
      matched: 18,
      decodeAllowed: false,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(probe)).toBe(true);
    expect(e.decode).toHaveBeenCalledTimes(18);
    expect(e.closes).toHaveBeenCalledTimes(18);
    expect(e.canvases.every((c) => c.width === 0 && c.height === 0)).toBe(true);
    probe.dispose();
    expect(probe.run()).toBe(pending);
  });
  it("reports ignored orientation without accepting either result as a match", async () => {
    const e = environment("identity");
    expect(await createRoomBackgroundPngCapabilityProbe().run()).toEqual({
      status: "not-proven",
      reason: "mismatch",
      checked: 18,
      matched: 4,
      decodeAllowed: false,
    });
    expect(e.closes).toHaveBeenCalledTimes(18);
  });
  it.each(["color", "alpha"])("rejects %s mismatch", async (mode) => {
    const e = environment(mode);
    expect(await createRoomBackgroundPngCapabilityProbe().run()).toMatchObject({
      status: "not-proven",
      reason: "mismatch",
      checked: 18,
      matched: 0,
      decodeAllowed: false,
    });
    expect(e.closes).toHaveBeenCalledTimes(18);
  });
  it.each(["reject", "size", "context", "close-throw"])("fails closed on %s", async (mode) => {
    const e = environment(mode);
    const result = await createRoomBackgroundPngCapabilityProbe().run();
    expect(result).toEqual({
      status: "not-proven",
      reason: "failed",
      checked: 0,
      matched: 0,
      decodeAllowed: false,
    });
    expect(JSON.stringify(result)).not.toContain("sensitive");
    expect(e.decode).toHaveBeenCalledTimes(1);
    expect(e.closes).toHaveBeenCalledTimes(mode === "reject" ? 0 : 1);
    expect(e.canvases.every((c) => c.width === 0 && c.height === 0)).toBe(true);
    if (mode === "size") expect(e.createElement).not.toHaveBeenCalled();
  });
  it.each(["document", "createImageBitmap", "atob", "Blob"])(
    "missing %s is not proven",
    async (name) => {
      const e = environment();
      vi.stubGlobal(name, undefined);
      expect(await createRoomBackgroundPngCapabilityProbe().run()).toMatchObject({
        status: "not-proven",
        reason: "unavailable",
        checked: 0,
        decodeAllowed: false,
      });
      expect(e.decode).not.toHaveBeenCalled();
    },
  );
  it("dispose before run uses no browser APIs", async () => {
    const e = environment();
    const probe = createRoomBackgroundPngCapabilityProbe();
    probe.dispose();
    expect(await probe.run()).toMatchObject({
      reason: "disposed",
      checked: 0,
      decodeAllowed: false,
    });
    expect(e.decode).not.toHaveBeenCalled();
    expect(e.createElement).not.toHaveBeenCalled();
  });
  it("pending dispose waits for physical completion, closes late bitmap and stops", async () => {
    const e = environment();
    let resolve!: (bitmap: ImageBitmap) => void;
    e.decode.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r as typeof resolve;
        }),
    );
    const probe = createRoomBackgroundPngCapabilityProbe();
    const pending = probe.run();
    await Promise.resolve();
    probe.dispose();
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    resolve({ width: 48, height: 32, close: e.closes } as unknown as ImageBitmap);
    expect(await pending).toMatchObject({ reason: "disposed", checked: 0, decodeAllowed: false });
    expect(e.closes).toHaveBeenCalledTimes(1);
    expect(e.decode).toHaveBeenCalledTimes(1);
    expect(e.createElement).not.toHaveBeenCalled();
  });
});
