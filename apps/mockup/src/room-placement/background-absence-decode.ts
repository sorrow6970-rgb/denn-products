import {
  type BackgroundAbsenceCode,
  type BackgroundAbsenceJob,
  createRoomBackgroundAbsenceJob,
} from "./background-file";
import type { BackgroundSizeLease } from "./promise-work";
import {
  type BackgroundCopy,
  type BackgroundPaintLease,
  createBackgroundPaintLease,
} from "./background-paint-lease";
import { createRoomBackgroundWorkAdmission } from "./work-admission";

type Code =
  | BackgroundAbsenceCode
  | `ROOM_BACKGROUND_WORK_${"INVALID_INPUT" | "BUSY" | "BLOCKED" | "DISPOSED" | "CANCELLED"}`
  | `ROOM_BACKGROUND_DECODE_${"FAILED" | "SIZE_MISMATCH" | "OUTCOME_UNKNOWN"}`;
type Result = Readonly<{ ok: true } | { ok: false; code: Code }>;
export interface BackgroundAbsenceDecodeTask<
  Lease extends BackgroundSizeLease = BackgroundSizeLease,
> {
  readonly result: Promise<Result>;
  cancel(): void;
  release(): void;
  takeLease(): Lease | null;
}
const nativeThen = Promise.prototype.then;
const options = Object.freeze({ imageOrientation: "from-image" as const });
const failure = (code: Code) => Object.freeze({ ok: false as const, code });
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Explicit trusted decoder only. No default decoder, drawable export or production wiring. */
export function createRoomBackgroundAbsenceDecodeWork(environment: unknown) {
  return createWork<false>(environment, false);
}

/** Explicit opt-in: decoder supplies a private synchronous copyTo capability. */
export function createRoomBackgroundAbsencePaintWork(environment: unknown) {
  return createWork<true>(environment, true);
}

function createWork<Paint extends boolean>(environment: unknown, paintMode: Paint) {
  type Lease = Paint extends true ? BackgroundPaintLease : BackgroundSizeLease;
  let decode: (blob: Blob) => unknown;
  let readEnvironment: { createReader(): unknown } | undefined;
  try {
    if (!record(environment)) throw new Error();
    const suppliedDecode = environment.decode;
    const suppliedReader = environment.createReader;
    if (
      typeof suppliedDecode !== "function" ||
      (suppliedReader !== undefined && typeof suppliedReader !== "function")
    )
      throw new Error();
    decode = (blob) => Reflect.apply(suppliedDecode, environment, [blob, options]);
    if (suppliedReader)
      readEnvironment = { createReader: () => Reflect.apply(suppliedReader, environment, []) };
  } catch {
    return failure("ROOM_BACKGROUND_WORK_INVALID_INPUT");
  }
  const admission = createRoomBackgroundWorkAdmission();
  let disposed = false;
  let currentStop: (() => void) | null = null;
  const work = Object.freeze({
    getState: admission.getState,
    start(request: unknown) {
      const reserved = admission.begin();
      if (!reserved.ok) return reserved;
      const { ticket } = reserved;
      let job: BackgroundAbsenceJob | null = null;
      let stopped = false;
      let reported = false;
      let size: { width: number; height: number } | null = null;
      let copy: BackgroundCopy | null = null;
      let resolve!: (value: Result) => void;
      const result = new Promise<Result>((done) => {
        resolve = done;
      });
      function report(value: Result) {
        if (reported) return;
        reported = true;
        resolve(value);
      }
      function detach() {
        if (currentStop === stop) currentStop = null;
      }
      function stop() {
        stopped = true;
        size = null;
        copy = null;
        report(
          failure(disposed ? "ROOM_BACKGROUND_WORK_DISPOSED" : "ROOM_BACKGROUND_WORK_CANCELLED"),
        );
        ticket.release();
        job?.cancel();
        detach();
      }
      function failed(code: Code) {
        report(failure(code));
        detach();
      }
      currentStop = stop;
      const task: BackgroundAbsenceDecodeTask<Lease> = Object.freeze({
        result,
        cancel: stop,
        release: stop,
        takeLease() {
          if (!reported || stopped || disposed || admission.getState() !== "held" || !size)
            return null;
          const value = size;
          size = null;
          // Only the explicit paint factory can transfer this capability.
          return (
            paintMode
              ? createBackgroundPaintLease(
                  value,
                  (target, crop, destination) => copy?.(target, crop, destination),
                  () => !stopped && copy !== null,
                  () => disposed,
                  stop,
                )
              : Object.freeze({ ...value, release: stop })
          ) as Lease;
        },
      });
      const made = createRoomBackgroundAbsenceJob(request, readEnvironment);
      if (!made.ok) {
        ticket.settle(null);
        failed(made.code);
        return Object.freeze({ ok: true as const, task });
      }
      job = made.job;
      // Request/environment getters may have disposed the owner before the job existed.
      if (stopped || disposed) job.cancel();
      void job.run().then((read) => {
        const completedJob = job;
        job = null;
        if (stopped || disposed) {
          if (read.ok) read.lease.release();
          completedJob?.dispose();
          ticket.settle(null);
          return;
        }
        if (!read.ok) {
          completedJob?.dispose();
          ticket.settle(null);
          failed(read.code);
          return;
        }
        // Take before disposing: the owner deliberately invalidates any unclaimed pair.
        const pair = read.lease.take();
        read.lease.release();
        completedJob?.dispose();
        if (!pair) {
          ticket.settle(null);
          failed("ROOM_BACKGROUND_DECODE_FAILED");
          return;
        }
        const expectedWidth = pair.evidence.encodedWidth;
        const expectedHeight = pair.evidence.encodedHeight;
        function fulfilled(bitmap: unknown) {
          let close: () => void;
          try {
            if (!record(bitmap)) throw new Error();
            const method = bitmap.close;
            if (typeof method !== "function") throw new Error();
            close = () => Reflect.apply(method, bitmap, []);
          } catch {
            ticket.settle(undefined);
            failed("ROOM_BACKGROUND_DECODE_OUTCOME_UNKNOWN");
            return;
          }
          ticket.settle(Object.freeze({ release: close }));
          if (stopped || disposed) return;
          try {
            const dimensions = bitmap as { width: unknown; height: unknown };
            const width = dimensions.width;
            if (stopped || disposed) return;
            const height = dimensions.height;
            if (stopped || disposed) return;
            if (
              !Number.isSafeInteger(width) ||
              !Number.isSafeInteger(height) ||
              width !== expectedWidth ||
              height !== expectedHeight
            ) {
              ticket.release();
              failed("ROOM_BACKGROUND_DECODE_SIZE_MISMATCH");
              return;
            }
            if (paintMode) {
              const suppliedCopy = (bitmap as Record<string, unknown>).copyTo;
              if (stopped || disposed) return;
              if (typeof suppliedCopy !== "function") throw new Error();
              copy = (target, crop, destination) =>
                Reflect.apply(suppliedCopy, bitmap, [target, crop, destination]);
            }
            size = { width: expectedWidth, height: expectedHeight };
            report(Object.freeze({ ok: true }));
          } catch {
            ticket.release();
            failed("ROOM_BACKGROUND_DECODE_FAILED");
          }
        }
        try {
          const pending = decode(pair.blob);
          Reflect.apply(nativeThen, pending, [
            fulfilled,
            () => {
              ticket.settle(null);
              failed("ROOM_BACKGROUND_DECODE_FAILED");
            },
          ]);
        } catch {
          // Broken trusted port: work may have started but is not observable. Never retry.
          ticket.settle(undefined);
          failed("ROOM_BACKGROUND_DECODE_OUTCOME_UNKNOWN");
        }
      });
      return Object.freeze({ ok: true as const, task });
    },
    dispose() {
      disposed = true;
      currentStop?.();
      admission.dispose();
    },
  });
  return Object.freeze({ ok: true as const, work });
}
