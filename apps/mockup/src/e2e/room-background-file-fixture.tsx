// Isolated spec105 byte checks. No image rendering or product entry imports.
import { useState } from "react";
import { createRoomBackgroundPngCapabilityProbe } from "../room-placement/background-png-capability";
import { checkBackgroundNative } from "./background-native-check";
import { checkAbsenceDecode } from "./background-absence-decode-check";
import { checkAbsencePaint } from "./background-absence-paint-check";
import { checkAbsencePreparation } from "./background-absence-preparation-check";
import {
  createRoomBackgroundEvidenceJob,
  createRoomBackgroundFileJob,
  type BackgroundFileReaderPort,
  type BackgroundAbsenceJob,
  createRoomBackgroundAbsenceJob,
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
  if (mode.startsWith("paint-")) return checkAbsencePaint(mode.slice(6));
  if (mode.startsWith("prepare-")) return checkAbsencePreparation(mode.slice(8));
  if (mode.startsWith("absence-")) return checkAbsence(mode.slice(8));
  if (mode.startsWith("decode-")) return checkAbsenceDecode(mode.slice(7));
  if (mode.startsWith("capability-")) {
    const probe = createRoomBackgroundPngCapabilityProbe();
    if (mode === "capability-dispose-before") probe.dispose();
    const pending = probe.run();
    const samePromise = pending === probe.run();
    if (mode === "capability-dispose-pending") {
      await Promise.resolve();
      probe.dispose();
    }
    const result = await pending;
    probe.dispose();
    return { ...result, samePromise };
  }
  if (mode.startsWith("native-")) return checkBackgroundNative(mode.slice(7));
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

async function checkAbsence(mode: string): Promise<Record<string, unknown>> {
  const bytes =
    mode === "png"
      ? png()
      : mode === "metadata-png"
        ? evidenceBytes("png:no-tag")
        : mode === "metadata-jpeg"
          ? evidenceBytes("jpeg:no-tag")
          : mode === "unknown-jpeg"
            ? new Uint8Array([255, 216, 255, 224, 0, 2, ...jpeg().subarray(2)])
            : jpeg();
  const original = Array.from(bytes);
  const file =
    mode === "file"
      ? new File([bytes], "synthetic.gif", { type: "image/gif" })
      : new Blob([bytes], { type: "image/gif" });
  let job: BackgroundAbsenceJob | null = null;
  let native: FileReader | null = null;
  let lateDelivered = false;
  const environment =
    mode === "late"
      ? {
          createReader() {
            const reader = new FileReader();
            native = reader;
            const bridge: BackgroundFileReaderPort = {
              get result() {
                return reader.result;
              },
              get readyState() {
                return reader.readyState;
              },
              onload: null,
              onerror: null,
              onabort: null,
              onloadend: null,
              readAsArrayBuffer(blob) {
                reader.readAsArrayBuffer(blob);
              },
              abort() {
                reader.abort();
              },
            };
            reader.onload = () => {
              lateDelivered = true;
              const saved = bridge.onload;
              job?.cancel();
              saved?.(); // Actual native read; deliberately delayed delivery after logical cancellation.
            };
            reader.onerror = () => bridge.onerror?.();
            reader.onabort = () => bridge.onabort?.();
            reader.onloadend = () => bridge.onloadend?.();
            return bridge;
          },
        }
      : undefined;
  const made = createRoomBackgroundAbsenceJob({ file, budget: { maxEdge: 8000 } }, environment);
  if (!made.ok) return made;
  job = made.job;
  try {
    if (mode === "cancel-before") job.cancel();
    const pending = job.run(),
      samePromise = pending === job.run();
    if (mode === "cancel") job.cancel();
    if (mode === "dispose") job.dispose();
    const result = await pending;
    if (!result.ok) return { ...result, samePromise, lateDelivered };
    bytes.fill(0);
    if (mode === "release") result.lease.release();
    const pair = result.lease.take();
    try {
      const output = pair ? new Uint8Array(await pair.blob.arrayBuffer()) : null;
      return {
        ok: true,
        samePromise,
        secondNull: result.lease.take() === null,
        equal:
          output !== null &&
          output.length === original.length &&
          output.every((v, i) => v === original[i]),
        hasPair: pair !== null,
        frozen:
          Object.isFrozen(result) &&
          Object.isFrozen(result.lease) &&
          (!pair || (Object.isFrozen(pair) && Object.isFrozen(pair.evidence))),
        evidence: pair?.evidence ?? null,
        mime: pair?.blob.type ?? null,
        lateDelivered,
      };
    } finally {
      result.lease.release();
    }
  } finally {
    job.dispose();
    // The test-only bridge is not a production cancellation mechanism.
    const reader = native as FileReader | null;
    if (reader) {
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
      reader.onloadend = null;
    }
  }
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
        ...[
          "jpeg",
          "png",
          "file",
          "metadata-jpeg",
          "metadata-png",
          "unknown-jpeg",
          "release",
          "cancel-before",
          "cancel",
          "dispose",
          "late",
        ].map((mode) => `absence-${mode}`),
        "capability-normal",
        ...["jpeg", "png"].flatMap((format) =>
          [
            "normal",
            "fractional",
            "release",
            "dispose",
            "cancel",
            "copy-throw",
            "invalid-aspect",
            "metadata",
          ].map((action) => `paint-${format}:${action}`),
        ),
        ...["jpeg", "png"].flatMap((format) =>
          [
            "normal",
            "clear",
            "dispose",
            "source-change",
            "pending-replace",
            "reject",
            "metadata",
            "capture-fail",
            "source-fail",
          ].map((action) => `prepare-${format}:${action}`),
        ),
        ...["jpeg", "png"].flatMap((format) =>
          ["normal", "cancel", "dispose", "mismatch", "reject", "metadata"].map(
            (action) => `decode-${format}:${action}`,
          ),
        ),
        "capability-dispose-before",
        "capability-dispose-pending",
        ...["jpeg", "png"].flatMap((format) =>
          ["1", "2", "3", "4", "5", "6", "7", "8", "no-profile", "no-tag"].map(
            (value) => `evidence-${format}:${value}`,
          ),
        ),
        "evidence-release",
        "evidence-cancel",
        "evidence-dispose",
        ...["jpeg", "png"].flatMap((format) =>
          ["normal", "clear", "dispose", "source-change", "pending-replace", "decode-reject"].map(
            (action) => `native-${format}:${action}`,
          ),
        ),
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
