import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

// Preflight only: passing these tests alone is NOT actual Composer integration completion.
// Fixed local originals; no downloads, production font registration or generic font parser.
const supply = new URL(
  "../../test-results/spec-132-font-supply/8e44913e4ff26fc997e6856c1ec40ff4791c98c5/",
  import.meta.url,
);
const records = [
  ["DMSans[opsz,wght].ttf", "8CD08D97E89C24D0AA92EDD2F0F4C8EE6195EEE9B7C9F154865A58B02F0C1C0D"],
  [
    "DMSans-Italic[opsz,wght].ttf",
    "22259C0CC8237221B80F44C76BA8D36E6BCE3CDA72779F5B2773643D499720AE",
  ],
  ["NotoSansKR[wght].ttf", "194018E6B2B293A7964F037B25C0249CE1418BC9AB3C971060A03AA57861E252"],
  ["DM-Sans-OFL.txt", "9AF36190332437F5ECD09974DE43C1F7C77A310A996CDD8CEB25628B458840E1"],
  ["Noto-Sans-KR-OFL.txt", "1C05C68C34F9708415AADA51F17E1B0092D2CEA709BF4A94CD38114F9E73D7D9"],
] as const;
const bytes = records.map(([name, hash]) => {
  const value = readFileSync(fileURLToPath(new URL(encodeURIComponent(name), supply)));
  if (createHash("sha256").update(value).digest("hex").toUpperCase() !== hash) {
    throw new Error("Spec132 local supply identity mismatch");
  }
  return value;
});

test("spec132 static owner lifetime and exact local reference (NOT Composer integration)", async ({
  page,
  browser,
}) => {
  const local = new URL("../../test-results/spec-132-font-static/fp5-20260914/", import.meta.url);
  const raw = readFileSync(fileURLToPath(new URL("manifest.json", local)));
  expect(createHash("sha256").update(raw).digest("hex")).toBe(
    "c9348ab342d60baa08a7979536d119dafa97fec8e9b8fedb2482782aab029802",
  );
  const manifest = JSON.parse(raw.toString("utf8")) as {
    instances: Array<{ id: string; file: string; sha256: string; size: number }>;
  };
  const ids = [
    "dm-normal-400",
    "dm-normal-700",
    "dm-italic-400",
    "dm-italic-700",
    "noto-400",
    "noto-700",
  ];
  expect(manifest.instances.map((entry) => entry.id)).toEqual(ids);
  const supplied = manifest.instances.map((entry, index) => {
    expect(entry.file).toBe(`${ids[index]}.ttf`);
    const value = readFileSync(fileURLToPath(new URL(`output/${entry.file}`, local)));
    expect(value.byteLength).toBe(entry.size);
    expect(createHash("sha256").update(value).digest("hex")).toBe(entry.sha256);
    return value;
  });
  for (const index of [3, 4]) {
    const notice = readFileSync(fileURLToPath(new URL(`output/${records[index][0]}`, local)));
    expect(createHash("sha256").update(notice).digest("hex").toUpperCase()).toBe(records[index][1]);
  }
  const accepted = Array.from({ length: 6 }, () => 0);
  let rejected = 0;
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("pageerror"));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()))
      errors.push(
        message.text().startsWith("Canvas2D: Multiple readback operations using getImageData")
          ? "canvas-readback-warning"
          : message.type(),
      );
  });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    const index =
      url.origin === "http://localhost:4183" && !url.search
        ? ids.findIndex((id) => url.pathname === `/__spec132-static-owner/${id}`)
        : -1;
    if (index >= 0) {
      accepted[index]++;
      return route.fulfill({ body: supplied[index], contentType: "font/ttf" });
    }
    if (url.origin === "http://localhost:4183" && !url.pathname.startsWith("/__spec132-"))
      return route.continue();
    rejected++;
    return route.abort();
  });
  await page.goto("http://localhost:4183/e2e-canvas-fixture.html?composerSource=1");
  const before = await page.evaluate(() => document.fonts.size);
  expect(accepted).toEqual([0, 0, 0, 0, 0, 0]);
  expect(await page.locator("canvas").count()).toBe(0);
  await page.getByTestId("static-font-owner-probe").click();
  await expect(page.getByTestId("static-font-owner-report")).toHaveText(/^\[/, { timeout: 30000 });
  const rows = JSON.parse(await page.getByTestId("static-font-owner-report").innerText());
  console.log(
    "spec132-static-owner",
    JSON.stringify({ version: browser.version(), rows, accepted, rejected, errors }),
  );
  expect(accepted).toEqual([1, 1, 1, 1, 1, 1]);
  expect(rejected).toBe(0);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.fonts.size)).toBe(before);
  expect(await page.locator("canvas").count()).toBe(0);
  expect(rows).toEqual(
    ids.map((id) => ({
      id,
      loaded: true,
      wrongBytes: true,
      prepared: true,
      comparisons: [12, 32, 48].map((size) => ({
        size,
        width: true,
        pixels: true,
        png: true,
        current: true,
      })),
      fragments: true,
      planCases: (
        [
          ["left", 0],
          ["center", 1],
          ["right", -1],
        ] as const
      ).flatMap(([align, spacing]) =>
        [1, 1.25, 2].map((scale) => ({
          align,
          spacing,
          scale,
          lines: true,
          pixels: true,
          png: true,
          shown: true,
          exactPlan: true,
          current: true,
        })),
      ),
      denied: true,
      contextDenied: true,
      stale: true,
      held: true,
      cleaned: true,
      successorLoaded: true,
      separate: true,
      oldCleanupSafe: true,
      duplicateDenied: true,
      lateStopped: true,
      urls: 0,
    })),
  );
});

test("spec132 FP5 static font diagnostic (NOT supply adoption)", async ({ page, browser }) => {
  const local = new URL("../../test-results/spec-132-font-static/fp5-20260914/", import.meta.url);
  const manifest = readFileSync(fileURLToPath(new URL("manifest.json", local)));
  expect(createHash("sha256").update(manifest).digest("hex")).toBe(
    "c9348ab342d60baa08a7979536d119dafa97fec8e9b8fedb2482782aab029802",
  );
  const inputs = [
    {
      id: "dm-normal-400",
      source: 0,
      weight: 400,
      style: "normal",
      hash: "d1976fdc92c6881f7a4ecb58e0a2c71be101a6b61e74843294c1608409956980",
    },
    {
      id: "dm-normal-700",
      source: 0,
      weight: 700,
      style: "normal",
      hash: "638ca386b4fe9e91129d6a8a035c716ef2bdb549d241be76c03eaef7c8318a11",
    },
    {
      id: "dm-italic-400",
      source: 1,
      weight: 400,
      style: "italic",
      hash: "480c13eff0447a0e87b0805adcfdc0c2e26aa8236779328879d7bef782c561d1",
    },
    {
      id: "dm-italic-700",
      source: 1,
      weight: 700,
      style: "italic",
      hash: "96d76c26f9a850848843494ba1b05c91bdb7d10d5cd8a00b3a863753d65c0740",
    },
    {
      id: "noto-400",
      source: 2,
      weight: 400,
      style: "normal",
      hash: "e5056d590ea3a6b64a6dc6fea10f49df784e5ca0b602a994c001e8eba64b2cda",
    },
    {
      id: "noto-700",
      source: 2,
      weight: 700,
      style: "normal",
      hash: "213ae39172bfd470d87024791a8e09e052df6fea85ff35f6e9e013fb876c09ce",
    },
  ];
  const supplied = inputs.map((input) => {
    const value = readFileSync(fileURLToPath(new URL(`output/${input.id}.ttf`, local)));
    expect(createHash("sha256").update(value).digest("hex")).toBe(input.hash);
    return value;
  });
  const accepted = Array.from({ length: 9 }, () => 0);
  let rejected = 0;
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("pageerror"));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.type());
  });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    const paths = [
      ...inputs.map((input) => `/__spec132-static/${input.id}`),
      ...[0, 1, 2].map((source) => `/__spec132-static/original-${source}`),
    ];
    const index = url.origin === "http://localhost:4183" ? paths.indexOf(url.pathname) : -1;
    if (index >= 0 && !url.search) {
      accepted[index]++;
      return route.fulfill({
        body: index < 6 ? supplied[index] : bytes[index - 6],
        contentType: "font/ttf",
      });
    }
    if (url.origin === "http://localhost:4183" && !url.pathname.startsWith("/__spec132-"))
      return route.continue();
    rejected++;
    return route.abort();
  });
  await page.goto("http://localhost:4183/e2e-canvas-fixture.html?composerSource=1");
  const result = await page.evaluate(
    async (entries) => {
      const before = document.fonts.size;
      const originals = await Promise.all(
        [0, 1, 2].map(async (index) =>
          (await fetch(`/__spec132-static/original-${index}`)).arrayBuffer(),
        ),
      );
      const rows = [];
      const cleanup = [];
      let urls = 0;
      const compare = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
        let changed = 0;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed++;
        return changed;
      };
      for (const entry of entries) {
        const data = await (await fetch(`/__spec132-static/${entry.id}`)).arrayBuffer();
        const variations =
          entry.source === 2 ? `"wght" ${entry.weight}` : `"opsz" 9, "wght" ${entry.weight}`;
        const descriptors = {
          style: entry.style,
          weight: String(entry.weight),
          stretch: "normal",
          featureSettings: '"kern"',
        };
        const candidate = new FontFace(entry.alias, data, descriptors);
        const reference = new FontFace(entry.referenceAlias, originals[entry.source].slice(0), {
          ...descriptors,
          variationSettings: variations,
        });
        const canvas = document.createElement("canvas");
        canvas.lang = entry.source === 2 ? "ko" : "en";
        canvas.width = 640;
        canvas.height = 100;
        const decoded = document.createElement("canvas");
        decoded.width = 640;
        decoded.height = 100;
        try {
          await Promise.all([candidate.load(), reference.load()]);
          document.fonts.add(candidate);
          document.fonts.add(reference);
          const context = canvas.getContext("2d", { willReadFrequently: true });
          const decodedContext = decoded.getContext("2d", { willReadFrequently: true });
          if (!context || !decodedContext) throw new Error("Missing diagnostic context");
          const profile = {
            direction: "ltr",
            fontKerning: "normal",
            fontStretch: "normal",
            fontVariantCaps: "normal",
            textRendering: "auto",
            letterSpacing: "0px",
            wordSpacing: "0px",
          };
          for (const [key, value] of Object.entries(profile)) {
            if (key in context) (context as unknown as Record<string, string>)[key] = value;
          }
          const comparable =
            (reference as unknown as Record<string, string>).variationSettings === variations;
          const text = entry.source === 2 ? "한글 가나다" : "AV To ffi DENN";
          const draw = async (alias: string, size: number) => {
            context.clearRect(0, 0, 640, 100);
            context.font = `${entry.style} ${entry.weight} ${size}px "${alias}"`;
            if (!context.font.includes(alias)) throw new Error("Font selection rejected");
            const width = context.measureText(text).width;
            context.fillText(text, 5, 70);
            const pixels = context.getImageData(0, 0, 640, 100).data;
            const blob = await new Promise<Blob>((resolve, reject) =>
              canvas.toBlob(
                (value) => (value ? resolve(value) : reject(new Error("PNG unavailable"))),
                "image/png",
              ),
            );
            const url = URL.createObjectURL(blob);
            urls++;
            const image = new Image();
            try {
              await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = () => reject(new Error("PNG decode failed"));
                image.src = url;
              });
              decodedContext.clearRect(0, 0, 640, 100);
              decodedContext.drawImage(image, 0, 0);
              return { width, pixels, png: decodedContext.getImageData(0, 0, 640, 100).data };
            } finally {
              image.onload = null;
              image.onerror = null;
              image.removeAttribute("src");
              URL.revokeObjectURL(url);
              urls--;
            }
          };
          for (const size of [12, 32, 48]) {
            const first = await draw(entry.alias, size);
            const repeated = await draw(entry.alias, size);
            const original = comparable ? await draw(entry.referenceAlias, size) : null;
            rows.push({
              id: entry.id,
              size,
              loaded: candidate.status === "loaded",
              member: document.fonts.has(candidate),
              exactStyle: candidate.style === entry.style,
              exactWeight: candidate.weight === String(entry.weight),
              positiveWidth: Number.isFinite(first.width) && first.width > 0,
              painted: first.pixels.some((value) => value !== 0),
              repeatWidthEqual: first.width === repeated.width,
              repeatPixelsChanged: compare(first.pixels, repeated.pixels),
              repeatPngChanged: compare(first.png, repeated.png),
              comparable,
              widthDelta: original ? first.width - original.width : null,
              pixelsChanged: original ? compare(first.pixels, original.pixels) : null,
              pngChanged: original ? compare(first.png, original.png) : null,
            });
          }
        } finally {
          document.fonts.delete(candidate);
          document.fonts.delete(reference);
          canvas.width = canvas.height = decoded.width = decoded.height = 0;
          cleanup.push(!document.fonts.has(candidate) && !document.fonts.has(reference));
        }
      }
      return { rows, cleanup, faceDelta: document.fonts.size - before, urls };
    },
    inputs.map((entry) => ({
      ...entry,
      alias: `denn_${randomUUID()}`,
      referenceAlias: `denn_${randomUUID()}`,
    })),
  );
  console.log(
    "spec132-fp5-static-diagnostic",
    JSON.stringify({ version: browser.version(), accepted, rejected, errors, ...result }),
  );
  expect(accepted).toEqual(Array.from({ length: 9 }, () => 1));
  expect(rejected).toBe(0);
  expect(errors).toEqual([]);
  expect(result.cleanup).toEqual(Array.from({ length: 6 }, () => true));
  expect(result.faceDelta).toBe(0);
  expect(result.urls).toBe(0);
  expect(result.rows).toHaveLength(18);
  expect(
    result.rows.every(
      (row) =>
        row.loaded &&
        row.member &&
        row.exactStyle &&
        row.exactWeight &&
        row.positiveWidth &&
        row.painted &&
        row.repeatWidthEqual &&
        row.repeatPixelsChanged === 0 &&
        row.repeatPngChanged === 0,
    ),
  ).toBe(true);
  // Equality to the variable original is recorded, not silently assumed or tolerance-relaxed.
  // WebKit cannot prove the reference's variation descriptor; those comparisons remain null.
});

test("spec132 CSS-connected axis and ownership diagnostic (NOT owner conformance)", async ({
  page,
  browser,
}) => {
  const accepted = [0, 0, 0];
  let rejected = 0;
  await page.route("**/*", (route) => {
    const index = ["normal", "italic", "korean"].findIndex(
      (id) => route.request().url() === `http://localhost:4183/__spec132-font/${id}`,
    );
    if (index >= 0) {
      accepted[index]++;
      return route.fulfill({
        body: bytes[index],
        contentType: "font/ttf",
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
    const url = new URL(route.request().url());
    if (url.origin === "http://localhost:4183" && !url.pathname.startsWith("/__spec132-font/"))
      return route.continue();
    rejected++;
    return route.abort();
  });
  // A real local origin is required for WebKit to load this page's own font Blob URL.
  // Fixture stays idle: no Composer, product font registration or source is started on mount.
  await page.goto("http://localhost:4183/e2e-canvas-fixture.html?composerSource=1");
  const result = await page.evaluate(
    async (aliases) => {
      const rows = [];
      const effects = [];
      for (const id of ["normal", "italic", "korean"] as const) {
        const response = await fetch(`http://localhost:4183/__spec132-font/${id}`);
        const url = URL.createObjectURL(
          new Blob([await response.arrayBuffer()], { type: "font/ttf" }),
        );
        const samples: Array<{
          opsz: number;
          weight: number;
          size: number;
          width: number;
          pixels: Uint8ClampedArray;
        }> = [];
        try {
          for (const opsz of id === "korean" ? [9] : [9, 40]) {
            for (const weight of [400, 700]) {
              const alias = `denn_${aliases[rows.length]}`;
              const style = document.createElement("style");
              const canvas = document.createElement("canvas");
              canvas.lang = id === "korean" ? "ko" : "en";
              const variation =
                id === "korean" ? `"wght" ${weight}` : `"opsz" ${opsz}, "wght" ${weight}`;
              const css = `@font-face { font-family: ${alias}; src: url("${url}"); font-style: ${id === "italic" ? "italic" : "normal"}; font-weight: ${weight}; font-stretch: normal; font-feature-settings: "kern"; font-variation-settings: ${variation}; }`;
              try {
                document.head.append(style);
                const sheet = style.sheet;
                if (!sheet) throw new Error("missing test sheet");
                sheet.insertRule(css);
                const rule = sheet.cssRules[0] as CSSFontFaceRule;
                const members = [...document.fonts].filter(
                  (face) => face.family.replace(/^["']|["']$/g, "") === alias,
                );
                const face = members[0];
                if (members.length !== 1 || !face) throw new Error("missing test face");
                await face.load();
                const context = canvas.getContext("2d", { willReadFrequently: true });
                if (!context) throw new Error("missing test context");
                const text = id === "korean" ? "한글 가나다" : "AV To ffi DENN";
                for (const size of [12, 32, 48]) {
                  canvas.width = 640;
                  canvas.height = 100;
                  context.direction = "ltr";
                  context.font = `${id === "italic" ? "italic " : ""}${weight} ${size}px "${alias}"`;
                  const width = context.measureText(text).width;
                  context.fillText(text, 5, 70);
                  samples.push({
                    opsz,
                    weight,
                    size,
                    width,
                    pixels: context.getImageData(0, 0, 640, 100).data,
                  });
                }
                const cannotDelete =
                  document.fonts.delete(face) === false && document.fonts.has(face);
                const readback = rule.style.getPropertyValue("font-variation-settings");
                sheet.deleteRule(0);
                const removed = !document.fonts.has(face);
                sheet.insertRule(css);
                const replacementRule = sheet.cssRules[0];
                const replacementFace = [...document.fonts].find(
                  (candidate) => candidate.family.replace(/^["']|["']$/g, "") === alias,
                );
                rows.push({
                  id,
                  opsz,
                  weight,
                  loaded: face.status === "loaded",
                  readback,
                  expected: variation,
                  cannotDelete,
                  removed,
                  newRule: replacementRule !== rule,
                  newFace: !!replacementFace && replacementFace !== face,
                });
              } finally {
                style.remove();
                canvas.width = 0;
                canvas.height = 0;
              }
            }
          }
          for (const size of [12, 32, 48]) {
            const compare = (
              a: (typeof samples)[number] | undefined,
              b: (typeof samples)[number] | undefined,
            ) => {
              if (!a || !b) throw new Error("missing test pair");
              let changed = 0;
              a.pixels.forEach((value, index) => {
                if (value !== b.pixels[index]) changed++;
              });
              return { widthChanged: a.width !== b.width, changedSamples: changed };
            };
            const at = (opsz: number, weight: number) =>
              samples.find((s) => s.opsz === opsz && s.weight === weight && s.size === size);
            effects.push({ id, size, axis: "weight", ...compare(at(9, 400), at(9, 700)) });
            if (id !== "korean")
              for (const weight of [400, 700]) {
                effects.push({
                  id,
                  size,
                  axis: `opsz-${weight}`,
                  ...compare(at(9, weight), at(40, weight)),
                });
              }
          }
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      return { rows, effects, facesLeft: document.fonts.size };
    },
    Array.from({ length: 10 }, () => randomUUID()),
  );
  console.log(
    "spec132-css-axis-diagnostic",
    JSON.stringify({ version: browser.version(), ...result }),
  );
  expect(result.rows).toHaveLength(10);
  expect(
    result.rows.every(
      (row) =>
        row.loaded &&
        row.readback === row.expected &&
        row.cannotDelete &&
        row.removed &&
        row.newRule &&
        row.newFace,
    ),
  ).toBe(true);
  expect(result.effects).toHaveLength(21);
  // Effect magnitude is a diagnostic, not a cross-engine equality or all-glyph assertion.
  expect(result.effects.every((effect) => Number.isSafeInteger(effect.changedSamples))).toBe(true);
  expect(result.facesLeft).toBe(0);
  expect(accepted).toEqual([1, 1, 1]);
  expect(rejected).toBe(0);
});

test("spec132 actual font owner lifetime (NOT Composer integration)", async ({ page }) => {
  let accepted = 0,
    rejected = 0;
  const errors: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://localhost:4183") {
      rejected++;
      return route.abort();
    }
    const index = ["normal", "italic", "korean"].findIndex(
      (id) => url.pathname === `/__spec132-font/${id}`,
    );
    if (index >= 0) {
      accepted++;
      return route.fulfill({
        body: bytes[index],
        contentType: "font/ttf",
        headers: { "x-spec132-sha256": records[index][1] },
      });
    }
    if (url.pathname.startsWith("/__spec132-font/")) {
      rejected++;
      return route.abort();
    }
    return route.continue();
  });
  page.on("pageerror", () => errors.push("pageerror"));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
    if (message.text().startsWith("spec132-font-descriptor-serialization"))
      console.log(message.text());
  });
  await page.goto("http://localhost:4183/e2e-canvas-fixture.html?composerSource=1");
  const before = await page.evaluate(() => document.fonts.size);
  await page.getByTestId("font-owner-probe").click();
  await expect(page.getByTestId("font-owner-report")).toHaveText(/^\[/);
  const rows = JSON.parse(await page.getByTestId("font-owner-report").innerText());
  console.log("spec132-font-owner", JSON.stringify(rows));
  expect(rows).toEqual(
    ["normal", "italic", "korean"].flatMap((id) =>
      ["normal", "bold"].map((weight) => ({
        id,
        weight,
        loaded: true,
        prepared: true,
        widths: [true, true, true],
        missing: true,
        unknown: true,
        stale: true,
        held: true,
        cleaned: true,
      })),
    ),
  );
  expect(await page.evaluate(() => document.fonts.size)).toBe(before);
  expect(await page.locator("canvas").count()).toBe(0);
  expect(accepted).toBe(3);
  expect(rejected).toBe(0);
  expect(errors).toEqual([]);
});

test("spec132 PNG stage diagnostic (NOT roundtrip conformance)", async ({ page }) => {
  let requests = 0;
  await page.route("**/*", (route) => {
    requests++;
    return route.abort();
  });
  const rows = await page.evaluate(async () => {
    const source = document.createElement("canvas");
    source.width = 20;
    source.height = 20;
    const context = source.getContext("2d");
    if (!context) throw new Error("synthetic context");
    context.fillStyle = "rgba(74,53,40,0.73)";
    context.fillRect(1, 1, 18, 18);
    const expected = context.getImageData(0, 0, 20, 20).data;
    const blob = await new Promise<Blob | null>((resolve) => source.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("synthetic encode");
    const results = [];
    try {
      for (const kind of ["canvas", "png"] as const) {
        for (const premultiplyAlpha of ["default", "none", "premultiply"] as const) {
          for (const colorSpaceConversion of ["default", "none"] as const) {
            const bitmap = await createImageBitmap(kind === "canvas" ? source : blob, {
              premultiplyAlpha,
              colorSpaceConversion,
            });
            const target = document.createElement("canvas");
            target.width = 20;
            target.height = 20;
            try {
              const targetContext = target.getContext("2d");
              if (!targetContext) throw new Error("synthetic context");
              targetContext.drawImage(bitmap, 0, 0);
              const pixels = targetContext.getImageData(0, 0, 20, 20).data;
              let changed = 0,
                alphaChanged = 0,
                maxDelta = 0;
              pixels.forEach((value, index) => {
                if (value !== expected[index]) {
                  changed++;
                  if (index % 4 === 3) alphaChanged++;
                }
                maxDelta = Math.max(maxDelta, Math.abs(value - expected[index]));
              });
              results.push({
                kind,
                premultiplyAlpha,
                colorSpaceConversion,
                changed,
                alphaChanged,
                maxDelta,
              });
            } finally {
              bitmap.close();
              target.width = 0;
              target.height = 0;
            }
          }
        }
      }
      return results;
    } finally {
      source.width = 0;
      source.height = 0;
    }
  });
  console.log("spec132-png-stages", JSON.stringify(rows));
  expect(rows).toHaveLength(12);
  expect(rows.every((row) => Number.isFinite(row.maxDelta) && row.maxDelta <= 255)).toBe(true);
  expect(requests).toBe(0);
});

test("spec132 isolated primitive hostile state and PNG (NOT Composer integration)", async ({
  page,
}) => {
  let rejected = 0;
  const errors: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://localhost:4183") return route.continue();
    rejected++;
    return route.abort();
  });
  page.on("pageerror", () => errors.push("pageerror"));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  await page.goto("http://localhost:4183/e2e-canvas-fixture.html?composerSource=1");
  console.log(
    "spec132-primitive-capability",
    await page.evaluate(() => {
      const c = document.createElement("canvas").getContext("2d");
      return {
        settingsMethod: typeof c?.getContextAttributes,
        settings: typeof c?.getContextAttributes === "function" ? c.getContextAttributes() : null,
        bitmapMethod: typeof createImageBitmap,
      };
    }),
  );
  expect(await page.locator("canvas").count()).toBe(0);
  await page.getByTestId("isolated-probe").click();
  await expect(page.getByTestId("isolated-report")).toHaveText(/^\[/);
  const report = JSON.parse(await page.getByTestId("isolated-report").innerText());
  console.log("spec132-primitive-png", JSON.stringify(report));
  expect(
    report.map(
      (row: { scale: number; transfer: boolean; pngReference: boolean; transform: boolean }) => ({
        scale: row.scale,
        transfer: row.transfer,
        pngReference: row.pngReference,
        transform: row.transform,
      }),
    ),
  ).toEqual(
    [1, 1.25, 2].map((scale) => ({ scale, transfer: true, pngReference: true, transform: true })),
  );
  expect(await page.locator("canvas").count()).toBe(0);
  expect(rejected).toBe(0);
  expect(errors).toEqual([]);
});

test("spec132 required Canvas profile uses native accessors, not expandos", async ({ page }) => {
  let requests = 0;
  await page.route("**/*", (route) => {
    requests++;
    return route.abort();
  });
  const checks = await page.evaluate(() => {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) throw new Error("No Canvas2D");
    const profile = {
      direction: "ltr",
      fontKerning: "normal",
      fontStretch: "normal",
      fontVariantCaps: "normal",
      textRendering: "auto",
      letterSpacing: "0px",
      wordSpacing: "0px",
    };
    return Object.entries(profile).map(([key, value]) => {
      let prototype = Object.getPrototypeOf(context);
      let descriptor: PropertyDescriptor | undefined;
      while (prototype && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        prototype = Object.getPrototypeOf(prototype);
      }
      const native = typeof descriptor?.get === "function" && typeof descriptor?.set === "function";
      if (native) Reflect.set(context, key, value);
      return {
        key,
        native,
        value: Reflect.get(context, key) ?? null,
        expected: value,
        own: Object.hasOwn(context, key),
      };
    });
  });
  // Report every missing control in one failure; do not stop the diagnostic at the first key.
  expect(
    checks.filter((check) => !check.native || check.own || check.value !== check.expected),
  ).toEqual([]);
  expect(requests).toBe(0);
});

for (const [index, id] of ["normal", "italic", "korean"].entries()) {
  test(`spec132 pinned font preflight ${id}`, async ({ page }) => {
    const source = `http://localhost:4183/__spec132-font/${id}`;
    let accepted = 0,
      rejected = 0;
    await page.route("**/*", (route) => {
      if (route.request().url() === source) {
        accepted++;
        return route.fulfill({
          body: bytes[index],
          contentType: "font/ttf",
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
      rejected++;
      return route.abort();
    });
    const result = await page.evaluate(
      async ({ source, id }) => {
        const alias = `denn132preflight${id}`;
        const style = id === "italic" ? "italic" : "normal";
        const face = new FontFace(alias, `url("${source}")`, {
          style,
          weight: "400",
          variationSettings: id === "korean" ? '"wght" 400' : '"opsz" 9, "wght" 400',
        });
        try {
          await face.load();
          document.fonts.add(face);
          const context = document.createElement("canvas").getContext("2d");
          if (!context) throw new Error("No Canvas2D");
          context.font = `${style} 400 32px "${alias}"`;
          const width = context.measureText(id === "korean" ? "한글 가나다" : "DENN 2026").width;
          return {
            loaded: face.status === "loaded",
            member: document.fonts.has(face),
            finite: Number.isFinite(width) && width > 0,
          };
        } finally {
          document.fonts.delete(face);
        }
      },
      { source, id },
    );
    expect(result).toEqual({ loaded: true, member: true, finite: true });
    expect(await page.evaluate(() => document.fonts.size)).toBe(0);
    expect(accepted).toBe(1);
    expect(rejected).toBe(0);
  });
}

// S-30 exploratory evidence ONLY. It neither replaces nor waives the required profile test above.
test("spec132 diagnostic CSS and face controls (NOT profile conformance)", async ({
  page,
  browser,
}) => {
  const source = "http://localhost:4183/__spec132-font/normal";
  let accepted = 0;
  let rejected = 0;
  await page.route("**/*", (route) => {
    if (route.request().url() === source) {
      accepted++;
      return route.fulfill({
        body: bytes[0],
        contentType: "font/ttf",
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
    rejected++;
    return route.abort();
  });
  const result = await page.evaluate(async (url) => {
    const data = await (await fetch(url)).arrayBuffer();
    const faces: FontFace[] = [];
    const canvases: HTMLCanvasElement[] = [];
    try {
      for (const [index, featureSettings] of ["normal", '"kern" 0', '"kern" 1'].entries()) {
        const face = new FontFace(`denn132diagnostic${index}`, data, {
          style: "normal",
          weight: "400",
          featureSettings,
          variationSettings: '"opsz" 9, "wght" 400',
        });
        faces.push(face);
        await face.load();
        document.fonts.add(face);
      }
      const cases = [
        { id: "baseline", css: "", prefix: "", face: 0 },
        {
          id: "css-profile",
          css: "font-kerning:normal;font-stretch:normal;font-variant-caps:normal;text-rendering:auto",
          prefix: "",
          face: 0,
        },
        { id: "css-kern-none", css: "font-kerning:none", prefix: "", face: 0 },
        { id: "css-kern-normal", css: "font-kerning:normal", prefix: "", face: 0 },
        { id: "css-small-caps", css: "font-variant-caps:small-caps", prefix: "", face: 0 },
        { id: "css-expanded", css: "font-stretch:expanded", prefix: "", face: 0 },
        { id: "css-speed", css: "text-rendering:optimizeSpeed", prefix: "", face: 0 },
        {
          id: "css-legibility",
          css: "text-rendering:optimizeLegibility",
          prefix: "",
          face: 0,
        },
        { id: "shorthand-small-caps", css: "", prefix: "small-caps ", face: 0 },
        { id: "shorthand-expanded", css: "", prefix: "expanded ", face: 0 },
        { id: "face-kern-off", css: "", prefix: "", face: 1 },
        { id: "face-kern-on", css: "", prefix: "", face: 2 },
      ];
      const equalPixels = (left: Uint8ClampedArray, right: Uint8ClampedArray) =>
        left.length === right.length && left.every((value, index) => value === right[index]);
      const rows = [];
      for (const connected of [false, true]) {
        let baseline: Uint8ClampedArray | undefined;
        for (const candidate of cases) {
          const render = () => {
            const canvas = document.createElement("canvas");
            canvases.push(canvas);
            canvas.width = 512;
            canvas.height = 80;
            canvas.lang = "en";
            canvas.style.cssText = candidate.css;
            if (connected) document.body.append(canvas);
            const context = canvas.getContext("2d");
            if (!context) throw new Error("No Canvas2D");
            context.direction = "ltr";
            context.font = `${candidate.prefix}400 32px "denn132diagnostic${candidate.face}"`;
            context.textAlign = "left";
            context.textBaseline = "alphabetic";
            context.fillStyle = "#000000";
            const width = context.measureText("AV To ffi abc").width;
            context.fillText("AV To ffi abc", 8, 48);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            const style = getComputedStyle(canvas);
            return {
              width,
              pixels,
              font: context.font,
              native: ["fontKerning", "fontStretch", "fontVariantCaps", "textRendering"].map(
                (key) => Reflect.get(context, key) ?? null,
              ),
              css: ["font-kerning", "font-stretch", "font-variant-caps", "text-rendering"].map(
                (key) => style.getPropertyValue(key),
              ),
            };
          };
          const first = render();
          const second = render();
          if (candidate.id === "baseline") baseline = first.pixels;
          rows.push({
            connected,
            id: candidate.id,
            width: first.width,
            font: first.font,
            native: first.native,
            css: first.css,
            pairEqual: first.width === second.width && equalPixels(first.pixels, second.pixels),
            baselinePixels: baseline !== undefined && equalPixels(first.pixels, baseline),
            painted: first.pixels.some((value, index) => index % 4 === 3 && value !== 0),
          });
        }
      }
      return rows;
    } finally {
      for (const canvas of canvases) canvas.remove();
      for (const face of faces) document.fonts.delete(face);
    }
  }, source);
  // Synthetic metrics/readbacks only; no font bytes, ImageData or screenshots are logged.
  console.log("SPEC132_PROFILE_DIAGNOSTIC", JSON.stringify({ version: browser.version(), result }));
  expect(result).toHaveLength(24);
  expect(result.every((row) => row.pairEqual && row.painted && Number.isFinite(row.width))).toBe(
    true,
  );
  expect(await page.evaluate(() => document.fonts.size)).toBe(0);
  expect(await page.locator("canvas").count()).toBe(0);
  expect(accepted).toBe(1);
  expect(rejected).toBe(0);
});

// S-31: prerequisite experiment, NOT a replacement for the original four-accessor gate.
test("spec132 diagnostic isolated backing and profile reference (NOT integration)", async ({
  page,
  browser,
}) => {
  const ids = ["normal", "italic", "korean"];
  const accepted = [0, 0, 0];
  let rejected = 0;
  await page.route("**/*", (route) => {
    const index = ids.findIndex(
      (id) => route.request().url() === `http://localhost:4183/__spec132-font/${id}`,
    );
    if (index < 0) {
      rejected++;
      return route.abort();
    }
    accepted[index]++;
    return route.fulfill({
      body: bytes[index],
      contentType: "font/ttf",
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  const result = await page.evaluate(async (names) => {
    const faces: FontFace[] = [];
    const canvases = new Set<HTMLCanvasElement>();
    const samePixels = (left: Uint8ClampedArray, right: Uint8ClampedArray) =>
      left.length === right.length && left.every((value, index) => value === right[index]);
    const profile = {
      direction: "ltr",
      fontKerning: "normal",
      fontStretch: "normal",
      fontVariantCaps: "normal",
      textRendering: "auto",
      letterSpacing: "0px",
      wordSpacing: "0px",
    };
    const supportsProfile = (context: CanvasRenderingContext2D) =>
      Object.keys(profile).every((key) => {
        let prototype = Object.getPrototypeOf(context);
        while (prototype) {
          const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
          if (descriptor)
            return typeof descriptor.get === "function" && typeof descriptor.set === "function";
          prototype = Object.getPrototypeOf(prototype);
        }
        return false;
      });
    try {
      const rows = [];
      for (const [fontIndex, name] of names.entries()) {
        const data = await (
          await fetch(`http://localhost:4183/__spec132-font/${name}`)
        ).arrayBuffer();
        for (const weight of [400, 700]) {
          const alias = `denn132isolated${fontIndex}w${weight}`;
          const style = name === "italic" ? "italic" : "normal";
          const face = new FontFace(alias, data, {
            style,
            weight: String(weight),
            featureSettings: '"kern" 1',
            variationSettings:
              name === "korean" ? `"wght" ${weight}` : `"opsz" 9, "wght" ${weight}`,
          });
          faces.push(face);
          await face.load();
          document.fonts.add(face);
          for (const size of [12, 32, 64]) {
            for (const scale of [1, 2]) {
              const text = name === "korean" ? "한글 가나다" : "AV To ffi abc";
              const make = () => {
                const canvas = document.createElement("canvas");
                canvases.add(canvas);
                canvas.width = 512 * scale;
                canvas.height = 100 * scale;
                canvas.lang = name === "korean" ? "ko" : "en";
                const context = canvas.getContext("2d");
                if (!context) throw new Error("No Canvas2D");
                context.setTransform(scale, 0, 0, scale, 0, 0);
                context.direction = "ltr";
                context.font = `${style} ${weight} ${size}px "${alias}"`;
                return { canvas, context };
              };
              const draw = (reference: boolean) => {
                const { canvas, context } = make();
                if (reference) {
                  if (!supportsProfile(context)) return null;
                  for (const [key, value] of Object.entries(profile))
                    Reflect.set(context, key, value);
                }
                context.textAlign = "left";
                context.textBaseline = "alphabetic";
                context.fillStyle = "rgba(74, 53, 40, 0.73)";
                const width = context.measureText(text).width;
                context.fillText(text, 8, 75);
                return {
                  canvas,
                  width,
                  pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
                };
              };
              const first = draw(false);
              const second = draw(false);
              if (!first || !second) throw new Error("Missing owned draw");
              const reference = draw(true);
              const target = make();
              target.canvas.style.cssText =
                "font-kerning:none;text-rendering:optimizeSpeed;font-variant-caps:small-caps;font-stretch:expanded";
              document.body.append(target.canvas);
              // Pixel transfer, not rendering text in the CSS-contaminated target.
              target.context.save();
              target.context.setTransform(1, 0, 0, 1, 0, 0);
              target.context.drawImage(first.canvas, 0, 0);
              target.context.restore();
              const copied = target.context.getImageData(
                0,
                0,
                target.canvas.width,
                target.canvas.height,
              ).data;
              const matrix = target.context.getTransform();
              rows.push({
                name,
                weight,
                size,
                scale,
                width: first.width,
                pairEqual: first.width === second.width && samePixels(first.pixels, second.pixels),
                transferEqual: samePixels(first.pixels, copied),
                scalePreserved:
                  matrix.a === scale &&
                  matrix.d === scale &&
                  matrix.b === 0 &&
                  matrix.c === 0 &&
                  matrix.e === 0 &&
                  matrix.f === 0,
                referenceEqual:
                  reference === null
                    ? null
                    : first.width === reference.width && samePixels(first.pixels, reference.pixels),
                referenceWidth: reference?.width ?? null,
              });
              for (const canvas of canvases) canvas.remove();
              canvases.clear();
            }
          }
        }
      }
      return rows;
    } finally {
      for (const canvas of canvases) canvas.remove();
      for (const face of faces) document.fonts.delete(face);
    }
  }, ids);
  console.log(
    "SPEC132_ISOLATED_DIAGNOSTIC",
    JSON.stringify({ version: browser.version(), result }),
  );
  expect(result).toHaveLength(36);
  expect(result.every((row) => row.pairEqual && row.transferEqual && row.scalePreserved)).toBe(
    true,
  );
  // null/false references remain evidence, never converted to a conformance PASS.
  expect(await page.evaluate(() => document.fonts.size)).toBe(0);
  expect(await page.locator("canvas").count()).toBe(0);
  expect(accepted).toEqual([1, 1, 1]);
  expect(rejected).toBe(0);
});
