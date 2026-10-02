// Supply/Canvas/FontFace fakes verify protocol only, NOT glyph coverage or native shaping.
import { describe, expect, it, vi } from "vitest";
import {
  createManagedFontMeasurementSession,
  createManagedFontOwner,
  createManagedStaticFontOwner,
  type ManagedFace,
  type ManagedFontEnvironment,
  type ManagedFontLease,
  type ManagedFontMeasurementSession,
  type ManagedFontRequest,
  type ManagedFontSupply,
  type ManagedStaticFontOwner,
  type ManagedStaticFontRevision,
} from "./composer-font-proof";

function sessionHarness(bold = false) {
  const lease = {
    identity: {},
    alias: `denn_00000000-0000-4000-8000-00000000000${bold ? 2 : 1}`,
    language: "en" as "en" | "ko",
    isCurrent: vi.fn(() => true),
    prepare: vi.fn(() => true),
    measure: vi.fn((_text: string, _size: number): number | null => (bold ? 20 : 10)),
    release: vi.fn(),
  } satisfies ManagedFontLease;
  const owner = {
    revision: bold ? "fp5-static-v1/dm-normal-700" : "fp5-static-v1/dm-normal-400",
    load: vi.fn(async () => true),
    acquire: vi.fn((_request: ManagedFontRequest): ManagedFontLease | null => lease),
    isCurrent: vi.fn(() => true),
    subscribe: vi.fn(() => () => {}),
    retire: vi.fn(),
  } satisfies ManagedStaticFontOwner;
  const request: ManagedFontRequest = {
    family: "Synthetic face",
    weight: bold ? "bold" : "normal",
    italic: false,
    texts: ["AV To"],
  };
  const entry = { owner, request };
  const measureRequest = {
    text: "AV",
    font: {
      family: lease.alias,
      weight: request.weight,
      italic: false,
      fallback: "sans-serif" as const,
      sizePx: 32,
    },
  };
  return { lease, owner, request, entry, measureRequest };
}

describe("spec132 independent execution borrowing", () => {
  function setup() {
    const h = sessionHarness();
    const session = required(createManagedFontMeasurementSession([h.entry]));
    let alive = true;
    const execution = {
      ...h.lease,
      isCurrent: vi.fn(() => alive),
      prepare: vi.fn(() => alive),
      release: vi.fn(() => {
        alive = false;
      }),
    };
    h.owner.acquire.mockReturnValue(execution);
    return { ...h, session, execution };
  }

  it("rejects returning the measurement handle as an execution handle without disposing it", () => {
    const h = sessionHarness();
    const session = required(createManagedFontMeasurementSession([h.entry]));
    expect(session.borrowExecution()).toBeNull();
    expect(h.lease.release).not.toHaveBeenCalled();
    expect(session.isCurrent()).toBe(true);
    session.release();
  });

  it("rejects reusing a handle held by another active execution without releasing that handle", () => {
    const h = setup();
    const first = required(h.session.borrowExecution());
    expect(h.session.borrowExecution()).toBeNull();
    expect(h.execution.release).not.toHaveBeenCalled();
    expect(first.isCurrent()).toBe(true);
    first.release();
    expect(h.execution.release).toHaveBeenCalledTimes(1);
    h.session.release();
  });

  it("borrows fresh leases with the same request/stamp; measurement release is independent", () => {
    const h = setup();
    const borrowed = required(h.session.borrowExecution());
    expect(Object.isFrozen(borrowed)).toBe(true);
    expect(h.owner.acquire).toHaveBeenCalledTimes(2);
    expect(h.owner.acquire.mock.calls[1][0]).toBe(h.owner.acquire.mock.calls[0][0]);
    h.session.release();
    expect(h.lease.release).toHaveBeenCalledTimes(1);
    expect(borrowed.isCurrent()).toBe(true);
    expect(borrowed.prepare({} as CanvasRenderingContext2D)).toBe(true);
    expect(h.execution.release).not.toHaveBeenCalled();
    expect(h.session.borrowExecution()).toBeNull();
    borrowed.release();
    borrowed.release();
    expect(borrowed.isCurrent()).toBe(false);
    expect(borrowed.prepare({} as CanvasRenderingContext2D)).toBe(false);
    expect(h.execution.release).toHaveBeenCalledTimes(1);
    expect(h.owner.retire).not.toHaveBeenCalled();
  });

  it.each(["identity", "alias", "language"])("rejects a changed %s stamp with cleanup", (key) => {
    const h = setup();
    Reflect.set(h.execution, key, key === "identity" ? {} : key === "alias" ? "other" : "ko");
    expect(h.session.borrowExecution()).toBeNull();
    expect(h.execution.release).toHaveBeenCalledTimes(1);
    expect(h.lease.release).not.toHaveBeenCalled();
    h.session.release();
  });

  it.each(["null", "throw", "stale"])(
    "contains %s acquisition without retiring measurement",
    (mode) => {
      const h = setup();
      if (mode === "null") h.owner.acquire.mockReturnValue(null);
      else if (mode === "throw")
        h.owner.acquire.mockImplementation(() => {
          throw new Error("secret");
        });
      else h.execution.isCurrent.mockReturnValue(false);
      expect(h.session.borrowExecution()).toBeNull();
      expect(h.session.isCurrent()).toBe(true);
      expect(h.execution.release).toHaveBeenCalledTimes(mode === "stale" ? 1 : 0);
      h.session.release();
    },
  );

  it("cleans all partial execution leases when the second owner fails", () => {
    const a = sessionHarness(),
      b = sessionHarness(true);
    const session = required(createManagedFontMeasurementSession([a.entry, b.entry]));
    const first = { ...a.lease, release: vi.fn() };
    a.owner.acquire.mockReturnValue(first);
    b.owner.acquire.mockReturnValue(null);
    expect(session.borrowExecution()).toBeNull();
    expect(first.release).toHaveBeenCalledTimes(1);
    expect(a.lease.release).not.toHaveBeenCalled();
    session.release();
  });

  it("blocks recursive borrow acquisition", () => {
    const h = setup();
    h.owner.acquire.mockImplementation(() => {
      expect(h.session.borrowExecution()).toBeNull();
      return h.execution;
    });
    required(h.session.borrowExecution()).release();
    expect(h.owner.acquire).toHaveBeenCalledTimes(2);
    h.session.release();
  });

  it("defers measurement cleanup during acquisition and cleans unsuccessful execution handoff", () => {
    const h = setup();
    h.owner.acquire.mockImplementation(() => {
      h.session.release();
      expect(h.lease.release).not.toHaveBeenCalled();
      return h.execution;
    });
    expect(h.session.borrowExecution()).toBeNull();
    expect(h.lease.release).toHaveBeenCalledTimes(1);
    expect(h.execution.release).toHaveBeenCalledTimes(1);
  });

  it.each(["current", "prepare"])("defers execution cleanup during %s reentry", (port) => {
    const h = setup();
    const borrowed = required(h.session.borrowExecution());
    const release = () => {
      borrowed.release();
      expect(borrowed.isCurrent()).toBe(false);
      expect(h.execution.release).not.toHaveBeenCalled();
      return true;
    };
    if (port === "current") h.execution.isCurrent.mockImplementation(release);
    else h.execution.prepare.mockImplementation(release);
    expect(borrowed.prepare({} as CanvasRenderingContext2D)).toBe(false);
    expect(h.execution.release).toHaveBeenCalledTimes(1);
    h.session.release();
  });

  it("genuine static owner survives session release until borrow release after retirement", async () => {
    const h = staticHarness();
    expect(await h.owner.load()).toBe(true);
    const session = required(
      createManagedFontMeasurementSession([{ owner: h.owner, request: h.request }]),
    );
    const first = required(session.borrowExecution());
    const second = required(session.borrowExecution());
    first.release();
    session.release();
    expect(second.isCurrent()).toBe(true);
    expect(h.ports.delete).not.toHaveBeenCalled();
    h.owner.retire();
    expect(second.isCurrent()).toBe(false);
    expect(h.ports.delete).not.toHaveBeenCalled();
    second.release();
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
  });
});

describe("spec132 pre-acquired measurement session (fake protocol only)", () => {
  it("routes styles through exact aliases without acquiring during repeated trial measurements", () => {
    const normal = sessionHarness();
    const bold = sessionHarness(true);
    const session = required(createManagedFontMeasurementSession([normal.entry, bold.entry]));
    expect(Object.isFrozen(session)).toBe(true);
    expect(Object.isFrozen(session.bindings)).toBe(true);
    expect(session.bindings.every(Object.isFrozen)).toBe(true);
    expect(session.bindings[0]).toEqual({
      revision: normal.owner.revision,
      family: normal.request.family,
      weight: "normal",
      italic: false,
      alias: normal.lease.alias,
      identity: normal.lease.identity,
      language: "en",
    });
    for (let index = 0; index < 3; index++) {
      expect(session.measureText(normal.measureRequest)).toBe(10);
      expect(session.measureText(bold.measureRequest)).toBe(20);
    }
    for (const h of [normal, bold]) {
      expect(h.owner.acquire).toHaveBeenCalledTimes(1);
      expect(h.owner.load).not.toHaveBeenCalled();
      expect(h.owner.retire).not.toHaveBeenCalled();
      expect(h.lease.prepare).not.toHaveBeenCalled();
      expect(h.lease.release).not.toHaveBeenCalled();
    }
    session.release();
    session.release();
    expect(session.isCurrent()).toBe(false);
    expect(session.measureText(normal.measureRequest)).toBeNaN();
    expect(normal.lease.release).toHaveBeenCalledTimes(1);
    expect(bold.lease.release).toHaveBeenCalledTimes(1);
  });

  it("snapshots and freezes request text before acquisition", () => {
    const h = sessionHarness();
    const texts = ["AV To"];
    const request = { ...h.request, texts };
    const session = required(createManagedFontMeasurementSession([{ owner: h.owner, request }]));
    texts[0] = "changed";
    request.family = "changed";
    const acquired = h.owner.acquire.mock.calls[0][0];
    expect(acquired.texts).toEqual(["AV To"]);
    expect(Object.isFrozen(acquired.texts)).toBe(true);
    expect(Object.isFrozen(acquired)).toBe(true);
    expect(session.bindings[0].family).toBe("Synthetic face");
    session.release();
  });

  it("reads indexed requests rather than caller iterators that hide every owner", () => {
    const h = sessionHarness();
    const entries = [h.entry];
    const iterator = vi.fn(() => ([] as typeof entries)[Symbol.iterator]());
    entries[Symbol.iterator] = iterator;
    const session = required(createManagedFontMeasurementSession(entries));
    expect(session.bindings).toHaveLength(1);
    expect(h.owner.acquire).toHaveBeenCalledTimes(1);
    expect(iterator).not.toHaveBeenCalled();
    session.release();
  });

  it("reads indexed text without caller iterator substitution", () => {
    const h = sessionHarness();
    const texts = ["AV To"];
    const iterator = vi.fn(() => ["substituted"][Symbol.iterator]());
    texts[Symbol.iterator] = iterator;
    const session = required(
      createManagedFontMeasurementSession([{ owner: h.owner, request: { ...h.request, texts } }]),
    );
    expect(h.owner.acquire.mock.calls[0][0].texts).toEqual(["AV To"]);
    expect(iterator).not.toHaveBeenCalled();
    session.release();
  });

  it.each([
    { family: "" },
    { weight: "other" },
    { italic: "false" },
    { texts: [] },
    { texts: [1] },
  ])("rejects malformed request %j before acquiring", (override) => {
    const h = sessionHarness();
    const request = { ...h.request, ...override } as ManagedFontRequest;
    expect(createManagedFontMeasurementSession([{ owner: h.owner, request }])).toBeNull();
    expect(h.owner.acquire).not.toHaveBeenCalled();
  });

  it("rejects an unknown revision before acquiring", () => {
    const h = sessionHarness();
    const owner = { ...h.owner, revision: "not-registered" } as unknown as ManagedStaticFontOwner;
    expect(createManagedFontMeasurementSession([{ owner, request: h.request }])).toBeNull();
    expect(h.owner.acquire).not.toHaveBeenCalled();
  });

  it.each([null, [], Array(7).fill(null), [{ owner: null }]])(
    "rejects malformed or out-of-profile input %j",
    (input) => {
      expect(
        createManagedFontMeasurementSession(
          input as Parameters<typeof createManagedFontMeasurementSession>[0],
        ),
      ).toBeNull();
    },
  );

  it("rejects a duplicate original style before acquisition", () => {
    const h = sessionHarness();
    expect(createManagedFontMeasurementSession([h.entry, h.entry])).toBeNull();
    expect(h.owner.acquire).not.toHaveBeenCalled();
  });

  it.each(["alias", "identity", "language", "unavailable", "throw", "stale"])(
    "releases acquired leases on %s failure",
    (mode) => {
      const a = sessionHarness();
      const b = sessionHarness(true);
      if (mode === "alias") b.lease.alias = a.lease.alias;
      if (mode === "identity") b.lease.identity = a.lease.identity;
      if (mode === "language") b.lease.language = "ko";
      if (mode === "unavailable") b.owner.acquire.mockReturnValue(null);
      if (mode === "throw")
        b.owner.acquire.mockImplementation(() => {
          throw new Error("private");
        });
      if (mode === "stale") b.lease.isCurrent.mockReturnValue(false);
      expect(createManagedFontMeasurementSession([a.entry, b.entry])).toBeNull();
      expect(a.lease.release).toHaveBeenCalledTimes(1);
      expect(b.lease.release).toHaveBeenCalledTimes(
        mode === "unavailable" || mode === "throw" ? 0 : 1,
      );
    },
  );

  it.each([
    { family: "Synthetic face" },
    { family: "foreign alias" },
    { weight: "bold" },
    { italic: true },
    { fallback: "serif" },
    { sizePx: 0 },
    { sizePx: Number.NaN },
    { sizePx: Number.POSITIVE_INFINITY },
  ])("rejects a mismatched measurement font %j before measurement", (override) => {
    const h = sessionHarness();
    const session = required(createManagedFontMeasurementSession([h.entry]));
    const font = { ...h.measureRequest.font, ...override } as typeof h.measureRequest.font;
    expect(session.measureText({ ...h.measureRequest, font })).toBeNaN();
    expect(h.lease.measure).not.toHaveBeenCalled();
    session.release();
  });

  it.each([null, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid width %s", (width) => {
    const h = sessionHarness();
    const session = required(createManagedFontMeasurementSession([h.entry]));
    h.lease.measure.mockReturnValue(width);
    expect(session.measureText(h.measureRequest)).toBeNaN();
    session.release();
  });

  it("accepts zero width and fails the entire session when any owner becomes stale", () => {
    const a = sessionHarness();
    const b = sessionHarness(true);
    const session = required(createManagedFontMeasurementSession([a.entry, b.entry]));
    a.lease.measure.mockReturnValue(0);
    expect(session.measureText(a.measureRequest)).toBe(0);
    b.lease.isCurrent.mockReturnValue(false);
    expect(session.isCurrent()).toBe(false);
    expect(session.measureText(a.measureRequest)).toBeNaN();
    expect(a.lease.measure).toHaveBeenCalledTimes(1);
    session.release();
  });

  it("rejects late invalidation after measure and contains callback exceptions", () => {
    const h = sessionHarness();
    const session = required(createManagedFontMeasurementSession([h.entry]));
    h.lease.measure.mockImplementation(() => {
      h.lease.isCurrent.mockReturnValue(false);
      return 10;
    });
    expect(session.measureText(h.measureRequest)).toBeNaN();
    h.lease.isCurrent.mockImplementation(() => {
      throw new Error("private");
    });
    expect(session.isCurrent()).toBe(false);
    expect(session.measureText(h.measureRequest)).toBeNaN();
    session.release();
  });

  it.each(["measure", "current", "getter"])(
    "defers cleanup across reentrant release in %s",
    (mode) => {
      const h = sessionHarness();
      const session = required(createManagedFontMeasurementSession([h.entry]));
      const releaseInside = () => {
        session.release();
        expect(session.isCurrent()).toBe(false);
        expect(h.lease.release).not.toHaveBeenCalled();
      };
      let request = h.measureRequest;
      if (mode === "measure")
        h.lease.measure.mockImplementation(() => {
          releaseInside();
          return 10;
        });
      if (mode === "current")
        h.lease.isCurrent.mockImplementation(() => {
          releaseInside();
          return true;
        });
      if (mode === "getter")
        request = {
          ...request,
          get text() {
            releaseInside();
            return "AV";
          },
        };
      expect(session.measureText(request)).toBeNaN();
      expect(h.lease.release).toHaveBeenCalledTimes(1);
      if (mode !== "measure") expect(h.lease.measure).not.toHaveBeenCalled();
      session.release();
      expect(h.lease.release).toHaveBeenCalledTimes(1);
    },
  );

  it("prevents nested measurement/current recursion and contains request getter throws", () => {
    const h = sessionHarness();
    const session = required(createManagedFontMeasurementSession([h.entry]));
    h.lease.isCurrent.mockImplementation(() => {
      expect(session.isCurrent()).toBe(false);
      return true;
    });
    h.lease.measure.mockImplementation(() => {
      expect(session.measureText(h.measureRequest)).toBeNaN();
      return 10;
    });
    expect(session.measureText(h.measureRequest)).toBe(10);
    expect(h.lease.measure).toHaveBeenCalledTimes(1);
    expect(
      session.measureText({
        ...h.measureRequest,
        get text(): string {
          throw new Error("private");
        },
      }),
    ).toBeNaN();
    session.release();
  });

  it("continues releasing other leases when one release throws", () => {
    const a = sessionHarness();
    const b = sessionHarness(true);
    const session = required(createManagedFontMeasurementSession([a.entry, b.entry]));
    b.lease.release.mockImplementation(() => {
      throw new Error("private");
    });
    session.release();
    expect(a.lease.release).toHaveBeenCalledTimes(1);
    expect(b.lease.release).toHaveBeenCalledTimes(1);
    expect(session.isCurrent()).toBe(false);
  });

  it("holds independent leases for separate sessions with the real static owner protocol", async () => {
    const h = staticHarness();
    expect(await h.owner.load()).toBe(true);
    const first = required(
      createManagedFontMeasurementSession([{ owner: h.owner, request: h.request }]),
    );
    const second = required(
      createManagedFontMeasurementSession([{ owner: h.owner, request: h.request }]),
    );
    const request: Parameters<ManagedFontMeasurementSession["measureText"]>[0] = {
      text: "AV",
      font: {
        family: first.bindings[0].alias,
        weight: "normal",
        italic: false,
        fallback: "sans-serif",
        sizePx: 32,
      },
    };
    expect(first.measureText(request)).toBe(10);
    expect(first.measureText({ ...request, text: "unsupported" })).toBeNaN();
    first.release();
    expect(second.measureText(request)).toBe(10);
    h.owner.retire();
    expect(second.measureText(request)).toBeNaN();
    expect(h.ports.delete).not.toHaveBeenCalled();
    second.release();
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
  });
});

function required<T>(value: T | null): T {
  if (value === null) throw new Error("Expected test capability");
  return value;
}

const UUID = "00000000-0000-4000-8000-000000000001";
const HASH = "ab".repeat(32);
const DESCRIPTORS = {
  style: "normal",
  weight: "400",
  stretch: "normal",
  unicodeRange: "U+0-10FFFF",
  featureSettings: '"kern" 1',
  variationSettings: '"opsz" 9, "wght" 400',
};
const REQUEST = { family: "Test face", weight: "normal", italic: false, texts: ["AV To"] } as const;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function harness() {
  const supply: ManagedFontSupply = {
    bytes: new Uint8Array([1, 2, 3]).buffer,
    byteLength: 3,
    sha256: HASH,
    family: "Test face",
    weight: "normal",
    italic: false,
    language: "en",
    verifiedTexts: ["AV To", "AV", "A", "V", " ", "T", "o", "To"],
    descriptors: { ...DESCRIPTORS },
  };
  const members = new Set<ManagedFace>();
  const face = {
    family: `denn_${UUID}`,
    status: "loaded",
    ...DESCRIPTORS,
    display: "auto",
    ascentOverride: "normal",
    descentOverride: "normal",
    lineGapOverride: "normal",
    load: vi.fn(async (): Promise<ManagedFace> => face),
  };
  const canvas = {
    width: 0,
    height: 0,
    lang: "",
    isConnected: false,
    parentNode: null,
    ownerDocument: {},
    getContext: vi.fn(() => context),
  };
  const context = {
    canvas,
    direction: "inherit",
    font: "10px sans-serif",
    getContextAttributes: vi.fn(() => ({ alpha: true, colorSpace: "srgb" })),
    measureText: vi.fn((text: string) => ({ width: text.length * 5 })),
  };
  const ports = {
    randomUUID: vi.fn(() => UUID),
    digest: vi.fn(async (_bytes: ArrayBuffer) => HASH),
    createFace: vi.fn(
      (_alias: string, _bytes: ArrayBuffer, _descriptors: Readonly<Record<string, string>>) => face,
    ),
    faces: vi.fn(() => members.values()),
    add: vi.fn((value: ManagedFace) => {
      members.add(value);
    }),
    delete: vi.fn((value: ManagedFace) => {
      members.delete(value);
    }),
    createCanvas: vi.fn(() => canvas as unknown as HTMLCanvasElement),
  } satisfies ManagedFontEnvironment;
  const owner = required(createManagedFontOwner(supply, ports));
  return { supply, members, face, canvas, context, ports, owner };
}

const STATIC_ROWS = [
  ["dm-normal-400", 56784, "d1976fdc92c6881f7a4ecb58e0a2c71be101a6b61e74843294c1608409956980"],
  ["dm-normal-700", 56832, "638ca386b4fe9e91129d6a8a035c716ef2bdb549d241be76c03eaef7c8318a11"],
  ["dm-italic-400", 61256, "480c13eff0447a0e87b0805adcfdc0c2e26aa8236779328879d7bef782c561d1"],
  ["dm-italic-700", 61260, "96d76c26f9a850848843494ba1b05c91bdb7d10d5cd8a00b3a863753d65c0740"],
  ["noto-400", 6224840, "e5056d590ea3a6b64a6dc6fea10f49df784e5ca0b602a994c001e8eba64b2cda"],
  ["noto-700", 6222696, "213ae39172bfd470d87024791a8e09e052df6fea85ff35f6e9e013fb876c09ce"],
] as const;

function staticHarness(index = 0) {
  const h = harness();
  const [id, length, hash] = STATIC_ROWS[index];
  const revision = `fp5-static-v1/${id}` as ManagedStaticFontRevision;
  const input = { revision, bytes: new ArrayBuffer(length) };
  const request = {
    family: `DENN FP5 ${id}`,
    weight: id.endsWith("700") ? ("bold" as const) : ("normal" as const),
    italic: id.startsWith("dm-italic"),
    texts: [id.startsWith("noto") ? "한글 가나다" : "AV To ffi DENN"],
  };
  h.ports.digest.mockResolvedValue(hash);
  h.face.variationSettings = "normal";
  h.face.style = request.italic ? "italic" : "normal";
  h.face.weight = request.weight === "bold" ? "700" : "400";
  const owner = required(createManagedStaticFontOwner(input, h.ports));
  return { ...h, owner, input, request, hash };
}

describe("pinned static owner (fake protocol only)", () => {
  it.each(STATIC_ROWS.map((row, index) => ({ id: row[0], index })))(
    "binds $id to its own revision",
    async ({ index }) => {
      const h = staticHarness(index);
      for (const port of Object.values(h.ports)) expect(port).not.toHaveBeenCalled();
      expect(h.owner.revision).toBe(h.input.revision);
      expect(Object.isFrozen(h.owner)).toBe(true);
      const first = h.owner.load();
      expect(h.owner.load()).toBe(first);
      expect(await first).toBe(true);
      const lease = required(h.owner.acquire(h.request));
      expect(lease.measure(h.request.texts[0], 32)).toBeGreaterThan(0);
      expect(lease.measure("", 12)).toBe(0);
      expect(h.ports.createFace.mock.calls[0][2].variationSettings).toBeUndefined();
      h.owner.retire();
      expect(lease.isCurrent()).toBe(false);
      expect(h.ports.delete).not.toHaveBeenCalled();
      lease.release();
      lease.release();
      expect(h.ports.delete).toHaveBeenCalledTimes(1);
      expect(h.canvas.width).toBe(0);
      expect(await h.owner.load()).toBe(false);
    },
  );

  it.each([
    null,
    {},
    { revision: "__proto__", bytes: new ArrayBuffer(56784) },
    { revision: "fp5-static-v1/dm-normal-400", bytes: new Uint8Array(56784) },
    { revision: "fp5-static-v1/dm-normal-400", bytes: new ArrayBuffer(1) },
    { revision: "fp5-static-v1/dm-normal-400", bytes: new ArrayBuffer(56784), noAxes: true },
    {
      revision: "fp5-static-v1/dm-normal-400",
      bytes: { byteLength: 56784, slice: () => new ArrayBuffer(56784) },
    },
  ])("rejects invalid input without environment calls %s", (input) => {
    const h = harness();
    expect(
      createManagedStaticFontOwner(
        input as Parameters<typeof createManagedStaticFontOwner>[0],
        h.ports,
      ),
    ).toBeNull();
    for (const port of Object.values(h.ports)) expect(port).not.toHaveBeenCalled();
  });

  it("rejects hostile accessors, symbol keys and caller descriptor evidence", () => {
    const h = staticHarness();
    for (const input of [
      {
        get revision() {
          throw new Error("private");
        },
        bytes: h.input.bytes,
      },
      { ...h.input, [Symbol("extra")]: true },
      { ...h.input, descriptors: DESCRIPTORS },
    ])
      expect(createManagedStaticFontOwner(input as typeof h.input, h.ports)).toBeNull();
    for (const port of Object.values(h.ports)) expect(port).not.toHaveBeenCalled();
  });

  it("captures bytes before async digest and does not trust an overridable slice", async () => {
    const h = staticHarness();
    new Uint8Array(h.input.bytes).fill(17);
    h.ports.digest.mockImplementation(async (value) => {
      expect(new Uint8Array(value).every((part) => part === 0)).toBe(true);
      new Uint8Array(value).fill(19);
      return h.hash;
    });
    expect(await h.owner.load()).toBe(true);
    expect(new Uint8Array(h.ports.createFace.mock.calls[0][1]).every((part) => part === 0)).toBe(
      true,
    );
    h.owner.retire();
    Object.defineProperty(h.input.bytes, "slice", {
      value: () => {
        throw new Error("should not read");
      },
    });
    expect(createManagedStaticFontOwner(h.input, h.ports)).not.toBeNull();
  });

  it("copies into a private buffer without consulting caller constructor or species", async () => {
    const h = staticHarness();
    const readConstructor = vi.fn(() => {
      throw new Error("caller constructor must not run");
    });
    Object.defineProperty(h.input.bytes, "constructor", { get: readConstructor });
    const owner = required(createManagedStaticFontOwner(h.input, h.ports));
    expect(readConstructor).not.toHaveBeenCalled();
    new Uint8Array(h.input.bytes).fill(23);
    h.ports.digest.mockImplementation(async (value) => {
      expect(new Uint8Array(value).every((part) => part === 0)).toBe(true);
      return h.hash;
    });
    expect(await owner.load()).toBe(true);
    expect(readConstructor).not.toHaveBeenCalled();
    expect(new Uint8Array(h.ports.createFace.mock.calls[0][1]).every((part) => part === 0)).toBe(
      true,
    );
    owner.retire();
  });

  it("rejects shared and detached byte storage without environment calls", () => {
    const h = staticHarness();
    const detached = new ArrayBuffer(56784);
    structuredClone(detached, { transfer: [detached] });
    for (const bytes of [detached, new SharedArrayBuffer(56784)])
      expect(
        createManagedStaticFontOwner({ ...h.input, bytes: bytes as ArrayBuffer }, h.ports),
      ).toBeNull();
    for (const port of Object.values(h.ports)) expect(port).not.toHaveBeenCalled();
  });

  it.each(["00".repeat(32), STATIC_ROWS[1][2]])(
    "rejects wrong digest before UUID/face %s",
    async (hash) => {
      const h = staticHarness();
      h.ports.digest.mockResolvedValue(hash);
      expect(await h.owner.load()).toBe(false);
      for (const key of ["randomUUID", "createFace", "add", "createCanvas"] as const)
        expect(h.ports[key]).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, "normal"])("accepts static axis absence or default %s", async (variation) => {
    const h = staticHarness();
    if (variation === undefined) Reflect.deleteProperty(h.face, "variationSettings");
    else h.face.variationSettings = variation;
    h.face.unicodeRange = "U+0-10ffff";
    expect(await h.owner.load()).toBe(true);
    h.face.unicodeRange = "U+0-10FFFF";
    expect(h.owner.isCurrent()).toBe(false); // even an equivalent raw descriptor change is stale
  });

  it.each([
    ["variationSettings", ""],
    ["variationSettings", '"wght" 400'],
    ["variationSettings", null],
    ["unicodeRange", "U+0-FF"],
    ["unicodeRange", undefined],
    ["unicodeRange", { toString: (): string => "U+0-10FFFF" }],
    ["featureSettings", '"kern" 0'],
    ["weight", "700"],
    ["style", "italic"],
    ["stretch", "expanded"],
    ["display", "swap"],
    ["ascentOverride", "50%"],
    ["sizeAdjust", "90%"],
  ])("fails closed for %s=%s", async (key, value) => {
    const h = staticHarness();
    Reflect.set(h.face, key, value);
    expect(await h.owner.load()).toBe(false);
    expect(h.ports.add).not.toHaveBeenCalled();
  });

  it.each(["digest", "face"])("never revives after late %s success", async (step) => {
    const h = staticHarness();
    const hash = deferred<string>(),
      face = deferred<ManagedFace>();
    if (step === "digest") h.ports.digest.mockReturnValue(hash.promise);
    else h.face.load.mockReturnValue(face.promise);
    const pending = h.owner.load();
    await Promise.resolve();
    await Promise.resolve();
    h.owner.retire();
    hash.resolve(h.hash);
    face.resolve(h.face);
    expect(await pending).toBe(false);
    expect(h.ports.add).not.toHaveBeenCalled();
  });

  it("rejects fragments outside the finite corpus and style/family substitution", async () => {
    const h = staticHarness();
    await h.owner.load();
    const lease = required(h.owner.acquire(h.request));
    for (const text of ["X", "e\u0301", "\u1100\u1161", "A\u200dV", "😀", "DENN DENN"])
      expect(h.owner.acquire({ ...h.request, texts: [text] })).toBeNull();
    expect(h.owner.acquire({ ...h.request, family: "DM Sans" })).toBeNull();
    expect(h.owner.acquire({ ...h.request, italic: true })).toBeNull();
    expect(lease.measure("AV", 32)).toBe(10);
    expect(lease.measure("X", 32)).toBeNull();
    expect(
      lease.prepare({
        canvas: { ...h.canvas, isConnected: true },
      } as unknown as CanvasRenderingContext2D),
    ).toBe(false);
    h.owner.retire();
    lease.release();
  });

  it("preserves descriptor checks when inspected property throws", async () => {
    const h = staticHarness();
    Object.defineProperty(h.face, "variationSettings", {
      get() {
        throw new Error("private");
      },
    });
    expect(await h.owner.load()).toBe(false);
    expect(h.ports.add).not.toHaveBeenCalled();
  });

  it("holds cleanup through reentrant add and cannot revive", async () => {
    const h = staticHarness();
    h.ports.add.mockImplementation((face) => {
      h.members.add(face);
      h.owner.retire();
    });
    expect(await h.owner.load()).toBe(false);
    expect(h.members.size).toBe(0);
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
  });

  it("same revision does not share identity or let old cleanup delete new face", async () => {
    const a = staticHarness(),
      b = staticHarness();
    b.ports.randomUUID.mockReturnValue("00000000-0000-4000-8000-000000000002");
    b.face.family = "denn_00000000-0000-4000-8000-000000000002";
    b.ports.faces.mockImplementation(() => a.members.values());
    b.ports.add.mockImplementation((face) => {
      a.members.add(face);
    });
    b.ports.delete.mockImplementation((face) => {
      a.members.delete(face);
    });
    await a.owner.load();
    await b.owner.load();
    const first = required(a.owner.acquire(a.request)),
      second = required(b.owner.acquire(b.request));
    expect(first.identity).not.toBe(second.identity);
    expect(a.owner.revision).toBe(b.owner.revision);
    a.owner.retire();
    first.release();
    expect(b.owner.isCurrent()).toBe(true);
    a.members.add({ ...b.face });
    expect(second.isCurrent()).toBe(false);
    second.release();
  });
});

describe("managed font owner (opt-in protocol)", () => {
  it("has zero environment calls until explicit load, and no ready proof before completion", () => {
    const h = harness();
    expect(h.owner.isCurrent()).toBe(false);
    expect(h.owner.acquire(REQUEST)).toBeNull();
    for (const port of Object.values(h.ports)) expect(port).not.toHaveBeenCalled();
  });

  it.each([
    { byteLength: 2 },
    { sha256: "bad" },
    { family: "" },
    { verifiedTexts: [] },
    { descriptors: { ...DESCRIPTORS, weight: "700" } },
    { descriptors: { ...DESCRIPTORS, style: "italic" } },
    { descriptors: { ...DESCRIPTORS, unknown: "value" } },
  ])("rejects invalid supply before any port: %j", (override) => {
    const h = harness();
    expect(createManagedFontOwner({ ...h.supply, ...override }, h.ports)).toBeNull();
    for (const port of Object.values(h.ports)) expect(port).not.toHaveBeenCalled();
  });

  it("snapshots input bytes, descriptors and evidence before asynchronous digest", async () => {
    const h = harness();
    new Uint8Array(h.supply.bytes).fill(9);
    (h.supply.descriptors as Record<string, string>).weight = "700";
    (h.supply.verifiedTexts as string[]).push("unknown");
    expect(await h.owner.load()).toBe(true);
    expect([...new Uint8Array(h.ports.digest.mock.calls[0][0])]).toEqual([1, 2, 3]);
    expect(h.ports.createFace.mock.calls[0][2].weight).toBe("400");
    expect(h.owner.acquire({ ...REQUEST, texts: ["unknown"] })).toBeNull();
  });

  it("starts once, including reentrant load; hash mismatch never constructs a face", async () => {
    const h = harness();
    h.ports.digest.mockImplementation(async () => {
      void h.owner.load();
      return "cd".repeat(32);
    });
    const attempt = h.owner.load();
    expect(h.owner.load()).toBe(attempt);
    expect(await attempt).toBe(false);
    expect(h.ports.digest).toHaveBeenCalledTimes(1);
    expect(h.ports.createFace).not.toHaveBeenCalled();
    expect(await h.owner.load()).toBe(false);
  });

  it("retiring before the deferred start prevents every port", async () => {
    const h = harness();
    const attempt = h.owner.load();
    h.owner.retire();
    expect(await attempt).toBe(false);
    for (const port of Object.values(h.ports)) expect(port).not.toHaveBeenCalled();
  });

  it("retiring while hashing blocks the late face construction", async () => {
    const h = harness();
    const hash = deferred<string>();
    h.ports.digest.mockReturnValue(hash.promise);
    const attempt = h.owner.load();
    await Promise.resolve();
    h.owner.retire();
    hash.resolve(HASH);
    expect(await attempt).toBe(false);
    expect(h.ports.createFace).not.toHaveBeenCalled();
  });

  it.each(["resolve", "reject"] as const)(
    "never registers a retired late load: %s",
    async (mode) => {
      const h = harness();
      const load = deferred<ManagedFace>();
      h.face.load.mockReturnValue(load.promise);
      const attempt = h.owner.load();
      await vi.waitFor(() => expect(h.face.load).toHaveBeenCalledTimes(1));
      h.owner.retire();
      if (mode === "resolve") load.resolve(h.face);
      else load.reject(new Error("private details"));
      expect(await attempt).toBe(false);
      expect(h.ports.add).not.toHaveBeenCalled();
      expect(h.ports.delete).not.toHaveBeenCalled();
      expect(h.ports.createCanvas).not.toHaveBeenCalled();
    },
  );

  it.each([
    "family",
    "status",
    "weight",
    "featureSettings",
    "variationSettings",
    "ascentOverride",
  ] as const)("detects eventless %s drift and never revives after restoration", async (key) => {
    const h = harness();
    expect(await h.owner.load()).toBe(true);
    const lease = required(h.owner.acquire(REQUEST));
    const previous = h.face[key];
    h.face[key] = "changed";
    expect(lease.isCurrent()).toBe(false);
    h.face[key] = previous;
    expect(lease.isCurrent()).toBe(false);
    expect(h.ports.delete).not.toHaveBeenCalled();
    lease.release();
    expect(h.ports.delete).toHaveBeenCalledExactlyOnceWith(h.face);
  });

  it.each(["delete", "duplicate"])("detects eventless membership %s", async (mode) => {
    const h = harness();
    await h.owner.load();
    const lease = required(h.owner.acquire(REQUEST));
    if (mode === "delete") h.members.delete(h.face);
    else h.members.add({ ...h.face, family: `"${h.face.family.toUpperCase()}"` });
    expect(lease.isCurrent()).toBe(false);
    lease.release();
    expect(h.ports.delete).toHaveBeenCalledExactlyOnceWith(h.face);
  });

  it("rejects existing alias without deleting the foreign face", async () => {
    const h = harness();
    h.members.add(h.face);
    expect(await h.owner.load()).toBe(false);
    expect(h.ports.createFace).not.toHaveBeenCalled();
    expect(h.ports.delete).not.toHaveBeenCalled();
    expect(h.members.has(h.face)).toBe(true);
  });

  it("ignores unrelated faces, and releases only its own registration", async () => {
    const h = harness();
    const other = { ...h.face, family: "unrelated" };
    h.members.add(other);
    await h.owner.load();
    expect(h.owner.isCurrent()).toBe(true);
    h.owner.retire();
    expect([...h.members]).toEqual([other]);
  });

  it("notifies invalidation before cleanup and waits for the final lease", async () => {
    const h = harness();
    await h.owner.load();
    const a = required(h.owner.acquire(REQUEST));
    const b = required(h.owner.acquire(REQUEST));
    expect(a.identity).toBe(b.identity);
    const listener = vi.fn(() => {
      expect(a.isCurrent()).toBe(false);
      expect(h.ports.delete).not.toHaveBeenCalled();
    });
    h.owner.subscribe(listener);
    h.owner.retire();
    h.owner.retire();
    expect(listener).toHaveBeenCalledTimes(1);
    a.release();
    a.release();
    expect(h.ports.delete).not.toHaveBeenCalled();
    b.release();
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
    expect(h.canvas.width).toBe(0);
    expect(h.owner.acquire(REQUEST)).toBeNull();
  });

  it("unsubscribe and throwing listeners cannot prevent cleanup", async () => {
    const h = harness();
    await h.owner.load();
    const unused = vi.fn();
    h.owner.subscribe(unused)();
    h.owner.subscribe(() => {
      throw new Error("secret");
    });
    expect(() => h.owner.retire()).not.toThrow();
    expect(unused).not.toHaveBeenCalled();
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
  });

  it.each([
    { family: "missing" },
    { weight: "bold" as const },
    { italic: true },
    { texts: ["한글"] },
    { texts: ["a\u0301"] },
    { texts: ["x\u200dy"] },
    { texts: [] },
  ])("blocks unverified exact requests without measurement: %j", async (overrides) => {
    const h = harness();
    await h.owner.load();
    expect(h.owner.acquire({ ...REQUEST, ...overrides })).toBeNull();
    expect(h.context.measureText).not.toHaveBeenCalled();
  });

  it("measures only verified request fragments at a finite size, with the owned alias", async () => {
    const h = harness();
    await h.owner.load();
    const lease = required(h.owner.acquire(REQUEST));
    expect(lease.measure("AV", 12)).toBe(10);
    expect(h.context.font).toBe(`12px "denn_${UUID}", sans-serif`);
    expect(lease.measure("V T", 12)).toBeNull(); // substring alone is NOT evidence
    expect(lease.measure("AV", 0)).toBeNull();
    expect(lease.measure("AV", NaN)).toBeNull();
    expect(h.context.measureText).toHaveBeenCalledTimes(1);
    expect("fontKerning" in h.context).toBe(false); // No fabricated native controls
    lease.release();
    expect(lease.measure("AV", 12)).toBeNull();
  });

  it.each([NaN, Infinity, -1])("rejects invalid native width %s", async (width) => {
    const h = harness();
    await h.owner.load();
    h.context.measureText.mockReturnValue({ width });
    expect(required(h.owner.acquire(REQUEST)).measure("AV", 12)).toBeNull();
  });

  it("retire/release during measurement defers cleanup until native call returns", async () => {
    const h = harness();
    await h.owner.load();
    const lease = required(h.owner.acquire(REQUEST));
    h.context.measureText.mockImplementation(() => {
      h.owner.retire();
      lease.release();
      expect(h.ports.delete).not.toHaveBeenCalled();
      return { width: 10 };
    });
    expect(lease.measure("AV", 12)).toBeNull();
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
  });

  it("blocks recursive measurement without corrupting the outer request", async () => {
    const h = harness();
    await h.owner.load();
    const lease = required(h.owner.acquire(REQUEST));
    h.context.measureText.mockImplementation(() => {
      expect(lease.measure("A", 12)).toBeNull();
      return { width: 10 };
    });
    expect(lease.measure("AV", 12)).toBe(10);
    expect(h.context.measureText).toHaveBeenCalledTimes(1);
  });

  it("rejects connected, foreign document and language-mismatched execution targets", async () => {
    const h = harness();
    await h.owner.load();
    const lease = required(h.owner.acquire(REQUEST));
    for (const overrides of [{ isConnected: true }, { ownerDocument: {} }, { lang: "ko" }]) {
      const target = { ...h.canvas, ...overrides };
      expect(
        lease.prepare({ ...h.context, canvas: target } as unknown as CanvasRenderingContext2D),
      ).toBe(false);
    }
  });

  it("cleans up a partial add even when its callback retires and throws", async () => {
    const h = harness();
    h.ports.add.mockImplementation((value) => {
      h.members.add(value);
      h.owner.retire();
      expect(h.ports.delete).not.toHaveBeenCalled();
      throw new Error("raw native failure");
    });
    expect(await h.owner.load()).toBe(false);
    expect(h.ports.delete).toHaveBeenCalledExactlyOnceWith(h.face);
    expect(h.members.size).toBe(0);
  });

  it("discards a canvas returned after synchronous retirement", async () => {
    const h = harness();
    h.ports.createCanvas.mockImplementation(() => {
      h.owner.retire();
      return h.canvas as unknown as HTMLCanvasElement;
    });
    expect(await h.owner.load()).toBe(false);
    expect(h.canvas.width).toBe(0);
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
    expect(h.canvas.getContext).not.toHaveBeenCalled();
  });

  it.each(["digest", "createFace", "add", "createCanvas"] as const)(
    "fails safely when %s throws",
    async (key) => {
      const h = harness();
      h.ports[key].mockImplementation(() => {
        throw new Error("private original");
      });
      expect(await h.owner.load()).toBe(false);
      expect(h.owner.acquire(REQUEST)).toBeNull();
    },
  );

  it("throwing cleanup is terminal and never retried", async () => {
    const h = harness();
    await h.owner.load();
    h.ports.delete.mockImplementation(() => {
      throw new Error("native");
    });
    h.owner.retire();
    h.owner.retire();
    expect(h.owner.isCurrent()).toBe(false);
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
  });

  it("notifies all observers before a listener releases the final lease", async () => {
    const h = harness();
    await h.owner.load();
    const lease = required(h.owner.acquire(REQUEST));
    h.owner.subscribe(() => lease.release());
    h.owner.subscribe(() => expect(h.ports.delete).not.toHaveBeenCalled());
    h.owner.retire();
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
  });

  it("rejects ignored shorthand assignment rather than reusing the previous font", async () => {
    const h = harness();
    await h.owner.load();
    const lease = required(h.owner.acquire(REQUEST));
    expect(lease.measure("AV", 12)).toBe(10);
    let font = h.context.font;
    Object.defineProperty(h.context, "font", {
      get: () => font,
      set: (value: string) => {
        if (value === "1px serif") font = value;
      },
    });
    expect(lease.measure("AV", 15)).toBeNull();
    expect(h.context.measureText).toHaveBeenCalledTimes(1);
  });

  it("rejects recursive prepare and release within profile setters", async () => {
    const h = harness();
    await h.owner.load();
    const lease = required(h.owner.acquire(REQUEST));
    const port = h.context as unknown as CanvasRenderingContext2D;
    Object.defineProperty(h.context, "direction", {
      get: () => "ltr",
      set: () => {
        expect(lease.prepare(port)).toBe(false);
        lease.release();
      },
    });
    expect(lease.prepare(port)).toBe(false);
    expect(lease.isCurrent()).toBe(false);
  });

  it("rejects a different face returned by load, without registering either", async () => {
    const h = harness();
    h.face.load.mockResolvedValue({ ...h.face });
    expect(await h.owner.load()).toBe(false);
    expect(h.ports.add).not.toHaveBeenCalled();
  });

  it("rejects throwing descriptor inspection and membership inspection", async () => {
    for (const target of ["descriptor", "membership"]) {
      const h = harness();
      await h.owner.load();
      if (target === "descriptor")
        Object.defineProperty(h.face, "weight", {
          get() {
            throw new Error("secret");
          },
        });
      else
        h.ports.faces.mockImplementation(() => {
          throw new Error("secret");
        });
      expect(h.owner.isCurrent()).toBe(false);
      expect(h.ports.delete).toHaveBeenCalledTimes(1);
    }
  });

  it("cleans up missing native context without accepting ready", async () => {
    const h = harness();
    h.canvas.getContext.mockReturnValue(null as unknown as typeof h.context);
    expect(await h.owner.load()).toBe(false);
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
    expect(h.canvas.width).toBe(0);
  });

  it("never touches a connected borrowed canvas", async () => {
    const h = harness();
    h.canvas.isConnected = true;
    h.canvas.width = 40;
    expect(await h.owner.load()).toBe(false);
    expect(h.canvas.getContext).not.toHaveBeenCalled();
    expect(h.canvas.width).toBe(40);
  });

  it("old cleanup cannot release the next owner's registration", async () => {
    const a = harness();
    const b = harness();
    b.ports.randomUUID.mockReturnValue("00000000-0000-4000-8000-000000000002");
    b.face.family = "denn_00000000-0000-4000-8000-000000000002";
    b.ports.faces.mockImplementation(() => a.members.values());
    b.ports.add.mockImplementation((face) => {
      a.members.add(face);
    });
    b.ports.delete.mockImplementation((face) => {
      a.members.delete(face);
    });
    await a.owner.load();
    await b.owner.load();
    const old = required(a.owner.acquire(REQUEST));
    a.owner.retire();
    old.release();
    old.release();
    expect(b.owner.isCurrent()).toBe(true);
    expect(a.members.has(b.face)).toBe(true);
    b.owner.retire();
    expect(a.members.size).toBe(0);
  });

  it("does not accept a missing variation descriptor merely because load can succeed", async () => {
    const h = harness();
    Reflect.deleteProperty(h.face, "variationSettings");
    expect(await h.owner.load()).toBe(false);
    expect(h.face.load).not.toHaveBeenCalled();
    expect(h.ports.add).not.toHaveBeenCalled();
    expect(h.ports.createCanvas).not.toHaveBeenCalled();
  });

  it("does not return the previous successful load result after retirement", async () => {
    const h = harness();
    expect(await h.owner.load()).toBe(true);
    h.owner.retire();
    expect(await h.owner.load()).toBe(false);
    expect(h.ports.createFace).toHaveBeenCalledTimes(1);
  });

  it("cannot resurrect ready when context attribute inspection retires the owner", async () => {
    const h = harness();
    h.context.getContextAttributes.mockImplementation(() => {
      h.owner.retire();
      return { alpha: true, colorSpace: "srgb" };
    });
    expect(await h.owner.load()).toBe(false);
    expect(h.owner.isCurrent()).toBe(false);
    expect(h.owner.acquire(REQUEST)).toBeNull();
    expect(h.ports.delete).toHaveBeenCalledTimes(1);
  });
});
