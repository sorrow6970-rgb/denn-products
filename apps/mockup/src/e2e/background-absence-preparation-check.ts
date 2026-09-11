import { createRoomBackgroundAbsencePreparationPort } from "../room-placement/background-absence-preparation-port";
import { createRoomPreparationController } from "../room-placement/preparation";

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
  const row = [0, 200, 80, 40, 200, 80, 40, 200, 80, 40],
    raw = [...row, ...row];
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

export async function checkAbsencePreparation(mode: string): Promise<Record<string, unknown>> {
  const [format, action] = mode.split(":");
  const bytes = format === "png" ? png(action === "metadata") : jpeg(action === "metadata");
  const file = new Blob([bytes], { type: `image/${format}` });
  const sourceIdentity = {},
    backgroundIdentity = {};
  const source = {
    identity: sourceIdentity,
    kind: "frame",
    projectionOk: action !== "source-fail",
    planReady: true,
    clockPreview: null,
  };
  let releaseGate!: () => void, observed!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  const nativeObserved = new Promise<void>((resolve) => {
    observed = resolve;
  });
  let native: ImageBitmap | null = null;
  let lookups = 0,
    starts = 0,
    closes = 0,
    captures = 0,
    frameReleases = 0;
  const order: string[] = [];
  const bitmapSize = () => (native ? { width: native.width, height: native.height } : null);
  const madePort = createRoomBackgroundAbsencePreparationPort({
    readRequest(identity: object) {
      lookups++;
      order.push("lookup");
      if (identity !== backgroundIdentity) throw new Error("fixture-identity");
      return { identity, file, budget: { maxEdge: 64 } };
    },
    async decode(blob: Blob, options: ImageBitmapOptions) {
      starts++;
      order.push("decode");
      try {
        const bitmap = await createImageBitmap(
          blob,
          action === "reject" ? { ...options, resizeWidth: 0 } : options,
        );
        native = bitmap;
        observed();
        await gate;
        return Object.freeze({
          get width() {
            return bitmap.width;
          },
          get height() {
            return bitmap.height;
          },
          close() {
            closes++;
            bitmap.close();
          },
        });
      } catch {
        observed();
        await gate;
        throw new Error("fixture-decode-rejected");
      }
    },
  });
  if (!madePort.ok) throw new Error("fixture-port");
  const port = madePort.port;
  const madeController = createRoomPreparationController({
    readSource: () => source,
    captureFrame() {
      captures++;
      order.push("capture");
      if (action === "capture-fail") throw new Error("fixture-capture");
      return {
        width: 48,
        height: 32,
        release() {
          frameReleases++;
        },
      };
    },
    startBackground: port.startBackground,
  });
  if (!madeController.ok) {
    port.dispose();
    throw new Error("fixture-controller");
  }
  const controller = madeController.controller;
  try {
    const request = { sourceIdentity, backgroundIdentity },
      first = controller.prepare(request);
    let before: ReturnType<typeof bitmapSize> = null,
      second: unknown = null;
    if (!["metadata", "capture-fail", "source-fail"].includes(action)) {
      await nativeObserved;
      before = bitmapSize();
      if (action === "clear") controller.clear();
      if (action === "dispose") {
        controller.dispose();
        port.dispose();
      }
      if (action === "source-change") source.identity = {};
      if (action === "pending-replace") second = await controller.prepare(request);
    }
    releaseGate();
    const result = await first;
    // Deliberate delivery gate only, not physical engine cancellation or GC evidence.
    for (let i = 0; i < 8; i++) await Promise.resolve();
    const ready = controller.readPrepared(request);
    const beforeCleanup = { closes, frameReleases };
    controller.clear();
    controller.dispose();
    port.dispose();
    return {
      result,
      second,
      ready,
      lookups,
      starts,
      closes,
      captures,
      frameReleases,
      order,
      before,
      beforeCleanup,
      after: bitmapSize(),
      finalState: port.getState(),
      controllerState: controller.getState(),
      needsSafetyClose: native !== null && bitmapSize()?.width !== 0,
    };
  } finally {
    releaseGate();
    controller.dispose();
    port.dispose();
    const bitmap = native as ImageBitmap | null;
    // Failure-only backstop, never evidence of successful lease cleanup.
    if (bitmap && bitmap.width !== 0) bitmap.close();
  }
}
