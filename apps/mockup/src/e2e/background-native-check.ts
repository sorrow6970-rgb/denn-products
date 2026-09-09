import { createRoomBackgroundEvidenceJob } from "../room-placement/background-file";
import { createRoomBackgroundPreparationPort } from "../room-placement/background-preparation-port";
import { createRoomPreparationController } from "../room-placement/preparation";

/** Known synthetic pixels only. This fixture is not an untrusted-photo decoder. */
export async function checkBackgroundNative(mode: string): Promise<Record<string, unknown>> {
  const [format, action] = mode.split(":");
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = 48;
  sourceCanvas.height = 32;
  const context = sourceCanvas.getContext("2d");
  if (!context) throw new Error("fixture-context");
  context.fillStyle = "#f04020";
  context.fillRect(0, 0, 24, 32);
  context.fillStyle = "#2060e0";
  context.fillRect(24, 0, 24, 32);
  let native: ImageBitmap | null = null;
  let closes = 0,
    starts = 0,
    frameReleases = 0;
  const bitmapSize = () => (native ? { width: native.width, height: native.height } : null);
  let releaseGate!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  let observed!: () => void;
  const nativeObserved = new Promise<void>((resolve) => {
    observed = resolve;
  });
  try {
    const mime = `image/${format}`;
    const encoded = await new Promise<Blob>((resolve, reject) => {
      sourceCanvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("fixture-encode"))),
        mime,
        1,
      );
    });
    if (encoded.type !== mime) throw new Error("fixture-format");
    const created = createRoomBackgroundEvidenceJob({ file: encoded, budget: { maxEdge: 64 } });
    if (!created.ok) throw new Error("fixture-preflight");
    const evidenceResult = await created.job.run();
    if (!evidenceResult.ok) throw new Error("fixture-evidence");
    const pair = evidenceResult.lease.take();
    if (!pair) throw new Error("fixture-pair");
    created.job.dispose();
    evidenceResult.lease.release();
    const snapshot = pair.blob;
    const sourceIdentity = {},
      backgroundIdentity = {};
    const source = {
      identity: sourceIdentity,
      kind: "frame",
      projectionOk: true,
      planReady: true,
      clockPreview: null,
    };
    const madePort = createRoomBackgroundPreparationPort(() => {
      starts++;
      const input =
        action === "decode-reject"
          ? new Blob([new Uint8Array([1, 2, 3])], { type: mime })
          : snapshot;
      const pending = createImageBitmap(input, { imageOrientation: "from-image" });
      return pending.then(
        async (bitmap) => {
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
            release() {
              closes++;
              bitmap.close();
            },
          });
        },
        async () => {
          observed();
          await gate;
          throw new Error("fixture-decode");
        },
      );
    });
    if (!madePort.ok) throw new Error("fixture-port");
    const made = createRoomPreparationController({
      readSource: () => source,
      captureFrame: () => ({
        width: 48,
        height: 32,
        release() {
          frameReleases++;
        },
      }),
      startBackground: madePort.port.startBackground,
    });
    if (!made.ok) throw new Error("fixture-controller");
    const controller = made.controller;
    try {
      const request = { sourceIdentity, backgroundIdentity },
        first = controller.prepare(request);
      await nativeObserved;
      const before = bitmapSize();
      let second: unknown = null;
      if (action === "clear") controller.clear();
      if (action === "dispose") {
        controller.dispose();
        madePort.port.dispose();
      }
      if (action === "source-change") source.identity = {};
      if (action === "pending-replace") second = await controller.prepare(request);
      const pendingState = madePort.port.getState();
      releaseGate();
      const result = await first;
      // Cancellation resolves logically before the delayed native delivery; flush only known microtasks.
      for (let i = 0; i < 8; i++) await Promise.resolve();
      const ready = controller.readPrepared(request);
      controller.clear();
      controller.dispose();
      madePort.port.dispose();
      return {
        result,
        second,
        ready,
        starts,
        closes,
        frameReleases,
        before,
        after: bitmapSize(),
        pendingState,
        finalState: madePort.port.getState(),
        evidence: {
          width: pair.evidence.encodedWidth,
          height: pair.evidence.encodedHeight,
          validation: pair.evidence.profileValidation,
          decodeAllowed: pair.evidence.decodeAllowed,
        },
      };
    } finally {
      releaseGate();
      controller.dispose();
      madePort.port.dispose();
    }
  } finally {
    releaseGate();
    // Failure-only safety net. Successful runs must already have observed close through the real lease.
    if (native && bitmapSize()?.width !== 0) (native as ImageBitmap).close();
    sourceCanvas.width = 0;
    sourceCanvas.height = 0;
  }
}
