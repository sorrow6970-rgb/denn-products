// Isolated spec105 byte checks. No image rendering or product entry imports.
import { useState } from "react";
import {
  createRoomBackgroundEvidenceJob,
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
  if (mode.startsWith("evidence-")) return checkEvidence(mode.slice(9));
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

function evidenceBytes(mode: string): Uint8Array<ArrayBuffer> {
  const [format, label] = mode.split(":");
  const tag = label !== "no-tag";
  const profile = new Uint8Array(tag ? 26 : 14);
  const view = new DataView(profile.buffer);
  profile.set([73, 73, 42, 0, 8, 0, 0, 0]);
  view.setUint16(8, tag ? 1 : 0, true);
  if (tag) {
    view.setUint16(10, 274, true);
    view.setUint16(12, 3, true);
    view.setUint32(14, 1, true);
    view.setUint16(18, Number(label) || 6, true);
  }
  if (format !== "png") {
    const base = jpeg();
    return label === "no-profile"
      ? base
      : new Uint8Array([
          255,
          216,
          255,
          225,
          0,
          profile.length + 8,
          69,
          120,
          105,
          102,
          0,
          0,
          ...profile,
          ...base.subarray(2),
        ]);
  }
  const base = png();
  if (label === "no-profile") return base;
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
    profile.length,
    ...body,
    crc >>> 24,
    (crc >>> 16) & 255,
    (crc >>> 8) & 255,
    crc & 255,
    ...base.subarray(33),
  ]);
}

async function checkEvidence(mode: string): Promise<Record<string, unknown>> {
  const bytes = evidenceBytes(mode),
    original = Array.from(bytes);
  const made = createRoomBackgroundEvidenceJob({
    file: new Blob([bytes], { type: "image/gif" }),
    budget: { maxEdge: 8000 },
  });
  if (!made.ok) return made;
  const pending = made.job.run(),
    samePromise = pending === made.job.run();
  if (mode === "cancel") made.job.cancel();
  if (mode === "dispose") made.job.dispose();
  const result = await pending;
  if (!result.ok) return { ...result, samePromise };
  bytes.fill(0);
  if (mode === "release") result.lease.release();
  const pair = result.lease.take();
  const output = pair ? new Uint8Array(await pair.blob.arrayBuffer()) : null;
  const equal =
    output !== null &&
    output.length === original.length &&
    output.every((b, i) => b === original[i]);
  const secondNull = result.lease.take() === null;
  made.job.dispose();
  result.lease.release();
  return {
    ok: true,
    samePromise,
    secondNull,
    equal,
    hasPair: pair !== null,
    frozen:
      Object.isFrozen(result) &&
      Object.isFrozen(result.lease) &&
      (!pair || (Object.isFrozen(pair) && Object.isFrozen(pair.evidence))),
    evidence: pair?.evidence ?? null,
    mime: pair?.blob.type ?? null,
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
        ...["jpeg", "png"].flatMap((format) =>
          ["1", "2", "3", "4", "5", "6", "7", "8", "no-profile", "no-tag"].map(
            (value) => `evidence-${format}:${value}`,
          ),
        ),
        "evidence-release",
        "evidence-cancel",
        "evidence-dispose",
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
