// Unit contract for the local frame PNG export (spec 033). Fake ports only — no real canvas, no
// real Blob encoding, no DOM, no network. Real pixels are covered by the Chromium E2E.

import { describe, expect, it, vi } from "vitest";
import type { PreviewImageBindings } from "../canvas/types";
import {
  createFramePngExporter,
  type ExportFramePngPorts,
  type ExportFramePngRequest,
  type PrintCanvas,
  type PrintCanvasContext,
  SCALE_TOLERANCE,
} from "./exportFramePng";

const A4 = { widthCm: 21, heightCm: 29.7 };
const NOW = new Date(2026, 6, 31, 15, 30, 42);

/** A plan whose logical canvas matches the A4 aspect, so the scale comes out uniform. */
const planFor = (width: number, height: number) => ({
  logicalCanvas: { width, height },
  commands: [{ type: "fill-rect" }],
});
const A4_PLAN = planFor(500, 707);

const bindings = (): PreviewImageBindings => ({ get: () => undefined });

interface Harness {
  readonly ports: ExportFramePngPorts;
  readonly calls: string[];
  readonly canvases: { width: number; height: number }[];
  readonly transforms: number[][];
  readonly executed: { plan: unknown; imageBindings: unknown }[];
  readonly downloads: { url: string; fileName: string }[];
  readonly created: string[];
  readonly revoked: string[];
  toBlobCount: number;
}

function harness(
  options: {
    blob?: Blob | null;
    toBlobThrows?: boolean;
    executeOk?: boolean;
    getContext?: () => PrintCanvasContext | null;
    createCanvasThrows?: boolean;
  } = {},
): Harness {
  const calls: string[] = [];
  const canvases: { width: number; height: number }[] = [];
  const transforms: number[][] = [];
  const executed: { plan: unknown; imageBindings: unknown }[] = [];
  const downloads: { url: string; fileName: string }[] = [];
  const created: string[] = [];
  const revoked: string[] = [];
  const state = { toBlobCount: 0 };
  let urlSeq = 0;

  const context = {
    setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
      calls.push("setTransform");
      transforms.push([a, b, c, d, e, f]);
    },
    save: () => {},
    restore: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    drawImage: () => {},
    beginPath: () => {},
    rect: () => {},
    clip: () => {},
  } as unknown as PrintCanvasContext;

  const canvas: PrintCanvas = {
    width: 0,
    height: 0,
    getContext: options.getContext ?? (() => context),
    toBlob: (callback, _type) => {
      calls.push("toBlob");
      state.toBlobCount += 1;
      if (options.toBlobThrows) throw new Error("SecurityError");
      callback(options.blob === undefined ? ({ size: 1 } as Blob) : options.blob);
    },
  };

  const ports: ExportFramePngPorts = {
    createCanvas: () => {
      calls.push("createCanvas");
      if (options.createCanvasThrows) throw new Error("no canvas");
      const proxy: PrintCanvas = {
        get width() {
          return canvas.width;
        },
        set width(value: number) {
          canvas.width = value;
          calls.push("setSize");
          canvases.push({ width: canvas.width, height: canvas.height });
        },
        get height() {
          return canvas.height;
        },
        set height(value: number) {
          canvas.height = value;
          canvases[canvases.length - 1] = { width: canvas.width, height: canvas.height };
        },
        getContext: canvas.getContext,
        toBlob: canvas.toBlob,
      };
      return proxy;
    },
    createObjectUrl: () => {
      urlSeq += 1;
      const url = `blob:fake/${urlSeq}`;
      created.push(url);
      calls.push("createObjectUrl");
      return url;
    },
    revokeObjectUrl: (url) => {
      revoked.push(url);
      calls.push("revokeObjectUrl");
    },
    triggerDownload: (url, fileName) => {
      downloads.push({ url, fileName });
      calls.push("triggerDownload");
    },
    now: () => NOW,
    execute: ((args: { plan: unknown; imageBindings: unknown }) => {
      calls.push("execute");
      executed.push({ plan: args.plan, imageBindings: args.imageBindings });
      return options.executeOk === false
        ? { ok: false as const, code: "CANVAS_OPERATION_FAILED" as const }
        : { ok: true as const };
    }) as unknown as ExportFramePngPorts["execute"],
  };

  return {
    ports,
    calls,
    canvases,
    transforms,
    executed,
    downloads,
    created,
    revoked,
    get toBlobCount() {
      return state.toBlobCount;
    },
  };
}

const request = (over: Partial<ExportFramePngRequest> = {}): ExportFramePngRequest =>
  ({
    plan: A4_PLAN,
    imageBindings: bindings(),
    physicalSize: A4,
    ...over,
  }) as ExportFramePngRequest;

// --- happy path --------------------------------------------------------------

describe("createFramePngExporter — a successful export", () => {
  it("downloads exactly one file with the approved name", async () => {
    const h = harness();
    const result = await createFramePngExporter(h.ports).export(request());
    expect(result.ok).toBe(true);
    expect(h.downloads).toHaveLength(1);
    expect(h.downloads[0]?.fileName).toBe("denn-frame-21x29.7cm-20260731-153042.png");
  });

  it("passes the SAME plan instance and bindings to the executor", async () => {
    const h = harness();
    const req = request();
    await createFramePngExporter(h.ports).export(req);
    // identity, not a deep copy: a rebuilt or cloned plan would break the P-6 guarantee
    expect(h.executed[0]?.plan).toBe(req.plan);
    expect(h.executed[0]?.imageBindings).toBe(req.imageBindings);
  });

  it("leaves the plan byte-identical (no mutation, no coordinate scaling)", async () => {
    const h = harness();
    const req = request();
    const before = JSON.stringify(req.plan);
    await createFramePngExporter(h.ports).export(req);
    expect(JSON.stringify(req.plan)).toBe(before);
    expect(req.plan.logicalCanvas).toEqual({ width: 500, height: 707 });
  });

  it("applies exactly one uniform transform from identity", async () => {
    const h = harness();
    await createFramePngExporter(h.ports).export(request());
    expect(h.transforms).toHaveLength(1);
    const [a, b, c, d, e, f] = h.transforms[0] as number[];
    expect(a).toBe(d); // uniform
    expect(b).toBe(0);
    expect(c).toBe(0);
    expect(e).toBe(0); // no translation
    expect(f).toBe(0);
    expect(a).toBeGreaterThan(1);
  });

  it("scales by output width over logical width", async () => {
    const h = harness();
    await createFramePngExporter(h.ports).export(request());
    const output = h.canvases[0] as { width: number; height: number };
    expect((h.transforms[0] as number[])[0]).toBeCloseTo(output.width / 500, 10);
  });

  it("runs the steps in the contracted order", async () => {
    const h = harness();
    await createFramePngExporter(h.ports).export(request());
    expect(h.calls).toEqual([
      "createCanvas",
      "setSize",
      "setTransform",
      "execute",
      "toBlob",
      "createObjectUrl",
      "triggerDownload",
    ]);
  });

  it("sets the backing store to the computed print pixels", async () => {
    const h = harness();
    await createFramePngExporter(h.ports).export(request());
    const output = h.canvases[0] as { width: number; height: number };
    expect(Number.isInteger(output.width)).toBe(true);
    expect(Number.isInteger(output.height)).toBe(true);
    expect(Math.max(output.width, output.height)).toBeGreaterThanOrEqual(3000);
  });
});

// --- fail-closed (P-3) -------------------------------------------------------

describe("createFramePngExporter — no file on any failure", () => {
  it("does NOT call toBlob when the plan did not draw", async () => {
    const h = harness({ executeOk: false });
    const result = await createFramePngExporter(h.ports).export(request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("EXECUTION_FAILED");
    expect(h.toBlobCount).toBe(0);
    expect(h.downloads).toHaveLength(0);
    expect(h.created).toHaveLength(0);
  });

  it("produces no file when toBlob yields null", async () => {
    const h = harness({ blob: null });
    const result = await createFramePngExporter(h.ports).export(request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ENCODE_FAILED");
    expect(h.downloads).toHaveLength(0);
    expect(h.created).toHaveLength(0);
  });

  it("produces no file when toBlob throws (tainted canvas)", async () => {
    const h = harness({ toBlobThrows: true });
    const result = await createFramePngExporter(h.ports).export(request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ENCODE_FAILED");
    expect(h.downloads).toHaveLength(0);
  });

  it("never retries — one attempt per call", async () => {
    for (const options of [{ blob: null }, { toBlobThrows: true }, { executeOk: false }]) {
      const h = harness(options);
      await createFramePngExporter(h.ports).export(request());
      expect(h.calls.filter((c) => c === "execute").length).toBeLessThanOrEqual(1);
      expect(h.toBlobCount).toBeLessThanOrEqual(1);
    }
  });

  it("fails closed when the canvas or its context is unavailable", async () => {
    for (const options of [{ createCanvasThrows: true }, { getContext: () => null }]) {
      const h = harness(options);
      const result = await createFramePngExporter(h.ports).export(request());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("CANVAS_UNAVAILABLE");
      expect(h.toBlobCount).toBe(0);
    }
  });

  it("fails closed on an unusable physical size, before creating a canvas", async () => {
    for (const physicalSize of [
      { widthCm: 0, heightCm: 29.7 },
      { widthCm: 21, heightCm: Number.NaN },
      { widthCm: -1, heightCm: -1 },
    ]) {
      const h = harness();
      const result = await createFramePngExporter(h.ports).export(request({ physicalSize }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("INVALID_PRINT_SIZE");
      expect(h.calls).toHaveLength(0); // nothing was created at all
    }
  });

  it("fails closed on an unusable request shape", async () => {
    const cases: unknown[] = [
      undefined,
      null,
      { plan: null, imageBindings: bindings(), physicalSize: A4 },
      { plan: A4_PLAN, imageBindings: null, physicalSize: A4 },
      { plan: A4_PLAN, imageBindings: {}, physicalSize: A4 }, // bindings without get()
      { plan: { logicalCanvas: null }, imageBindings: bindings(), physicalSize: A4 },
      {
        plan: { logicalCanvas: { width: 0, height: 707 } },
        imageBindings: bindings(),
        physicalSize: A4,
      },
      { plan: A4_PLAN, imageBindings: bindings(), physicalSize: null },
    ];
    for (const input of cases) {
      const h = harness();
      const result = await createFramePngExporter(h.ports).export(input as ExportFramePngRequest);
      expect(result.ok, JSON.stringify(input)).toBe(false);
      expect(h.downloads).toHaveLength(0);
    }
  });

  it("REJECTS a non-uniform scale rather than distorting the approved layout", async () => {
    const h = harness();
    // a plan whose aspect does not match the A4 physical size
    const result = await createFramePngExporter(h.ports).export(
      request({ plan: planFor(500, 500) as ExportFramePngRequest["plan"] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NON_UNIFORM_SCALE");
    expect(h.toBlobCount).toBe(0);
  });

  it("tolerates the rounding of two independently rounded edges", async () => {
    const h = harness();
    // 21 / 29.7 = 0.70707…; a 500-wide plan gives 353.5 → the integer 354 is within tolerance
    const result = await createFramePngExporter(h.ports).export(
      request({ plan: planFor(500, 707) as ExportFramePngRequest["plan"] }),
    );
    expect(result.ok).toBe(true);
    expect(SCALE_TOLERANCE).toBeGreaterThan(0);
  });

  it("carries no identity in the failure payload", async () => {
    const h = harness({ blob: null });
    const result = await createFramePngExporter(h.ports).export(request());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result).sort()).toEqual(["code", "ok"]);
    const serialized = JSON.stringify(result);
    for (const secret of ["21", "29.7", "blob:", "denn-frame", "500", "707"]) {
      expect(serialized.includes(secret), secret).toBe(false);
    }
  });

  it("never rejects, even when a port throws", async () => {
    const h = harness();
    const ports = {
      ...h.ports,
      triggerDownload: () => {
        throw new Error("boom");
      },
    };
    const result = await createFramePngExporter(ports).export(request());
    expect(result.ok).toBe(false);
  });
});

// --- object URL lifecycle ----------------------------------------------------

describe("createFramePngExporter — object URL lifecycle", () => {
  it("keeps at most one live URL and revokes the previous one", async () => {
    const h = harness();
    const exporter = createFramePngExporter(h.ports);
    await exporter.export(request());
    await exporter.export(request());
    await exporter.export(request());
    expect(h.created).toHaveLength(3);
    // the first two were released when replaced; the third is still live
    expect(h.revoked).toEqual([h.created[0], h.created[1]]);
  });

  it("revokes the last URL on dispose", async () => {
    const h = harness();
    const exporter = createFramePngExporter(h.ports);
    await exporter.export(request());
    exporter.dispose();
    expect(h.revoked).toEqual([h.created[0]]);
  });

  it("is safe to dispose more than once", async () => {
    const h = harness();
    const exporter = createFramePngExporter(h.ports);
    await exporter.export(request());
    exporter.dispose();
    exporter.dispose();
    expect(h.revoked).toHaveLength(1);
  });

  it("creates no URL when the export failed", async () => {
    for (const options of [{ blob: null }, { executeOk: false }, { toBlobThrows: true }]) {
      const h = harness(options);
      await createFramePngExporter(h.ports).export(request());
      expect(h.created).toHaveLength(0);
      expect(h.revoked).toHaveLength(0);
    }
  });

  it("hands out nothing when disposed mid-encode", async () => {
    const h = harness();
    const exporter = createFramePngExporter(h.ports);
    const pending = exporter.export(request());
    exporter.dispose();
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(h.downloads).toHaveLength(0);
  });

  it("refuses to export after dispose", async () => {
    const h = harness();
    const exporter = createFramePngExporter(h.ports);
    exporter.dispose();
    const result = await exporter.export(request());
    expect(result.ok).toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it("survives a throwing revoke without failing the export", async () => {
    const h = harness();
    const ports = {
      ...h.ports,
      revokeObjectUrl: () => {
        throw new Error("boom");
      },
    };
    const exporter = createFramePngExporter(ports);
    expect((await exporter.export(request())).ok).toBe(true);
    expect((await exporter.export(request())).ok).toBe(true);
  });
});

// --- boundaries --------------------------------------------------------------

describe("createFramePngExporter — hard boundaries", () => {
  it("reads the clock through the port, never at import time", async () => {
    const now = vi.fn(() => NOW);
    const h = harness();
    await createFramePngExporter({ ...h.ports, now }).export(request());
    expect(now).toHaveBeenCalledTimes(1);
  });

  it("uses only the injected canvas — no document access", async () => {
    const h = harness();
    // the fake ports carry no document/window; a real DOM lookup would throw in this environment
    const result = await createFramePngExporter(h.ports).export(request());
    expect(result.ok).toBe(true);
    expect(h.calls.includes("createCanvas")).toBe(true);
  });

  it("has no upload, order, storage or Kakao port to call", () => {
    const h = harness();
    expect(Object.keys(h.ports).sort()).toEqual([
      "createCanvas",
      "createObjectUrl",
      "execute",
      "now",
      "revokeObjectUrl",
      "triggerDownload",
    ]);
  });
});
