import { createRoomBackgroundWorkAdmission } from "./work-admission";

type Code = `ROOM_BACKGROUND_WORK_${
  | "INVALID_INPUT"
  | "BUSY"
  | "BLOCKED"
  | "DISPOSED"
  | "FAILED"
  | "CANCELLED"
  | "OUTCOME_UNKNOWN"}`;
type Result = Readonly<{ ok: true } | { ok: false; code: Code }>;
export interface BackgroundPromiseTask {
  readonly result: Promise<Result>;
  cancel(): void;
  release(): void;
}
export interface BackgroundSizeLease {
  readonly width: number;
  readonly height: number;
  release(): void;
}
export interface BackgroundPromiseLeaseTask extends BackgroundPromiseTask {
  takeLease(): BackgroundSizeLease | null;
}
interface Work<T extends BackgroundPromiseTask> {
  getState(): ReturnType<ReturnType<typeof createRoomBackgroundWorkAdmission>["getState"]>;
  start(start: unknown): Readonly<{ ok: false; code: Code } | { ok: true; task: T }>;
  dispose(): void;
}
const nativeThen = Promise.prototype.then;
const failure = (code: Code): Result => Object.freeze({ ok: false, code });

/** Trusted Promise port only. Neither a decoder nor permission to use partial file evidence. */
export function createRoomBackgroundPromiseWork() {
  return makeWork(false);
}
export function createRoomBackgroundPromiseLeaseWork() {
  return makeWork(true);
}
function makeWork(leaseMode: false): Work<BackgroundPromiseTask>;
function makeWork(leaseMode: true): Work<BackgroundPromiseLeaseTask>;
function makeWork(leaseMode: boolean): Work<BackgroundPromiseTask | BackgroundPromiseLeaseTask> {
  const admission = createRoomBackgroundWorkAdmission();
  let disposed = false;
  let currentStop: ((code: Code) => void) | null = null;
  return Object.freeze({
    getState: admission.getState,
    start(
      start: unknown,
    ): Readonly<{ ok: false; code: Code }> | Readonly<{ ok: true; task: BackgroundPromiseTask }> {
      if (disposed) return Object.freeze({ ok: false, code: "ROOM_BACKGROUND_WORK_DISPOSED" });
      if (typeof start !== "function")
        return Object.freeze({ ok: false, code: "ROOM_BACKGROUND_WORK_INVALID_INPUT" });
      const reserved = admission.begin();
      if (!reserved.ok) return reserved;
      const { ticket } = reserved;
      let cancelled = false,
        reported = false;
      let size: { width: number; height: number } | null = null;
      let resolve!: (result: Result) => void;
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
      function stop(code: Code) {
        cancelled = true;
        size = null;
        report(failure(code));
        // Keep pending native work reserved even though its logical result is settled.
        ticket.release();
        detach();
      }
      currentStop = stop;
      const cancel = () => stop("ROOM_BACKGROUND_WORK_CANCELLED");
      function takeLease(): BackgroundSizeLease | null {
        if (!reported || cancelled || disposed || admission.getState() !== "held" || !size)
          return null;
        const dimensions = size;
        size = null;
        return Object.freeze({ ...dimensions, release: cancel });
      }
      const task = leaseMode
        ? Object.freeze({ result, cancel, release: cancel, takeLease })
        : Object.freeze({ result, cancel, release: cancel });
      try {
        const pending: unknown = start();
        Reflect.apply(nativeThen, pending, [
          (resource: unknown) => {
            ticket.settle(resource);
            if (cancelled || disposed) return;
            if (leaseMode && admission.getState() === "held") {
              try {
                const dimensions = resource as { width?: unknown; height?: unknown };
                const width = dimensions.width;
                if (cancelled || disposed) return;
                const height = dimensions.height;
                if (cancelled || disposed) return;
                if (
                  typeof width !== "number" ||
                  typeof height !== "number" ||
                  !Number.isSafeInteger(width) ||
                  !Number.isSafeInteger(height) ||
                  width < 1 ||
                  height < 1 ||
                  width > 1_000_000 ||
                  height > 1_000_000
                )
                  throw new Error();
                size = { width, height };
              } catch {
                ticket.release();
                report(failure("ROOM_BACKGROUND_WORK_FAILED"));
                detach();
                return;
              }
            }
            if (admission.getState() === "held") report(Object.freeze({ ok: true }));
            else {
              report(failure("ROOM_BACKGROUND_WORK_FAILED"));
              detach();
            }
          },
          () => {
            ticket.settle(null);
            report(failure("ROOM_BACKGROUND_WORK_FAILED"));
            detach();
          },
        ]);
      } catch {
        // A throwing/broken start port may have launched work we cannot observe. Fail closed.
        ticket.settle(undefined);
        report(failure("ROOM_BACKGROUND_WORK_OUTCOME_UNKNOWN"));
        detach();
      }
      return Object.freeze({ ok: true, task });
    },
    dispose() {
      disposed = true;
      currentStop?.("ROOM_BACKGROUND_WORK_DISPOSED");
      admission.dispose();
    },
  });
}
