import type { RoomBackgroundSink } from "./preparation";
import { createRoomBackgroundPromiseLeaseWork } from "./promise-work";

/** Trusted background producer only; no default decoder, browser I/O or photo permission. */
export function createRoomBackgroundPreparationPort(start: unknown) {
  if (typeof start !== "function")
    return Object.freeze({
      ok: false as const,
      code: "ROOM_BACKGROUND_WORK_INVALID_INPUT" as const,
    });
  const work = createRoomBackgroundPromiseLeaseWork();
  let disposed = false;
  const cancellations = new Set<() => void>();
  const port = Object.freeze({
    getState: work.getState,
    startBackground(identity: object, sink: RoomBackgroundSink) {
      let complete: (value: unknown) => void, fail: () => void;
      try {
        const onComplete = sink.complete,
          onFail = sink.fail;
        if (typeof onComplete !== "function" || typeof onFail !== "function") throw new Error();
        complete = (value) => Reflect.apply(onComplete, sink, [value]);
        fail = () => Reflect.apply(onFail, sink, []);
      } catch {
        throw new Error("ROOM_BACKGROUND_WORK_INVALID_INPUT");
      }
      let ended = disposed;
      const begun = disposed ? null : work.start(() => start(identity));
      const cancel = () => {
        ended = true;
        if (begun?.ok) begun.task.cancel();
        cancellations.delete(cancel);
      };
      const handle = Object.freeze({ cancel });
      if (disposed) {
        cancel();
        return handle;
      }
      if (ended) return handle;
      function failed() {
        if (ended) return;
        ended = true;
        cancellations.delete(cancel);
        try {
          fail();
        } catch {
          /* Safe terminal failure, no raw error or retry. */
        }
      }
      if (!begun?.ok) {
        failed();
        return handle;
      }
      cancellations.add(cancel);
      void begun.task.result.then((result) => {
        if (ended) return;
        if (!result.ok) {
          failed();
          return;
        }
        const lease = begun.task.takeLease();
        if (!lease) {
          failed();
          return;
        }
        ended = true;
        cancellations.delete(cancel);
        try {
          complete(lease);
        } catch {
          lease.release();
        }
      });
      return handle;
    },
    dispose() {
      disposed = true;
      for (const cancel of cancellations) cancel();
      work.dispose();
    },
  });
  return Object.freeze({ ok: true as const, port });
}
