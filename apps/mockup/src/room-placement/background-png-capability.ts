const BASES = [
  "iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAQElEQVR4nO3OQQ0AIAwEMKScBCTg/4WESUACJpa9mlRA10tapHaLJSQkJCQkJCQ0HbppkVMthISEhISEhISGQx8hbkB5plH2hAAAAABJRU5ErkJggg==",
  "iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAIAAAADnC86AAAAPUlEQVR4nO3NMREAIAwEMKS8BCTgf0JCJSABD12bu+xZL2lL7bYlFovFYrFYPCm+acupNrFYLBaLxeJB8Qf9Y5h5Sv6ArAAAAABJRU5ErkJggg==",
];
const COLORS = [
  [240, 32, 32],
  [32, 224, 48],
  [32, 64, 224],
  [240, 208, 32],
];
const MAPS = [
  [0, 1, 2, 3],
  [1, 0, 3, 2],
  [2, 3, 0, 1],
  [3, 2, 1, 0],
  [0, 3, 2, 1],
  [3, 0, 1, 2],
  [2, 1, 0, 3],
  [1, 2, 3, 0],
];

type Reason = "complete" | "mismatch" | "unavailable" | "disposed" | "failed";
export type BackgroundPngCapabilityResult = Readonly<{
  status: "synthetic-match" | "not-proven";
  reason: Reason;
  checked: number;
  matched: number;
  decodeAllowed: false;
}>;

// Fixed synthetic bytes only. Never accepts a caller's photo or metadata proof.
function sampleBytes(shape: number, orientation: number): Uint8Array<ArrayBuffer> {
  const base = Uint8Array.from(atob(BASES[shape]), (c) => c.charCodeAt(0));
  if (orientation === 0) return base;
  const profile = new Uint8Array(26);
  const view = new DataView(profile.buffer);
  profile.set([73, 73, 42, 0, 8, 0, 0, 0]);
  view.setUint16(8, 1, true);
  view.setUint16(10, 274, true);
  view.setUint16(12, 3, true);
  view.setUint32(14, 1, true);
  view.setUint16(18, orientation, true);
  const body = new Uint8Array([101, 88, 73, 102, ...profile]);
  let crc = 0xffffffff;
  for (const b of body) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  return new Uint8Array([
    ...base.subarray(0, 33),
    0,
    0,
    0,
    26,
    ...body,
    crc >>> 24,
    (crc >>> 16) & 255,
    (crc >>> 8) & 255,
    crc & 255,
    ...base.subarray(33),
  ]);
}

/** Spec117: a one-shot, owner-local observation; never authorizes photo decoding. */
export function createRoomBackgroundPngCapabilityProbe() {
  let disposed = false;
  let cached: Promise<BackgroundPngCapabilityResult> | undefined;
  const result = (
    reason: Reason,
    checked: number,
    matched: number,
  ): BackgroundPngCapabilityResult =>
    Object.freeze({
      status: reason === "complete" ? "synthetic-match" : "not-proven",
      reason,
      checked,
      matched,
      decodeAllowed: false,
    });
  async function observe(): Promise<BackgroundPngCapabilityResult> {
    let checked = 0,
      matched = 0;
    if (disposed) return result("disposed", checked, matched);
    try {
      if (
        typeof createImageBitmap !== "function" ||
        typeof document === "undefined" ||
        typeof document.createElement !== "function" ||
        typeof atob !== "function" ||
        typeof Blob !== "function"
      )
        return result("unavailable", checked, matched);
      const decode = createImageBitmap;
      for (let shape = 0; shape < 2; shape++) {
        const w = shape === 0 ? 48 : 40,
          h = shape === 0 ? 32 : 40;
        for (let orientation = 0; orientation <= 8; orientation++) {
          if (disposed) return result("disposed", checked, matched);
          let bitmap: ImageBitmap | undefined;
          let canvas: HTMLCanvasElement | undefined;
          let match = false;
          try {
            bitmap = await decode(
              new Blob([sampleBytes(shape, orientation)], { type: "image/png" }),
              { imageOrientation: "from-image" },
            );
            if (disposed) return result("disposed", checked, matched);
            const width = bitmap.width,
              height = bitmap.height;
            if (
              !Number.isSafeInteger(width) ||
              !Number.isSafeInteger(height) ||
              width < 1 ||
              height < 1 ||
              width > 48 ||
              height > 48
            )
              throw new Error();
            canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (!context) throw new Error();
            context.drawImage(bitmap, 0, 0);
            match = width === (orientation >= 5 ? h : w) && height === (orientation >= 5 ? w : h);
            const map = MAPS[Math.max(1, orientation) - 1];
            const points = [
              [0.25, 0.25],
              [0.75, 0.25],
              [0.75, 0.75],
              [0.25, 0.75],
            ];
            for (let i = 0; i < 4; i++) {
              const pixel = context.getImageData(
                Math.floor(width * points[i][0]),
                Math.floor(height * points[i][1]),
                1,
                1,
              ).data;
              if (pixel[3] !== 255 || COLORS[map[i]].some((v, c) => pixel[c] !== v)) match = false;
            }
          } finally {
            try {
              bitmap?.close();
            } finally {
              if (canvas) {
                try {
                  canvas.width = 0;
                } finally {
                  canvas.height = 0;
                }
              }
            }
          }
          if (disposed) return result("disposed", checked, matched);
          checked++;
          if (match) matched++;
        }
      }
      return result(matched === 18 ? "complete" : "mismatch", checked, matched);
    } catch {
      return result(disposed ? "disposed" : "failed", checked, matched);
    }
  }
  return Object.freeze({
    run() {
      cached ??= Promise.resolve().then(observe);
      return cached;
    },
    dispose() {
      disposed = true;
    },
  });
}
