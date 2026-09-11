import type { PreviewRenderPlan } from "@denn/render";
import { executePreviewRenderPlan } from "../canvas/executePreviewPlan";
import { createFrameSnapshotCapturer } from "../room-placement/frame-snapshot";
import { createRoomBackgroundAbsencePaintPreparationPort } from "../room-placement/background-absence-preparation-port";
import { createRoomPaintPreparationController } from "../room-placement/preparation";
import type { BackgroundPaintRect } from "../room-placement/background-paint-lease";

// Hand-authored tiny codec specimens, not transformed photographs or exported app content.
function jpeg(metadata: boolean) {
  const huffmanDefinition = [1, ...Array<number>(15).fill(0), 0];
  return new Uint8Array([
    255,
    216,
    ...(metadata ? [255, 224, 0, 2] : []),
    255,
    219,
    0,
    67,
    0,
    ...Array<number>(64).fill(1),
    255,
    192,
    0,
    11,
    8,
    0,
    2,
    0,
    3,
    1,
    1,
    17,
    0,
    255,
    196,
    0,
    38,
    0,
    ...huffmanDefinition,
    16,
    ...huffmanDefinition,
    255,
    218,
    0,
    8,
    1,
    1,
    0,
    0,
    63,
    0,
    63,
    255,
    217,
  ]);
}
function png(metadata: boolean) {
  const chunk = (name: string, data: number[]) => {
    const body = [...Array.from(name, (c) => c.charCodeAt(0)), ...data];
    let crc = 0xffffffff;
    for (const b of body) {
      crc ^= b;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    return [
      0,
      0,
      0,
      data.length,
      ...body,
      crc >>> 24,
      (crc >>> 16) & 255,
      (crc >>> 8) & 255,
      crc & 255,
    ];
  };
  const raw = [0, 230, 20, 40, 20, 200, 50, 40, 60, 220, 0, 170, 90, 30, 80, 30, 190, 30, 180, 170];
  let a = 1,
    b = 0;
  for (const v of raw) {
    a = (a + v) % 65521;
    b = (b + a) % 65521;
  }
  const n = raw.length,
    zlib = [120, 1, 1, n, 0, 255 - n, 255, ...raw, b >>> 8, b & 255, a >>> 8, a & 255];
  return new Uint8Array([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...chunk("IHDR", [0, 0, 0, 3, 0, 0, 0, 2, 8, 2, 0, 0, 0]),
    ...(metadata ? chunk("tEXt", [107, 0, 118]) : []),
    ...chunk("IDAT", zlib),
    ...chunk("IEND", []),
  ]);
}

export async function checkPairPaint(mode: string): Promise<Record<string, unknown>> {
  const [format, action] = mode.split(":");
  const file = new Blob(
    [format === "png" ? png(action === "metadata") : jpeg(action === "metadata")],
    { type: `image/${format}` },
  );
  const sourceIdentity = {},
    backgroundIdentity = {},
    scale = action === "fractional" ? 1.25 : 1;
  const plan: PreviewRenderPlan = {
    kind: "frame",
    logicalCanvas: { width: 4, height: 2 },
    commands: [
      {
        type: "fill-rect",
        layerId: "pair-body",
        rect: { x: 0, y: 0, width: 4, height: 2 },
        color: "#DDBB88",
      },
      {
        type: "fill-rect",
        layerId: "pair-edge",
        rect: { x: 0, y: 0, width: 1, height: 2 },
        color: "#2277CC",
      },
    ],
  };
  const imageBindings = { get: () => undefined };
  const source = {
    identity: sourceIdentity,
    kind: "frame",
    projectionOk: true,
    planReady: true,
    clockPreview: null,
    plan,
    imageBindings,
  };
  const makeContext = (width: number, height: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("fixture-context");
    return context;
  };
  const native: ImageBitmap[] = [],
    privateFrames: HTMLCanvasElement[] = [],
    order: string[] = [];
  let lookups = 0,
    starts = 0,
    closes = 0,
    captures = 0,
    frameReleases = 0,
    backgroundCopies = 0,
    frameCopies = 0;
  let releaseGate!: () => void, observed!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  const nativeObserved = new Promise<void>((resolve) => {
    observed = resolve;
  });
  const frameMade = createFrameSnapshotCapturer({
    readSource: () => source,
    createSurface: ({ width, height }: { width: number; height: number }) => {
      captures++;
      const context = makeContext(width, height);
      let canvas: HTMLCanvasElement | null = context.canvas;
      privateFrames.push(canvas);
      return {
        context,
        release() {
          frameReleases++;
          if (canvas) {
            canvas.width = 1;
            canvas.height = 1;
            canvas = null;
          }
        },
        copyTo(
          target: CanvasRenderingContext2D,
          crop: BackgroundPaintRect,
          rect: BackgroundPaintRect,
        ) {
          if (!canvas) throw new Error("fixture-closed");
          frameCopies++;
          order.push("frame");
          target.drawImage(
            canvas,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            rect.x,
            rect.y,
            rect.width,
            rect.height,
          );
          if (action === "frame-fail") throw new Error("fixture-copy");
        },
      };
    },
  });
  if (!frameMade.ok) throw new Error("fixture-frame");
  const portMade = createRoomBackgroundAbsencePaintPreparationPort({
    readRequest(identity: object) {
      lookups++;
      if (identity !== backgroundIdentity) throw new Error("fixture-identity");
      return { identity, file, budget: { maxEdge: 64 } };
    },
    async decode(blob: Blob, options: ImageBitmapOptions) {
      starts++;
      try {
        const bitmap = await createImageBitmap(blob, options);
        native.push(bitmap);
        observed();
        await gate;
        return {
          width: bitmap.width,
          height: bitmap.height,
          close() {
            closes++;
            bitmap.close();
          },
          copyTo(
            target: CanvasRenderingContext2D,
            crop: BackgroundPaintRect,
            rect: BackgroundPaintRect,
          ) {
            backgroundCopies++;
            order.push("background");
            target.drawImage(
              bitmap,
              crop.x,
              crop.y,
              crop.width,
              crop.height,
              rect.x,
              rect.y,
              rect.width,
              rect.height,
            );
            if (action === "background-fail") throw new Error("fixture-copy");
          },
        };
      } catch {
        observed();
        await gate;
        throw new Error("fixture-decode");
      }
    },
  });
  if (!portMade.ok) {
    frameMade.capturer.dispose();
    throw new Error("fixture-port");
  }
  const made = createRoomPaintPreparationController({
    readSource: () => source,
    captureFrame(identity: object) {
      const result = frameMade.capturer.capture({
        sourceIdentity: identity,
        scale,
        budget: { maxEdge: 64, maxPixels: 4096 },
      });
      if (!result.ok) throw new Error("fixture-capture");
      return result.lease;
    },
    startBackground: portMade.port.startBackground,
  });
  if (!made.ok) {
    frameMade.capturer.dispose();
    portMade.port.dispose();
    throw new Error("fixture-controller");
  }
  const controller = made.controller,
    request = { sourceIdentity, backgroundIdentity };
  const dispose = () => {
    controller.dispose();
    portMade.port.dispose();
    frameMade.capturer.dispose();
  };
  try {
    const pending = controller.prepare(request);
    if (action !== "metadata") await nativeObserved;
    if (action === "pending-clear") controller.clear();
    releaseGate();
    const result = await pending;
    for (let i = 0; i < 12; i++) await Promise.resolve();
    let view = controller.readPaintPrepared(request);
    const firstView = view;
    let second: unknown = null,
      oldPaint: unknown = null,
      paint: unknown = null,
      pixels: unknown = null;
    if (action === "replace") {
      second = await controller.prepare(request);
      view = controller.readPaintPrepared(request);
    }
    if (action === "clear") controller.clear();
    if (action === "dispose") dispose();
    if (action === "source-change") source.identity = {};
    if (view) {
      const target = makeContext(16, 12),
        reference = makeContext(16, 12);
      const frameReference = makeContext(Math.ceil(4 * scale), Math.ceil(2 * scale));
      const frameRect =
        action === "fractional"
          ? { x: 4.25, y: 3.5, width: 7, height: 3.5 }
          : { x: 4, y: 3, width: 6, height: 3 };
      const backgroundRect =
        action === "fractional"
          ? { x: 1.25, y: 1.75, width: 12, height: 8 }
          : { x: 1, y: 1, width: 12, height: 8 };
      const draws = ["normal", "fractional", "replace", "background-fail", "frame-fail"].includes(
        action,
      );
      if (draws) {
        const bitmap = native.at(-1);
        if (!bitmap) throw new Error("fixture-bitmap");
        reference.drawImage(
          bitmap,
          0,
          0,
          3,
          2,
          backgroundRect.x,
          backgroundRect.y,
          backgroundRect.width,
          backgroundRect.height,
        );
        if (action !== "background-fail") {
          frameReference.setTransform(scale, 0, 0, scale, 0, 0);
          const referenceResult = executePreviewRenderPlan({
            context: frameReference,
            plan,
            imageBindings,
          });
          if (!referenceResult.ok) throw new Error("fixture-reference");
          reference.drawImage(
            frameReference.canvas,
            0,
            0,
            4 * scale,
            2 * scale,
            frameRect.x,
            frameRect.y,
            frameRect.width,
            frameRect.height,
          );
        }
      }
      if (action === "replace") {
        oldPaint = firstView?.paint({ target, frameRect, backgroundRect });
        if (backgroundCopies !== 0 || frameCopies !== 0) throw new Error("fixture-old-copy");
      }
      paint = view.paint({ target, frameRect, backgroundRect });
      const actual = target.getImageData(0, 0, 16, 12).data,
        expected = reference.getImageData(0, 0, 16, 12).data;
      let nonempty = false,
        borderClear = true;
      for (let y = 0; y < 12; y++)
        for (let x = 0; x < 16; x++) {
          const alpha = actual[(y * 16 + x) * 4 + 3];
          if (alpha > 0) nonempty = true;
          if ((x === 0 || y === 0 || x === 15 || y === 11) && alpha !== 0) borderClear = false;
        }
      pixels = { equal: actual.every((v, i) => v === expected[i]), nonempty, borderClear };
    }
    const beforeCleanup = { closes, frameReleases, state: controller.getState() };
    dispose();
    return {
      result,
      second,
      oldPaint,
      paint,
      pixels,
      beforeCleanup,
      order,
      lookups,
      starts,
      captures,
      closes,
      frameReleases,
      backgroundCopies,
      frameCopies,
      nativeSizes: native.map((b) => [b.width, b.height]),
      frameSizes: privateFrames.map((c) => [c.width, c.height]),
      finalState: controller.getState(),
      portState: portMade.port.getState(),
      needsSafetyClose: native.some((b) => b.width !== 0),
      needsSafetyFrame: privateFrames.some((c) => c.width !== 1 || c.height !== 1),
    };
  } finally {
    releaseGate();
    dispose();
    for (const b of native) if (b.width !== 0) b.close();
    for (const c of privateFrames)
      if (c.width !== 1 || c.height !== 1) {
        c.width = 1;
        c.height = 1;
      }
  }
}
