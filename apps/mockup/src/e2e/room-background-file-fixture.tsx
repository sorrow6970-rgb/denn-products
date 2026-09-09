// Isolated spec105 byte checks. No image rendering or product entry imports.
import { useState } from "react";
import {
  createRoomBackgroundFileJob,
  type BackgroundFileReaderPort,
} from "../room-placement/background-file";

function jpeg(): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    255, 216, 255, 192, 0, 11, 8, 0, 2, 0, 3, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 17,
    255, 217,
  ]);
}
function png(): Uint8Array<ArrayBuffer> {
  const chunk = (type: string, data: number[]) => {
    const body = [...Array.from(type, (c) => c.charCodeAt(0)), ...data];
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
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
    ...chunk("IDAT", [0]),
    ...chunk("IEND", []),
  ]);
}

async function check(mode: string): Promise<Record<string, unknown>> {
  const bytes = mode === "png" ? png() : jpeg();
  const original = Array.from(bytes);
  const input =
    mode === "file"
      ? new File([bytes], "synthetic.gif", { type: "image/gif" })
      : new Blob(
          [
            mode === "oversize"
              ? new Uint8Array(20_000_001)
              : mode === "empty"
                ? new Uint8Array(0)
                : bytes,
          ],
          { type: "image/gif" },
        );
  const useFake = ["late", "read-error", "bad-result"].includes(mode);
  const fake: BackgroundFileReaderPort = {
    result: mode === "bad-result" ? null : bytes.buffer,
    readyState: 2,
    onload: null,
    onerror: null,
    onabort: null,
    onloadend: null,
    readAsArrayBuffer() {},
    abort() {
      this.onabort?.();
    },
  };
  const made = createRoomBackgroundFileJob(
    { file: input, budget: { maxEdge: 8000 } },
    useFake ? { createReader: () => fake } : undefined,
  );
  if (!made.ok) return { ok: false, code: made.code };
  const pending = made.job.run();
  const samePromise = pending === made.job.run();
  if (mode === "cancel" || mode === "late") {
    const late = fake.onload;
    made.job.cancel();
    late?.();
  }
  if (mode === "dispose") made.job.dispose();
  if (mode === "read-error") fake.onerror?.();
  if (mode === "bad-result") fake.onload?.();
  const result = await pending;
  if (!result.ok) return { ok: false, code: result.code, samePromise };
  bytes.fill(0);
  if (mode === "release") result.lease.release();
  const blob = result.lease.takeBlob();
  const output = blob ? Array.from(new Uint8Array(await blob.arrayBuffer())) : [];
  const equal = output.length === original.length && output.every((n, i) => n === original[i]);
  const secondNull = result.lease.takeBlob() === null;
  made.job.dispose();
  result.lease.release();
  return {
    ok: true,
    samePromise,
    secondNull,
    equal,
    hasBlob: blob !== null,
    preflight: result.preflight,
  };
}

export function RoomBackgroundFileFixture() {
  const [report, setReport] = useState("");
  return (
    <main>
      <p>Spec105 local byte checks</p>
      {[
        "jpeg",
        "file",
        "png",
        "release",
        "cancel",
        "dispose",
        "empty",
        "oversize",
        "late",
        "read-error",
        "bad-result",
      ].map((mode) => (
        <button
          type="button"
          key={mode}
          data-testid={`bf-${mode}`}
          onClick={() => {
            void check(mode).then(
              (value) => setReport(JSON.stringify(value)),
              () => setReport(JSON.stringify({ unexpectedFailure: true })),
            );
          }}
        >
          {mode}
        </button>
      ))}
      <pre data-testid="bf-report">{report}</pre>
    </main>
  );
}
