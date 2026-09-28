// Spec132 primitive probe only. Actual Composer/font/source integration remains a later step.
import { buildPreviewRenderPlan, type PreviewRenderPlan } from "@denn/render";
import { useState } from "react";
import {
  createManagedFontOwner,
  createManagedStaticFontOwner,
  type ManagedFace,
  type ManagedFontOwner,
  type ManagedStaticFontRevision,
} from "../preview/composer-font-proof";
import { executePreviewRenderPlan } from "../canvas/executePreviewPlan";
import {
  createIsolatedDisplayTarget,
  type IsolatedDisplayTarget,
  type IsolatedPlanFrame,
  renderIsolatedPlanFrame,
} from "../canvas/font-bound-execution";

async function probe() {
  const rows: Array<{
    scale: number;
    transfer: boolean;
    png: boolean;
    transform: boolean;
    pngReference: boolean;
    changedSamples: number;
    maxDelta: number;
  }> = [];
  for (const scale of [1, 1.25, 2]) {
    const canvases: HTMLCanvasElement[] = [];
    const make = () => {
      const canvas = document.createElement("canvas");
      canvases.push(canvas);
      return canvas;
    };
    let frame: IsolatedPlanFrame | undefined;
    let displayOwner: IsolatedDisplayTarget | null = null;
    try {
      const art = make();
      art.width = 20;
      art.height = 20;
      const brush = art.getContext("2d");
      if (!brush) throw new Error("synthetic setup");
      brush.fillStyle = "rgba(74,53,40,0.73)";
      brush.fillRect(1, 1, 18, 18);
      const plan: PreviewRenderPlan = {
        kind: "frame",
        logicalCanvas: { width: 100, height: 60 },
        commands: [
          {
            type: "draw-image-cover",
            layerId: "fixture-art",
            imageRef: "fixture-art",
            clipRect: { x: 20, y: 10, width: 40, height: 40 },
            drawRect: { x: 20, y: 10, width: 40, height: 40 },
          },
        ],
      };
      const bindings = new Map([["fixture-art", art]]);
      const width = 100 * scale;
      const height = 60 * scale;
      const reference = make();
      reference.width = width;
      reference.height = height;
      const context = reference.getContext("2d");
      if (!context) throw new Error("synthetic setup");
      context.setTransform(scale, 0, 0, scale, 0, 0);
      if (!executePreviewRenderPlan({ context, plan, imageBindings: bindings }).ok)
        throw new Error("synthetic reference failed");
      const result = renderIsolatedPlanFrame({
        plan,
        imageBindings: bindings,
        width,
        height,
        scale,
        language: "en",
        createCanvas: make,
        // No text/font in this primitive-only probe. Never a substitute for a font owner proof.
        isCurrent: () => true,
        prepare: () => true,
      });
      if (!result.ok) throw new Error("synthetic frame failed");
      frame = result.frame;
      displayOwner = createIsolatedDisplayTarget(make);
      if (!displayOwner) throw new Error("synthetic display owner failed");
      const display = displayOwner.element;
      display.width = width;
      display.height = height;
      document.body.append(display);
      const displayContext = display.getContext("2d");
      if (!displayContext) throw new Error("synthetic display failed");
      displayContext.save();
      displayContext.beginPath();
      displayContext.rect(0, 0, 1, 1);
      displayContext.clip();
      displayContext.globalAlpha = 0.1;
      displayContext.globalCompositeOperation = "destination-out";
      displayContext.shadowBlur = 12;
      displayContext.shadowColor = "red";
      displayContext.setTransform(3, 0, 0, 3, 9, 9);
      // Do not manufacture unsupported native properties in WebKit.
      // Split the property name so Tailwind's fixture scan does not emit an unused CSS utility.
      const effectKey = ["fil", "ter"].join("");
      if (effectKey in displayContext) Reflect.set(displayContext, effectKey, "blur(3px)");
      if (!result.frame.present(displayOwner).ok) throw new Error("synthetic present failed");
      const expected = context.getImageData(0, 0, width, height).data;
      const equal = (other: Uint8ClampedArray) =>
        other.length === expected.length &&
        other.every((value, index) => value === expected[index]);
      const transfer = equal(displayContext.getImageData(0, 0, width, height).data);
      const matrix = displayContext.getTransform();
      // Reset must also discard the old save stack; restore cannot bring the hostile clip back.
      displayContext.restore();
      const afterRestore = displayContext.getTransform();
      const encoded = await result.frame.encode();
      if (!encoded.ok) throw new Error("synthetic encode failed");
      const bitmap = await createImageBitmap(encoded.blob);
      let png: boolean;
      let pngReference = false;
      let changedSamples = 0;
      let maxDelta = 0;
      try {
        const decoded = make();
        decoded.width = width;
        decoded.height = height;
        // Diagnostic buffer is repeatedly read, unlike the product rendering target.
        const decodedContext = decoded.getContext("2d", { willReadFrequently: true });
        if (!decodedContext) throw new Error("synthetic decode failed");
        decodedContext.drawImage(bitmap, 0, 0);
        const actual = decodedContext.getImageData(0, 0, width, height).data;
        png = equal(actual);
        actual.forEach((value, index) => {
          if (value !== expected[index]) changedSamples++;
          maxDelta = Math.max(maxDelta, Math.abs(value - expected[index]));
        });
        const referenceBlob = await new Promise<Blob | null>((resolve) =>
          reference.toBlob(resolve, "image/png"),
        );
        if (!referenceBlob) throw new Error("synthetic reference encode");
        const referenceBitmap = await createImageBitmap(referenceBlob);
        try {
          decoded.width = width;
          decodedContext.drawImage(referenceBitmap, 0, 0);
          const referencePixels = decodedContext.getImageData(0, 0, width, height).data;
          pngReference = actual.every((value, index) => value === referencePixels[index]);
        } finally {
          referenceBitmap.close();
        }
      } finally {
        bitmap.close();
      }
      rows.push({
        scale,
        transfer,
        png,
        pngReference,
        changedSamples,
        maxDelta,
        transform: [matrix, afterRestore].every(
          (m) => m.a === scale && m.d === scale && m.b === 0 && m.c === 0 && m.e === 0 && m.f === 0,
        ),
      });
    } finally {
      frame?.release();
      displayOwner?.release();
      for (const canvas of canvases) {
        canvas.remove();
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  }
  return rows;
}

// Existing, pinned test originals only. No product font registration or generic glyph claim.
async function probeFontOwner() {
  const rows = [];
  for (const id of ["normal", "italic", "korean"] as const) {
    const response = await fetch(`/__spec132-font/${id}`);
    if (!response.ok) throw new Error("test supply unavailable");
    const bytes = await response.arrayBuffer();
    const hash = response.headers.get("x-spec132-sha256") ?? "";
    for (const weight of ["normal", "bold"] as const) {
      const language = id === "korean" ? "ko" : "en";
      const text = id === "korean" ? "한글 가나다" : "AV To ffi";
      const weightNumber = weight === "bold" ? "700" : "400";
      const canvases: HTMLCanvasElement[] = [];
      const faces: FontFace[] = [];
      let deletes = 0;
      const make = () => {
        const value = document.createElement("canvas");
        canvases.push(value);
        return value;
      };
      const owner = createManagedFontOwner(
        {
          bytes,
          sha256: hash,
          byteLength: bytes.byteLength,
          family: `test-${id}`,
          weight,
          italic: id === "italic",
          language,
          verifiedTexts: [text],
          descriptors: {
            style: id === "italic" ? "italic" : "normal",
            weight: weightNumber,
            stretch: "normal",
            unicodeRange: "U+0-10FFFF",
            // Canonical CSS serialization omits the enabled feature's default value 1.
            featureSettings: '"kern"',
            variationSettings:
              id === "korean" ? `"wght" ${weightNumber}` : `"opsz" 9, "wght" ${weightNumber}`,
          },
        },
        {
          randomUUID: () => crypto.randomUUID(),
          digest: async (value) =>
            [...new Uint8Array(await crypto.subtle.digest("SHA-256", value))]
              .map((part) => part.toString(16).padStart(2, "0"))
              .join(""),
          createFace: (alias, value, descriptors) => {
            const face = new FontFace(alias, value, descriptors);
            console.log(
              "spec132-font-descriptor-serialization",
              JSON.stringify(
                Object.entries(descriptors)
                  .filter(([key, expected]) => Reflect.get(face, key) !== expected)
                  .map(([key, expected]) => ({
                    key,
                    expected,
                    actual: Reflect.get(face, key) ?? null,
                  })),
              ),
            );
            faces.push(face);
            return face;
          },
          faces: () => document.fonts,
          add: (face: ManagedFace) => {
            document.fonts.add(face as FontFace);
          },
          delete: (face: ManagedFace) => {
            deletes++;
            document.fonts.delete(face as FontFace);
          },
          createCanvas: make,
        },
      );
      if (!owner) throw new Error("test supply invalid");
      const leases = [];
      try {
        const loaded = await owner.load();
        const lease = owner.acquire({
          family: `test-${id}`,
          weight,
          italic: id === "italic",
          texts: [text],
        });
        if (lease) leases.push(lease);
        const missing =
          owner.acquire({ family: "not-supplied", weight, italic: false, texts: [text] }) === null;
        const unknown =
          owner.acquire({
            family: `test-${id}`,
            weight,
            italic: id === "italic",
            texts: ["x\u200dy"],
          }) === null;
        const reference = make();
        reference.lang = language;
        const context = reference.getContext("2d", { alpha: true, colorSpace: "srgb" });
        const prepared = !!context && !!lease?.prepare(context);
        const widths = [12, 32, 48].map((size) => {
          const actual = lease?.measure(text, size);
          if (!context || !lease || !prepared) return false;
          context.font = `${id === "italic" ? "italic " : ""}${weight === "bold" ? "bold " : ""}${size}px "${lease.alias}", sans-serif`;
          return (
            typeof actual === "number" && actual > 0 && actual === context.measureText(text).width
          );
        });
        // Native descriptor mutation has no required event. Read-time validation must retire it.
        if (faces[0]) faces[0].weight = weightNumber === "400" ? "700" : "400";
        const stale = lease?.isCurrent() === false;
        const held = deletes === 0;
        owner.retire();
        lease?.release();
        lease?.release();
        rows.push({
          id,
          weight,
          loaded,
          prepared,
          widths,
          missing,
          unknown,
          stale,
          held,
          cleaned: deletes === 1 && faces.every((face) => !document.fonts.has(face)),
        });
      } finally {
        owner.retire();
        for (const lease of leases) lease.release();
        for (const face of faces) document.fonts.delete(face);
        for (const canvas of canvases) {
          canvas.width = 0;
          canvas.height = 0;
        }
      }
    }
  }
  return rows;
}

async function probeStaticFontOwner() {
  const rows = [];
  for (const id of [
    "dm-normal-400",
    "dm-normal-700",
    "dm-italic-400",
    "dm-italic-700",
    "noto-400",
    "noto-700",
  ]) {
    const response = await fetch(`/__spec132-static-owner/${id}`);
    if (!response.ok) throw new Error("Static test supply unavailable");
    const bytes = await response.arrayBuffer();
    const revision = `fp5-static-v1/${id}` as ManagedStaticFontRevision;
    const italic = id.startsWith("dm-italic"),
      bold = id.endsWith("700"),
      ko = id.startsWith("noto");
    const text = ko ? "한글 가나다" : "AV To ffi DENN";
    const request = {
      family: `DENN FP5 ${id}`,
      weight: bold ? ("bold" as const) : ("normal" as const),
      italic,
      texts: [text],
    };
    const faces: FontFace[] = [],
      canvases: HTMLCanvasElement[] = [];
    let adds = 0,
      deletes = 0,
      uuids = 0,
      urls = 0;
    const make = () => {
      const value = document.createElement("canvas");
      canvases.push(value);
      return value;
    };
    const environment = {
      randomUUID: () => {
        uuids++;
        return crypto.randomUUID();
      },
      digest: async (value: ArrayBuffer) =>
        [...new Uint8Array(await crypto.subtle.digest("SHA-256", value))]
          .map((part) => part.toString(16).padStart(2, "0"))
          .join(""),
      createFace: (
        alias: string,
        value: ArrayBuffer,
        descriptors: Readonly<Record<string, string>>,
      ) => {
        const face = new FontFace(alias, value, descriptors);
        faces.push(face);
        return face;
      },
      faces: () => document.fonts,
      add: (face: ManagedFace) => {
        adds++;
        document.fonts.add(face as FontFace);
      },
      delete: (face: ManagedFace) => {
        deletes++;
        document.fonts.delete(face as FontFace);
      },
      createCanvas: make,
    };
    const corrupted = bytes.slice(0);
    new Uint8Array(corrupted)[0] ^= 1;
    const invalid = createManagedStaticFontOwner({ revision, bytes: corrupted }, environment);
    const wrongBytes =
      !!invalid &&
      !(await invalid.load()) &&
      uuids === 0 &&
      faces.length === 0 &&
      adds === 0 &&
      canvases.length === 0;
    invalid?.retire();
    const owner = createManagedStaticFontOwner({ revision, bytes }, environment);
    if (!owner) throw new Error("Static test contract rejected");
    const owners: ManagedFontOwner[] = [owner];
    const releaseGates: Array<() => void> = [];
    const leases = [];
    try {
      const loaded = await owner.load();
      const lease = owner.acquire(request);
      if (lease) leases.push(lease);
      const referenceAlias = `denn_${crypto.randomUUID()}`;
      const referenceFace = new FontFace(referenceAlias, bytes.slice(0), {
        style: italic ? "italic" : "normal",
        weight: bold ? "700" : "400",
        stretch: "normal",
        featureSettings: '"kern"',
      });
      faces.push(referenceFace);
      await referenceFace.load();
      document.fonts.add(referenceFace);
      const paint = make(),
        reference = make(),
        decoded = make();
      for (const canvas of [paint, reference, decoded]) {
        canvas.lang = ko ? "ko" : "en";
        canvas.width = 640;
        canvas.height = 100;
      }
      // Both comparison targets use the same explicit, readback-oriented test backing.
      const context = paint.getContext("2d", {
        alpha: true,
        colorSpace: "srgb",
        willReadFrequently: true,
      });
      const referenceContext = reference.getContext("2d", {
        alpha: true,
        colorSpace: "srgb",
        willReadFrequently: true,
      });
      const decoder = decoded.getContext("2d", {
        alpha: true,
        colorSpace: "srgb",
        willReadFrequently: true,
      });
      if (!context || !referenceContext || !decoder)
        throw new Error("Missing static diagnostic context");
      const profile = {
        direction: "ltr",
        fontKerning: "normal",
        fontStretch: "normal",
        fontVariantCaps: "normal",
        textRendering: "auto",
        letterSpacing: "0px",
        wordSpacing: "0px",
      };
      for (const [key, value] of Object.entries(profile))
        if (key in referenceContext)
          (referenceContext as unknown as Record<string, string>)[key] = value;
      const prepared = !!lease?.prepare(context);
      const shorthand = (alias: string, size: number) =>
        `${italic ? "italic " : ""}${bold ? "bold " : ""}${size}px "${alias}", sans-serif`;
      const equal = (a: Uint8ClampedArray, b: Uint8ClampedArray) =>
        a.length === b.length && a.every((v, i) => v === b[i]);
      const sample = async (
        ctx: CanvasRenderingContext2D,
        alias: string,
        size: number,
        content = text,
      ) => {
        ctx.clearRect(0, 0, 640, 100);
        ctx.font = shorthand(alias, size);
        if (!ctx.font.includes(alias)) throw new Error("Rejected diagnostic font");
        const width = ctx.measureText(content).width;
        ctx.fillText(content, 5, 70);
        const pixels = ctx.getImageData(0, 0, 640, 100).data;
        const blob = await new Promise<Blob>((resolve, reject) =>
          ctx.canvas.toBlob(
            (value) => (value ? resolve(value) : reject(new Error("No PNG"))),
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
          decoder.clearRect(0, 0, 640, 100);
          decoder.drawImage(image, 0, 0);
          return { width, pixels, png: decoder.getImageData(0, 0, 640, 100).data };
        } finally {
          image.onload = image.onerror = null;
          image.removeAttribute("src");
          URL.revokeObjectURL(url);
          urls--;
        }
      };
      const comparisons = [];
      if (lease && prepared)
        for (const size of [12, 32, 48]) {
          const own = await sample(context, lease.alias, size),
            other = await sample(referenceContext, referenceAlias, size);
          comparisons.push({
            size,
            width:
              other.width > 0 &&
              lease.measure(text, size) === other.width &&
              own.width === other.width,
            pixels:
              own.pixels.some((value, index) => index % 4 === 3 && value > 0) &&
              equal(own.pixels, other.pixels),
            png: equal(own.png, other.png),
            current: lease.isCurrent(),
          });
        }
      let fragments = !!lease && prepared;
      if (lease && prepared)
        for (const part of ko
          ? ["", " ", "한", "한글", "가나다"]
          : ["", " ", "AV", "To", "ffi", "DENN"]) {
          const own = await sample(context, lease.alias, 32, part),
            other = await sample(referenceContext, referenceAlias, 32, part);
          fragments =
            fragments &&
            lease.measure(part, 32) === other.width &&
            own.width === other.width &&
            equal(own.pixels, other.pixels) &&
            equal(own.png, other.png) &&
            lease.isCurrent();
        }
      // S44: real shared builder/executor coupling; still NOT a Composer/source/print producer.
      const planCases = [];
      if (lease && prepared) {
        const art = make();
        art.width = art.height = 8;
        const brush = art.getContext("2d");
        if (!brush) throw new Error("Missing synthetic art context");
        brush.fillStyle = "#9F887A";
        brush.fillRect(0, 0, 8, 8);
        const bindings = new Map([["fp6-art", art]]);
        const pixelsOf = async (blob: Blob, width: number, height: number) => {
          const bitmap = await createImageBitmap(blob);
          const target = make();
          try {
            target.width = width;
            target.height = height;
            const ctx = target.getContext("2d", { willReadFrequently: true });
            if (!ctx) throw new Error("Missing plan decoder");
            ctx.drawImage(bitmap, 0, 0);
            return ctx.getImageData(0, 0, width, height).data;
          } finally {
            bitmap.close();
            target.width = target.height = 0;
          }
        };
        for (const [align, spacing] of [
          ["left", 0],
          ["center", 1],
          ["right", -1],
        ] as const) {
          let measured = 0;
          const build = (alias: string, managed: boolean) =>
            buildPreviewRenderPlan(
              {
                kind: "frame",
                logicalCanvas: { width: 320, height: 240 },
                frameRect: { x: 0, y: 0, width: 320, height: 240 },
                matRect: { x: 8, y: 8, width: 304, height: 224 },
                imageZone: { x: 16, y: 16, width: 288, height: 208 },
                frameColor: "#9F887A",
                matColor: "#FFFFFF",
                image: { width: 8, height: 8 },
                transform: { scale: 1, x: 0, y: 0 },
                imageRef: "fp6-art",
                textZones: [
                  {
                    value: text,
                    xPercent: 50,
                    yPercent: 20,
                    boxWidthPercent: 20,
                    fontSizePercent: 10,
                    align,
                    fontFamily: alias,
                    bold,
                    italic,
                    color: "#191A1D",
                    lineHeight: 1.2,
                    letterSpacingPercent: (spacing / 320) * 100,
                    rotationDegrees: 0,
                    maxChars: 200,
                    maxLines: 5,
                  },
                ],
              },
              {
                measureText: (value) => {
                  if (
                    value.font.family !== alias ||
                    value.font.weight !== request.weight ||
                    value.font.italic !== italic ||
                    value.font.fallback !== "sans-serif"
                  )
                    return Number.NaN;
                  if (managed) {
                    measured++;
                    return lease.measure(value.text, value.font.sizePx) ?? Number.NaN;
                  }
                  referenceContext.font = shorthand(referenceAlias, value.font.sizePx);
                  return referenceContext.measureText(value.text).width;
                },
              },
            );
          const built = build(lease.alias, true),
            baseline = build(referenceAlias, false);
          if (!built.ok || !baseline.ok) throw new Error("Shared text plan rejected");
          const plan = built.plan;
          const beforePlan = JSON.stringify(plan);
          const command = plan.commands.find((part) => part.type === "draw-text"),
            otherCommand = baseline.plan.commands.find((part) => part.type === "draw-text");
          const lines =
            measured > 0 &&
            !!command &&
            !!otherCommand &&
            command.lines.length > 1 &&
            JSON.stringify(command.lines) === JSON.stringify(otherCommand.lines);
          for (const scale of [1, 1.25, 2]) {
            const width = 320 * scale,
              height = 240 * scale;
            const target = make();
            target.lang = lease.language;
            target.width = width;
            target.height = height;
            const ctx = target.getContext("2d", { alpha: true, colorSpace: "srgb" });
            if (!ctx) throw new Error("Missing plan reference");
            for (const [key, value] of Object.entries(profile))
              if (key in ctx) (ctx as unknown as Record<string, string>)[key] = value;
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            if (
              !executePreviewRenderPlan({
                context: ctx,
                plan: baseline.plan,
                imageBindings: bindings,
              }).ok
            )
              throw new Error("Reference plan failed");
            let exactPlan = false;
            const result = renderIsolatedPlanFrame({
              plan,
              imageBindings: bindings,
              width,
              height,
              scale,
              language: lease.language,
              createCanvas: make,
              isCurrent: lease.isCurrent,
              prepare: lease.prepare,
              execute: (args) => {
                exactPlan = args.plan === plan && args.imageBindings === bindings;
                return executePreviewRenderPlan(args);
              },
            });
            if (!result.ok) throw new Error("Isolated text plan failed");
            let display: IsolatedDisplayTarget | null = null;
            try {
              display = createIsolatedDisplayTarget(make);
              if (!display) throw new Error("Missing plan display");
              const shown = result.frame.present(display).ok;
              const shownContext = display.element.getContext("2d");
              if (!shownContext) throw new Error("Missing plan display context");
              const pixels = equal(
                shownContext.getImageData(0, 0, width, height).data,
                ctx.getImageData(0, 0, width, height).data,
              );
              const encoded = await result.frame.encode();
              const referenceBlob = await new Promise<Blob | null>((resolve) =>
                target.toBlob(resolve, "image/png"),
              );
              const png =
                encoded.ok &&
                !!referenceBlob &&
                equal(
                  await pixelsOf(encoded.blob, width, height),
                  await pixelsOf(referenceBlob, width, height),
                );
              planCases.push({
                align,
                spacing,
                scale,
                lines,
                pixels,
                png,
                shown,
                exactPlan: exactPlan && beforePlan === JSON.stringify(plan),
                current: lease.isCurrent(),
              });
            } finally {
              result.frame.release();
              display?.release();
              target.width = target.height = 0;
            }
          }
        }
      }
      const denied =
        ["😀", "e\u0301", "\u1100\u1161", "A\u200dV"].every(
          (part) => owner.acquire({ ...request, texts: [part] }) === null,
        ) &&
        owner.acquire({ ...request, family: "DM Sans" }) === null &&
        // Avoid a Tailwind class candidate in this test-only boolean inversion.
        owner.acquire({ ...request, italic: italic === false }) === null;
      const foreign = make();
      foreign.lang = ko ? "en" : "ko";
      const foreignContext = foreign.getContext("2d");
      const contextDenied = !!foreignContext && lease?.prepare(foreignContext) === false;
      const primary = faces[0];
      if (primary) primary.weight = bold ? "400" : "700";
      const stale = lease?.isCurrent() === false,
        held = deletes === 0;
      owner.retire();
      lease?.release();
      lease?.release();
      // A second registration with the SAME revision must get a new native/lease identity.
      const successor = createManagedStaticFontOwner({ revision, bytes }, environment);
      if (successor) owners.push(successor);
      const successorLoaded = !!successor && (await successor.load());
      const next = successor?.acquire(request);
      if (next) leases.push(next);
      const separate = !!next && next.identity !== lease?.identity && next.alias !== lease?.alias;
      lease?.release();
      owner.retire();
      const oldCleanupSafe = next?.isCurrent() === true;
      if (next) {
        const duplicate = new FontFace(next.alias, bytes.slice(0));
        faces.push(duplicate);
        await duplicate.load();
        document.fonts.add(duplicate);
      }
      const duplicateDenied = next?.isCurrent() === false;
      successor?.retire();
      next?.release();
      // Real native load, with only completion delivery deliberately delayed by this fixture.
      let signalLoaded: () => void = () => {},
        releaseLoad: () => void = () => {};
      const started = new Promise<void>((resolve) => {
        signalLoaded = resolve;
      });
      const barrier = new Promise<void>((resolve) => {
        releaseLoad = resolve;
      });
      releaseGates.push(releaseLoad);
      const late = createManagedStaticFontOwner(
        { revision, bytes },
        {
          ...environment,
          createFace: (alias, value, descriptors) => {
            const face = environment.createFace(alias, value, descriptors);
            const nativeLoad = face.load.bind(face);
            face.load = async () => {
              await nativeLoad();
              signalLoaded();
              await barrier;
              return face;
            };
            return face;
          },
        },
      );
      if (late) owners.push(late);
      const beforeLateAdds = adds;
      const pending = late?.load();
      // On a failed initial load no delayed native load can be reached; report failure instead of hanging.
      let lateStopped = false;
      if (late && pending && loaded) {
        await Promise.race([started, pending]);
        late.retire();
        releaseLoad();
        lateStopped = !(await pending) && adds === beforeLateAdds;
      } else {
        late?.retire();
        releaseLoad();
        if (pending) await pending;
      }
      rows.push({
        id,
        loaded,
        wrongBytes,
        prepared,
        comparisons,
        fragments,
        planCases,
        denied,
        contextDenied,
        stale,
        held,
        cleaned: !!primary && !document.fonts.has(primary),
        successorLoaded,
        separate,
        oldCleanupSafe,
        duplicateDenied,
        lateStopped,
        urls,
      });
    } finally {
      for (const value of owners) value.retire();
      for (const release of releaseGates) release();
      for (const lease of leases) lease.release();
      for (const face of faces) document.fonts.delete(face);
      for (const canvas of canvases) canvas.width = canvas.height = 0;
    }
  }
  return rows;
}

export function ComposerRoomSourceFixture(): React.JSX.Element {
  const [report, setReport] = useState("idle");
  const [fontReport, setFontReport] = useState("idle");
  const [staticFontReport, setStaticFontReport] = useState("idle");
  return (
    <main>
      <button
        type="button"
        data-testid="isolated-probe"
        onClick={() => {
          setReport("running");
          void probe().then(
            (rows) => setReport(JSON.stringify(rows)),
            () => setReport("failed"),
          );
        }}
      >
        Run isolated primitive probe
      </button>
      <output data-testid="isolated-report">{report}</output>
      <button
        type="button"
        data-testid="font-owner-probe"
        onClick={() => {
          setFontReport("running");
          void probeFontOwner().then(
            (rows) => setFontReport(JSON.stringify(rows)),
            () => setFontReport("failed"),
          );
        }}
      >
        Run font owner probe
      </button>
      <output data-testid="font-owner-report">{fontReport}</output>
      <button
        type="button"
        data-testid="static-font-owner-probe"
        disabled={staticFontReport === "running"}
        onClick={() => {
          setStaticFontReport("running");
          void probeStaticFontOwner().then(
            (rows) => setStaticFontReport(JSON.stringify(rows)),
            () => setStaticFontReport("failed"),
          );
        }}
      >
        Run static owner probe
      </button>
      <output data-testid="static-font-owner-report">{staticFontReport}</output>
    </main>
  );
}
