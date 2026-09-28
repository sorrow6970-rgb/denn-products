/** Spec132 internal, opt-in owner. No default font, DOM, network or global registry. */
export interface ManagedFontSupply {
  readonly bytes: ArrayBuffer;
  readonly sha256: string;
  readonly byteLength: number;
  readonly family: string;
  readonly weight: "normal" | "bold";
  readonly italic: boolean;
  readonly language: "en" | "ko";
  /** Exact, independently validated strings, INCLUDING builder fragments/glyph measurements.
   * This test-supply evidence is NOT a cmap parser or a general Unicode support assertion. */
  readonly verifiedTexts: readonly string[];
  /** Expected native serialization for this exact binary/instance. Missing support fails closed. */
  readonly descriptors: Readonly<Record<string, string>>;
}

export interface ManagedFace {
  readonly family: string;
  readonly status: string;
  load(): Promise<ManagedFace>;
}

export interface ManagedFontEnvironment {
  /** Trusted ports: fresh UUID, SHA-256 and NEW binary FontFace/unused detached Canvas. */
  randomUUID(): string;
  digest(bytes: ArrayBuffer): Promise<string>;
  createFace(
    alias: string,
    bytes: ArrayBuffer,
    descriptors: Readonly<Record<string, string>>,
  ): ManagedFace;
  faces(): Iterable<ManagedFace>;
  add(face: ManagedFace): void;
  delete(face: ManagedFace): void;
  createCanvas(): HTMLCanvasElement;
}

export interface ManagedFontRequest {
  readonly family: string;
  readonly weight: "normal" | "bold";
  readonly italic: boolean;
  readonly texts: readonly string[];
}

export interface ManagedFontLease {
  readonly identity: object;
  readonly alias: string;
  readonly language: "en" | "ko";
  isCurrent(): boolean;
  /** Only use on a new private execution target, before its effective scale is installed. */
  prepare(context: CanvasRenderingContext2D): boolean;
  /** null is a failed measurement, never a fallback width. */
  measure(text: string, sizePx: number): number | null;
  release(): void;
}

export interface ManagedFontOwner {
  load(): Promise<boolean>;
  acquire(request: ManagedFontRequest): ManagedFontLease | null;
  isCurrent(): boolean;
  subscribe(listener: () => void): () => void;
  retire(): void;
}

const descriptorKeys = [
  "style",
  "weight",
  "stretch",
  "unicodeRange",
  "variant",
  "featureSettings",
  "variationSettings",
  "display",
  "ascentOverride",
  "descentOverride",
  "lineGapOverride",
  "sizeAdjust",
] as const;
const requiredKeys = [
  "style",
  "weight",
  "stretch",
  "unicodeRange",
  "featureSettings",
  "variationSettings",
];

function familyKey(family: string): string {
  return family.replace(/^(["'])(.*)\1$/, "$2").toLowerCase();
}

// S40 audited full-static copies, NOT equivalent byte revisions of the variable originals.
// No font bytes or filesystem/network loader are included in this module.
const staticRecords = Object.freeze({
  "fp5-static-v1/dm-normal-400": Object.freeze([
    56784,
    "d1976fdc92c6881f7a4ecb58e0a2c71be101a6b61e74843294c1608409956980",
  ] as const),
  "fp5-static-v1/dm-normal-700": Object.freeze([
    56832,
    "638ca386b4fe9e91129d6a8a035c716ef2bdb549d241be76c03eaef7c8318a11",
  ] as const),
  "fp5-static-v1/dm-italic-400": Object.freeze([
    61256,
    "480c13eff0447a0e87b0805adcfdc0c2e26aa8236779328879d7bef782c561d1",
  ] as const),
  "fp5-static-v1/dm-italic-700": Object.freeze([
    61260,
    "96d76c26f9a850848843494ba1b05c91bdb7d10d5cd8a00b3a863753d65c0740",
  ] as const),
  "fp5-static-v1/noto-400": Object.freeze([
    6224840,
    "e5056d590ea3a6b64a6dc6fea10f49df784e5ca0b602a994c001e8eba64b2cda",
  ] as const),
  "fp5-static-v1/noto-700": Object.freeze([
    6222696,
    "213ae39172bfd470d87024791a8e09e052df6fea85ff35f6e9e013fb876c09ce",
  ] as const),
});

export type ManagedStaticFontRevision = keyof typeof staticRecords;
export interface ManagedStaticFontOwner extends ManagedFontOwner {
  readonly revision: ManagedStaticFontRevision;
}

/** Only the finite S42 synthetic corpus; not general customer text/shaping certification. */
export function createManagedStaticFontOwner(
  input: { readonly revision: ManagedStaticFontRevision; readonly bytes: ArrayBuffer },
  environment: ManagedFontEnvironment,
): ManagedStaticFontOwner | null {
  try {
    if (!input || typeof input !== "object") return null;
    const keys = Reflect.ownKeys(input);
    if (keys.length !== 2 || !keys.includes("revision") || !keys.includes("bytes")) return null;
    const revision = input.revision;
    const provided = input.bytes;
    if (typeof revision !== "string" || !Object.hasOwn(staticRecords, revision)) return null;
    const [byteLength, sha256] = staticRecords[revision];
    const getLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength")?.get;
    if (!getLength || getLength.call(provided) !== byteLength) return null;
    // Do not call slice: even its intrinsic consults the caller's constructor/@@species.
    // Allocate our own plain buffer so the input cannot retain a reference to the snapshot.
    const snapshot = new ArrayBuffer(byteLength);
    new Uint8Array(snapshot).set(new Uint8Array(provided));
    const id = revision.slice("fp5-static-v1/".length);
    const language = id.startsWith("noto-") ? "ko" : "en";
    const italic = id.startsWith("dm-italic-");
    const bold = id.endsWith("-700");
    const corpus = Array.from(language === "ko" ? "한글 가나다" : "AV To ffi DENN");
    const texts = new Set([""]);
    for (let start = 0; start < corpus.length; start++)
      for (let end = start + 1; end <= corpus.length; end++)
        texts.add(corpus.slice(start, end).join(""));
    const owner = createOwner(
      {
        bytes: snapshot,
        byteLength,
        sha256,
        family: `DENN FP5 ${id}`,
        language,
        italic,
        weight: bold ? "bold" : "normal",
        verifiedTexts: [...texts],
        descriptors: {
          style: italic ? "italic" : "normal",
          weight: bold ? "700" : "400",
          stretch: "normal",
          unicodeRange: "U+0-10FFFF",
          featureSettings: '"kern"',
          display: "auto",
          variant: "normal",
          ascentOverride: "normal",
          descentOverride: "normal",
          lineGapOverride: "normal",
          sizeAdjust: "100%",
        },
      },
      environment,
      true,
    );
    return owner ? Object.freeze({ ...owner, revision }) : null;
  } catch {
    return null;
  }
}

function staticDescriptorsMatch(
  face: ManagedFace,
  expected: Readonly<Record<string, string>>,
): boolean {
  const actual = face as unknown as Record<string, unknown>;
  if (actual.variationSettings !== undefined && actual.variationSettings !== "normal") return false;
  if (actual.unicodeRange !== "U+0-10FFFF" && actual.unicodeRange !== "U+0-10ffff") return false;
  if (actual.featureSettings !== '"kern"' && actual.featureSettings !== '"kern" 1') return false;
  for (const key of ["style", "weight", "stretch"]) if (actual[key] !== expected[key]) return false;
  for (const key of [
    "display",
    "variant",
    "ascentOverride",
    "descentOverride",
    "lineGapOverride",
    "sizeAdjust",
  ])
    if (actual[key] !== undefined && actual[key] !== expected[key]) return false;
  return true;
}

/** Returns null for invalid supply without invoking any environment port. */
export function createManagedFontOwner(
  input: ManagedFontSupply,
  environment: ManagedFontEnvironment,
): ManagedFontOwner | null {
  return createOwner(input, environment, false);
}

function createOwner(
  input: ManagedFontSupply,
  environment: ManagedFontEnvironment,
  staticProfile: boolean,
): ManagedFontOwner | null {
  let bytes: ArrayBuffer;
  let supply: Omit<ManagedFontSupply, "bytes">;
  let texts: Set<string>;
  try {
    bytes = input.bytes.slice(0);
    const descriptors = Object.freeze({ ...input.descriptors });
    const verifiedTexts = [...input.verifiedTexts];
    supply = Object.freeze({
      sha256: input.sha256,
      byteLength: input.byteLength,
      family: input.family,
      weight: input.weight,
      italic: input.italic,
      language: input.language,
      verifiedTexts,
      descriptors,
    });
    if (
      !Number.isSafeInteger(supply.byteLength) ||
      supply.byteLength <= 0 ||
      bytes.byteLength !== supply.byteLength ||
      !/^[a-fA-F0-9]{64}$/.test(supply.sha256) ||
      typeof supply.family !== "string" ||
      supply.family.length === 0 ||
      !["normal", "bold"].includes(supply.weight) ||
      typeof supply.italic !== "boolean" ||
      !["en", "ko"].includes(supply.language) ||
      verifiedTexts.length === 0 ||
      verifiedTexts.some((text) => typeof text !== "string") ||
      Object.keys(descriptors).some((key) => !descriptorKeys.some((known) => known === key)) ||
      Object.values(descriptors).some((value) => typeof value !== "string" || value.length === 0) ||
      requiredKeys.some(
        (key) => !(staticProfile && key === "variationSettings") && !descriptors[key],
      ) ||
      descriptors.style !== (supply.italic ? "italic" : "normal") ||
      descriptors.weight !== (supply.weight === "bold" ? "700" : "400") ||
      descriptors.stretch !== "normal"
    )
      return null;
    texts = new Set(verifiedTexts);
  } catch {
    return null;
  }

  let state: "unavailable" | "preparing" | "ready" | "retired" = "unavailable";
  let promise: Promise<boolean> | undefined;
  let alias = "";
  let face: ManagedFace | undefined;
  let stamp: readonly (string | undefined)[] = [];
  let registered = false;
  let canvas: HTMLCanvasElement | undefined;
  let measuring: CanvasRenderingContext2D | undefined;
  let leases = 0;
  let operations = 0;
  let checking = false;
  let profiling = false;
  let reading = false;
  let cleaned = false;
  const identity = Object.freeze({});
  const listeners = new Set<() => void>();
  const cleanup = () => {
    if (state !== "retired" || leases !== 0 || operations !== 0 || cleaned) return;
    cleaned = true;
    // Logical invalidation precedes every callback and cleanup. No retries on cleanup errors.
    if (registered && face) {
      registered = false;
      try {
        environment.delete(face);
      } catch {
        /* Only this owner's face, best effort. */
      }
    }
    if (canvas) {
      try {
        canvas.width = 0;
        canvas.height = 0;
      } catch {
        /* Terminal logical disposal. */
      }
    }
  };
  const retire = () => {
    if (state === "retired") return;
    state = "retired";
    bytes = new ArrayBuffer(0);
    operations++;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        /* No exception text escapes the owner. */
      }
    }
    listeners.clear();
    operations--;
    cleanup();
  };
  const values = (value: ManagedFace) =>
    descriptorKeys.map((key) => (value as unknown as Record<string, string | undefined>)[key]);
  const exclusive = (expected?: ManagedFace) => {
    let count = 0;
    for (const member of environment.faces()) {
      if (familyKey(member.family) !== familyKey(alias)) continue;
      if (member !== expected) return false;
      count++;
    }
    return count === (expected ? 1 : 0);
  };
  const current = (): boolean => {
    if (state !== "ready" || checking) return false;
    checking = true;
    let valid = false;
    try {
      valid =
        !!face &&
        face.family === alias &&
        face.status === "loaded" &&
        exclusive(face) &&
        values(face).every((value, index) => value === stamp[index]) &&
        !!canvas &&
        !canvas.isConnected &&
        canvas.parentNode === null &&
        canvas.lang === supply.language &&
        canvas.width === 1 &&
        canvas.height === 1;
    } catch {
      valid = false;
    } finally {
      checking = false;
    }
    if (!valid) retire();
    return valid && state === "ready";
  };
  const profile = (context: CanvasRenderingContext2D): boolean => {
    if (profiling || !current()) return false;
    profiling = true;
    try {
      const target = context.canvas;
      if (
        !target ||
        target.isConnected ||
        target.parentNode !== null ||
        target.ownerDocument !== canvas?.ownerDocument ||
        target.lang !== supply.language
      )
        return false;
      // Engine-local isolated profile: never fabricate native properties with expandos.
      const assignments = {
        direction: "ltr",
        fontKerning: "normal",
        fontStretch: "normal",
        fontVariantCaps: "normal",
        textRendering: "auto",
        letterSpacing: "0px",
        wordSpacing: "0px",
      };
      const record = context as unknown as Record<string, string>;
      for (const [key, value] of Object.entries(assignments)) {
        if (key in context) {
          record[key] = value;
          if (record[key] !== value || !current()) return false;
        } else if (key === "direction") return false;
      }
      return current();
    } finally {
      profiling = false;
    }
  };
  const owner: ManagedFontOwner = {
    load() {
      if (state === "retired") return Promise.resolve(false);
      if (promise) return promise;
      state = "preparing";
      // Defer ports until promise is stored, so a reentrant load cannot start a second attempt.
      promise = Promise.resolve()
        .then(async () => {
          try {
            if (state !== "preparing") return false;
            const hash = await environment.digest(bytes.slice(0));
            if (state !== "preparing" || hash.toLowerCase() !== supply.sha256.toLowerCase())
              return false;
            const uuid = environment.randomUUID();
            if (
              state !== "preparing" ||
              !/^[a-fA-F0-9]{8}-(?:[a-fA-F0-9]{4}-){3}[a-fA-F0-9]{12}$/.test(uuid)
            )
              return false;
            alias = `denn_${uuid}`;
            if (!exclusive() || state !== "preparing") return false;
            face = environment.createFace(alias, bytes, supply.descriptors);
            bytes = new ArrayBuffer(0);
            if (state !== "preparing" || !face || face.family !== alias) return false;
            stamp = values(face);
            if (
              staticProfile
                ? !staticDescriptorsMatch(face, supply.descriptors)
                : Object.entries(supply.descriptors).some(
                    ([key, expected]) =>
                      (face as unknown as Record<string, string>)[key] !== expected,
                  )
            )
              return false;
            if ((await face.load()) !== face || state !== "preparing" || face.status !== "loaded")
              return false;
            // Hold cleanup across add/create callbacks, including partial side effects followed by throw.
            operations++;
            try {
              if (!exclusive() || state !== "preparing") return false;
              registered = true;
              environment.add(face);
              if (state !== "preparing") return false;
              const fresh = environment.createCanvas();
              if (!fresh || fresh.isConnected || fresh.parentNode !== null) return false;
              canvas = fresh;
              if (state !== "preparing") return false;
              canvas.lang = supply.language;
              if (state !== "preparing") return false;
              canvas.width = 1;
              if (state !== "preparing") return false;
              canvas.height = 1;
              if (state !== "preparing") return false;
              measuring = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" }) ?? undefined;
              if (!measuring || state !== "preparing") return false;
              const attributes = measuring.getContextAttributes();
              if (
                (attributes.alpha !== undefined && attributes.alpha !== true) ||
                (attributes.colorSpace !== undefined && attributes.colorSpace !== "srgb")
              )
                return false;
              if (state !== "preparing") return false;
              state = "ready";
              return current() && profile(measuring);
            } finally {
              operations--;
              cleanup();
            }
          } catch {
            return false;
          }
        })
        .then((ok) => {
          if (!ok) retire();
          return ok && current();
        });
      return promise;
    },
    acquire(request) {
      try {
        if (
          !current() ||
          request.family !== supply.family ||
          request.weight !== supply.weight ||
          request.italic !== supply.italic
        )
          return null;
        const requested = new Set(request.texts);
        if (requested.size === 0 || [...requested].some((text) => !texts.has(text)) || !current())
          return null;
        let alive = true;
        leases++;
        const live = () => alive && current() && alive;
        return Object.freeze({
          identity,
          alias,
          language: supply.language,
          isCurrent: live,
          prepare(context: CanvasRenderingContext2D) {
            if (!live()) return false;
            operations++;
            try {
              return profile(context) && live();
            } catch {
              return false;
            } finally {
              operations--;
              cleanup();
            }
          },
          measure(text: string, sizePx: number) {
            if (
              !live() ||
              reading ||
              !Number.isFinite(sizePx) ||
              sizePx <= 0 ||
              !texts.has(text) ||
              ![...requested].some((full) => full.includes(text))
            )
              return null;
            operations++;
            reading = true;
            try {
              if (!measuring || !profile(measuring) || !live()) return null;
              // Same shorthand as the shared executor; no plan-time or paint-time family fallback.
              const style = supply.italic ? "italic " : "";
              const weight = supply.weight === "bold" ? "bold " : "";
              // Invalid native shorthand assignment must not retain a previous valid alias.
              measuring.font = "1px serif";
              if (!live()) return null;
              measuring.font = `${style}${weight}${sizePx}px "${alias}", sans-serif`;
              if (!live() || !measuring.font.includes(alias)) return null;
              const width = measuring.measureText(text).width;
              return live() && Number.isFinite(width) && width >= 0 ? width : null;
            } catch {
              return null;
            } finally {
              reading = false;
              operations--;
              cleanup();
            }
          },
          release() {
            if (!alive) return;
            alive = false;
            leases--;
            cleanup();
          },
        });
      } catch {
        return null;
      }
    },
    isCurrent: current,
    subscribe(listener) {
      if (state === "retired") return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    retire,
  };
  return Object.freeze(owner);
}
