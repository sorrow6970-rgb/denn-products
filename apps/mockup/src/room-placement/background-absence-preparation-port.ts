import {
  type BackgroundAbsenceDecodeTask,
  createRoomBackgroundAbsenceDecodeWork,
  createRoomBackgroundAbsencePaintWork,
} from "./background-absence-decode";

const code = "ROOM_BACKGROUND_WORK_INVALID_INPUT" as const;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Trusted identity lookup inside the existing work reservation; no default UI or decoder. */
export function createRoomBackgroundAbsencePreparationPort(environment: unknown) {
  return createPort(environment, false);
}
export function createRoomBackgroundAbsencePaintPreparationPort(environment: unknown) {
  return createPort(environment, true);
}
function createPort(environment: unknown, paintMode: boolean) {
  let lookup: (identity: object) => unknown;
  let decode: (blob: Blob, options: unknown) => unknown;
  let createReader: (() => unknown) | undefined;
  try {
    if (!record(environment)) throw new Error();
    const suppliedLookup = environment.readRequest;
    const suppliedDecode = environment.decode;
    const suppliedReader = environment.createReader;
    if (
      typeof suppliedLookup !== "function" ||
      typeof suppliedDecode !== "function" ||
      (suppliedReader !== undefined && typeof suppliedReader !== "function")
    )
      throw new Error();
    lookup = (identity) => Reflect.apply(suppliedLookup, environment, [identity]);
    decode = (blob, options) => Reflect.apply(suppliedDecode, environment, [blob, options]);
    if (suppliedReader) createReader = () => Reflect.apply(suppliedReader, environment, []);
  } catch {
    return Object.freeze({ ok: false as const, code });
  }
  const made = paintMode
    ? createRoomBackgroundAbsencePaintWork({ decode, createReader })
    : createRoomBackgroundAbsenceDecodeWork({ decode, createReader });
  if (!made.ok) return made;
  const { work } = made;
  let disposed = false;
  const pending = new Set<() => void>();
  const port = Object.freeze({
    getState: work.getState,
    startBackground(identity: unknown, sink: unknown) {
      let complete: (value: unknown) => void;
      let fail: () => void;
      try {
        if (!record(identity) || !record(sink)) throw new Error();
        const suppliedComplete = sink.complete;
        const suppliedFail = sink.fail;
        if (typeof suppliedComplete !== "function" || typeof suppliedFail !== "function")
          throw new Error();
        complete = (value) => Reflect.apply(suppliedComplete, sink, [value]);
        fail = () => Reflect.apply(suppliedFail, sink, []);
      } catch {
        throw new Error(code);
      }
      let ended = false;
      let task: BackgroundAbsenceDecodeTask | null = null;
      let snapshot: { file: unknown; budget: { maxEdge: unknown } } | null = null;
      function finish() {
        ended = true;
        pending.delete(cancel);
      }
      function cancel() {
        finish();
        task?.cancel();
      }
      function active() {
        if (ended || disposed) throw new Error(code);
      }
      function failed() {
        if (ended) return;
        finish();
        try {
          fail();
        } catch {
          /* Sink errors never escape or trigger retry. */
        }
      }
      const handle = Object.freeze({ cancel });
      // Register before request getters can reenter dispose, even before task exists.
      pending.add(cancel);
      let begun: ReturnType<typeof work.start>;
      try {
        begun = work.start({
          get file() {
            active();
            const supplied = lookup(identity as object);
            active();
            if (!record(supplied)) throw new Error(code);
            const suppliedIdentity = supplied.identity;
            active();
            if (suppliedIdentity !== identity) throw new Error(code);
            const file = supplied.file;
            active();
            const budget = supplied.budget;
            active();
            if (!record(budget)) throw new Error(code);
            const maxEdge = budget.maxEdge;
            active();
            snapshot = { file, budget: { maxEdge } };
            return snapshot.file;
          },
          get budget() {
            active();
            return snapshot?.budget;
          },
        });
      } finally {
        snapshot = null;
      }
      if (!begun.ok) {
        failed();
        return handle;
      }
      task = begun.task;
      if (ended || disposed) {
        cancel();
        return handle;
      }
      const ownedTask = task;
      void ownedTask.result.then((result) => {
        if (ended) return;
        if (!result.ok) {
          failed();
          return;
        }
        const lease = ownedTask.takeLease();
        if (!lease) {
          failed();
          return;
        }
        finish();
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
      for (const cancel of pending) cancel();
      work.dispose();
    },
  });
  return Object.freeze({ ok: true as const, port });
}
