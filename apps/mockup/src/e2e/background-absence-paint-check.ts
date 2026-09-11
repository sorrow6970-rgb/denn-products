import { createRoomBackgroundAbsencePaintWork } from "../room-placement/background-absence-decode";
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

export async function checkAbsencePaint(mode: string): Promise<Record<string, unknown>> {
  const [format, action] = mode.split(":");
  const file = new Blob(
    [format === "png" ? png(action === "metadata") : jpeg(action === "metadata")],
    { type: `image/${format}` },
  );
  let releaseGate!: () => void, observed!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  const nativeObserved = new Promise<void>((resolve) => {
    observed = resolve;
  });
  let native: ImageBitmap | null = null,
    closes = 0,
    starts = 0,
    copies = 0;
  let copied: unknown = null;
  const made = createRoomBackgroundAbsencePaintWork({
    async decode(blob: Blob, options: ImageBitmapOptions) {
      starts++;
      try {
        const bitmap = await createImageBitmap(blob, options);
        native = bitmap;
        observed();
        await gate;
        return {
          width: bitmap.width,
          height: bitmap.height,
          close() {
            closes++;
            bitmap.close();
          },
          copyTo(target: object, crop: BackgroundPaintRect, destination: BackgroundPaintRect) {
            copies++;
            copied = { crop: { ...crop }, destination: { ...destination } };
            (target as CanvasRenderingContext2D).drawImage(
              bitmap,
              crop.x,
              crop.y,
              crop.width,
              crop.height,
              destination.x,
              destination.y,
              destination.width,
              destination.height,
            );
            if (action === "copy-throw") throw new Error("synthetic-copy-failure");
          },
        };
      } catch {
        observed();
        await gate;
        throw new Error("synthetic-decode-failure");
      }
    },
  });
  if (!made.ok) throw new Error("fixture-work");
  const work = made.work;
  const nativeSize = () => (native ? { width: native.width, height: native.height } : null);
  try {
    const begun = work.start({ file, budget: { maxEdge: 64 } });
    if (!begun.ok) throw new Error("fixture-start");
    const task = begun.task;
    let before: ReturnType<typeof nativeSize> = null;
    if (action !== "metadata") {
      await nativeObserved;
      before = nativeSize();
      if (action === "cancel") task.cancel();
    }
    releaseGate();
    const result = await task.result;
    for (let i = 0; i < 8; i++) await Promise.resolve();
    const lease = task.takeLease(),
      secondNull = task.takeLease() === null;
    let paint: unknown = null,
      afterPaint: unknown = null,
      pixels: unknown = null;
    if (lease) {
      const makeContext = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 12;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("fixture-context");
        return context;
      };
      const target = makeContext(),
        reference = makeContext();
      const rect =
        action === "fractional"
          ? { x: 2.25, y: 1.5, width: 7.5, height: 5 }
          : { x: 2, y: 2, width: 6, height: action === "invalid-aspect" ? 5 : 4 };
      const draws = ["normal", "fractional", "copy-throw"].includes(action);
      // Direct native reference, not the paint adapter; same bitmap/environment, not an independent decode oracle.
      if (draws)
        reference.drawImage(
          native as unknown as ImageBitmap,
          0,
          0,
          3,
          2,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
        );
      if (action === "release") lease.release();
      if (action === "dispose") work.dispose();
      paint = lease.paint({ target, rect });
      if (action === "copy-throw") afterPaint = lease.paint({ target, rect });
      const actual = target.getImageData(0, 0, 16, 12).data,
        expected = reference.getImageData(0, 0, 16, 12).data;
      let colored = 0,
        borderClear = true;
      for (let y = 0; y < 12; y++)
        for (let x = 0; x < 16; x++) {
          const alpha = actual[(y * 16 + x) * 4 + 3];
          if (alpha > 0) colored++;
          if ((x === 0 || y === 0 || x === 15 || y === 11) && alpha !== 0) borderClear = false;
        }
      pixels = {
        equal: actual.every((v, i) => v === expected[i]),
        nonempty: colored > 0,
        borderClear,
      };
    }
    const beforeCleanup = { closes, state: work.getState() };
    lease?.release();
    task.release();
    work.dispose();
    return {
      result,
      leaseSize: lease ? { width: lease.width, height: lease.height } : null,
      secondNull,
      paint,
      afterPaint,
      copied,
      pixels,
      before,
      after: nativeSize(),
      starts,
      copies,
      closes,
      beforeCleanup,
      finalState: work.getState(),
      needsSafetyClose: native !== null && nativeSize()?.width !== 0,
    };
  } finally {
    releaseGate();
    work.dispose();
    const bitmap = native as ImageBitmap | null;
    if (bitmap && bitmap.width !== 0) bitmap.close();
  }
}
