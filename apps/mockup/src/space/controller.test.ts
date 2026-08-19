import type { SpaceDocumentReadPort, SpaceDocumentReadResult } from "@denn/firebase/space-read";
import type { OpenedSpaceV1, SpaceOpenPort, SpaceOpenResult } from "@denn/spaces";
import { describe, expect, it, vi } from "vitest";
import { SpaceLinkOpenController } from "./controller";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const opened: OpenedSpaceV1 = {
  ownerLabel: "고객",
  createdAt: "2026-08-19",
  scene: {
    schema: "space-scene-v1",
    design: {
      tplId: null,
      sizeId: null,
      colorId: null,
      texts: { main: "", name: "", name2: "", date: "", sub: "" },
      imgT: null,
    },
    room: {
      bgId: null,
      guideIndex: null,
      pos: null,
      sunPos: null,
      controls: {},
      settings: null,
      common: null,
      gallery: [],
    },
  },
};

const readOk = (document: unknown): SpaceDocumentReadResult => ({
  ok: true,
  value: { document, correlationId: "fake" },
});
const readError = (
  code: "SPACE_READ_NOT_FOUND" | "SPACE_READ_NETWORK_UNAVAILABLE",
  retryable: boolean,
): SpaceDocumentReadResult => ({
  ok: false,
  error: { code, retryable, correlationId: "fake" },
});
const openOk: SpaceOpenResult = { ok: true, value: opened };

function reader(results: Array<Promise<SpaceDocumentReadResult>>) {
  let index = 0;
  const load = vi.fn(() => results[index++] ?? Promise.resolve(readOk({})));
  return { port: { load } as SpaceDocumentReadPort, load };
}

function opener(results: Array<Promise<SpaceOpenResult>>) {
  let index = 0;
  const open = vi.fn(() => results[index++] ?? Promise.resolve(openOk));
  return { port: { open } as SpaceOpenPort, open };
}

describe("space link open controller", () => {
  it("starts inactive or invalid without calling either port", () => {
    const r = reader([]);
    const o = opener([]);
    expect(new SpaceLinkOpenController("", r.port, o.port).getState()).toEqual({
      status: "inactive",
    });
    expect(new SpaceLinkOpenController("?space=a/b", r.port, o.port).getState()).toEqual({
      status: "invalid-link",
    });
    expect(r.load).not.toHaveBeenCalled();
    expect(o.open).not.toHaveBeenCalled();
  });

  it("reads then opens on explicit password submit", async () => {
    const raw = { enc: "ciphertext-secret" };
    const r = reader([Promise.resolve(readOk(raw))]);
    const o = opener([Promise.resolve(openOk)]);
    const controller = new SpaceLinkOpenController("?space=legacy-token", r.port, o.port);
    expect(controller.getState()).toEqual({ status: "awaiting-password" });
    controller.submitPassword("password-secret");
    expect(controller.getState().status).toBe("loading");
    await Promise.resolve();
    await Promise.resolve();
    expect(r.load).toHaveBeenCalledWith({ token: "legacy-token", correlationId: "mockup-space-1" });
    expect(o.open).toHaveBeenCalledWith(raw, "password-secret");
    expect(controller.getState()).toEqual({ status: "ready", requestId: 1, value: opened });
    expect(JSON.stringify(controller.getState())).not.toMatch(
      /legacy-token|password-secret|ciphertext-secret/,
    );
  });

  it("reuses the in-memory document for an explicit password retry", async () => {
    const raw = { enc: "cipher" };
    const r = reader([Promise.resolve(readOk(raw))]);
    const o = opener([
      Promise.resolve({ ok: false, code: "SPACE_OPEN_DECRYPT_FAILED" }),
      Promise.resolve(openOk),
    ]);
    const controller = new SpaceLinkOpenController("?space=token", r.port, o.port);
    controller.submitPassword("wrong");
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_VIEW_PASSWORD_REJECTED",
      retryable: true,
    });
    controller.submitPassword("correct");
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.getState().status).toBe("ready");
    expect(r.load).toHaveBeenCalledOnce();
    expect(o.open).toHaveBeenCalledTimes(2);
  });

  it("re-reads only after an explicit retryable network failure", async () => {
    const r = reader([
      Promise.resolve(readError("SPACE_READ_NETWORK_UNAVAILABLE", true)),
      Promise.resolve(readOk({ enc: "cipher" })),
    ]);
    const o = opener([Promise.resolve(openOk)]);
    const controller = new SpaceLinkOpenController("?space=token", r.port, o.port);
    controller.submitPassword("pw");
    await Promise.resolve();
    expect(controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_VIEW_LOAD_FAILED",
    });
    controller.submitPassword("pw");
    await Promise.resolve();
    await Promise.resolve();
    expect(r.load).toHaveBeenCalledTimes(2);
    expect(controller.getState().status).toBe("ready");
  });

  it("blocks duplicate submits and non-retryable failures", async () => {
    const pending = deferred<SpaceDocumentReadResult>();
    const r = reader([pending.promise]);
    const o = opener([]);
    const controller = new SpaceLinkOpenController("?space=token", r.port, o.port);
    controller.submitPassword("one");
    controller.submitPassword("two");
    expect(r.load).toHaveBeenCalledOnce();
    pending.resolve(readError("SPACE_READ_NOT_FOUND", false));
    await Promise.resolve();
    await Promise.resolve();
    controller.submitPassword("three");
    expect(r.load).toHaveBeenCalledOnce();
    expect(o.open).not.toHaveBeenCalled();
  });

  it("ignores late results and clears listeners after detach", async () => {
    const pending = deferred<SpaceDocumentReadResult>();
    const r = reader([pending.promise]);
    const o = opener([]);
    const controller = new SpaceLinkOpenController("?space=token", r.port, o.port);
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.submitPassword("pw");
    controller.detach();
    pending.resolve(readOk({ enc: "late-secret" }));
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.getState().status).toBe("loading");
    expect(o.open).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("maps rejected injected ports without raw error or console output", async () => {
    const spies = [
      vi.spyOn(console, "log").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
    ];
    const r = reader([Promise.reject(new Error("raw-token-password"))]);
    const controller = new SpaceLinkOpenController("?space=token", r.port, opener([]).port);
    controller.submitPassword("pw");
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_VIEW_LOAD_FAILED",
      retryable: false,
    });
    expect(JSON.stringify(controller.getState())).not.toContain("raw-token-password");
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("reattaches after StrictMode cleanup and ignores the stale generation", async () => {
    const stale = deferred<SpaceDocumentReadResult>();
    const fresh = deferred<SpaceDocumentReadResult>();
    const r = reader([stale.promise, fresh.promise]);
    const o = opener([Promise.resolve({ ok: true, value: opened })]);
    const controller = new SpaceLinkOpenController("?space=token", r.port, o.port);

    controller.submitPassword("first");
    controller.detach();
    controller.attach();
    expect(controller.getState()).toEqual({ status: "awaiting-password" });
    stale.resolve(readOk({ enc: "stale" }));
    await Promise.resolve();
    expect(o.open).not.toHaveBeenCalled();

    controller.submitPassword("second");
    fresh.resolve(readOk({ enc: "fresh" }));
    await vi.waitFor(() => expect(controller.getState().status).toBe("ready"));
    expect(o.open).toHaveBeenCalledOnce();
  });
});
