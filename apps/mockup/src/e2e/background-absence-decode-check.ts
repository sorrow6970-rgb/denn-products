import { createRoomBackgroundAbsenceDecodeWork } from "../room-placement/background-absence-decode";

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

export async function checkAbsenceDecode(mode: string): Promise<Record<string, unknown>> {
  const [format, action] = mode.split(":");
  const bytes = format === "png" ? png(action === "metadata") : jpeg(action === "metadata");
  const file = new Blob([bytes], { type: `image/${format}` });
  let releaseGate!: () => void, observed!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  const nativeObserved = new Promise<void>((resolve) => {
    observed = resolve;
  });
  let native: ImageBitmap | null = null,
    closes = 0,
    starts = 0;
  const made = createRoomBackgroundAbsenceDecodeWork({
    async decode(blob: Blob, options: ImageBitmapOptions) {
      starts++;
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
            return action === "mismatch" ? bitmap.width + 1 : bitmap.width;
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
  if (!made.ok) throw new Error("fixture-work");
  const work = made.work;
  const nativeSize = () => (native ? { width: native.width, height: native.height } : null);
  try {
    const begun = work.start({ file, budget: { maxEdge: 64 } });
    if (!begun.ok) throw new Error("fixture-start");
    const task = begun.task;
    let before: ReturnType<typeof nativeSize> = null,
      second: unknown = null,
      pendingState: string = work.getState();
    if (action !== "metadata") {
      await nativeObserved;
      before = nativeSize();
      second = work.start({ file, budget: { maxEdge: 64 } });
      if (action === "cancel") task.cancel();
      if (action === "dispose") work.dispose();
      pendingState = work.getState();
    }
    releaseGate();
    const result = await task.result;
    // Known promise chain only: this does not prove GC or engine memory reclamation.
    for (let i = 0; i < 8; i++) await Promise.resolve();
    const lease = task.takeLease(),
      size = lease ? { width: lease.width, height: lease.height } : null;
    const secondNull = task.takeLease() === null;
    lease?.release();
    task.release();
    work.dispose();
    return {
      result,
      size,
      second,
      secondNull,
      pendingState,
      before,
      after: nativeSize(),
      starts,
      closes,
      finalState: work.getState(),
      needsSafetyClose: native !== null && nativeSize()?.width !== 0,
    };
  } finally {
    releaseGate();
    work.dispose();
    const bitmap = native as ImageBitmap | null;
    // Failure-only safety net; successful reports require needsSafetyClose:false.
    if (bitmap && bitmap.width !== 0) bitmap.close();
  }
}
