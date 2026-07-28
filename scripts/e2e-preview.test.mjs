// Exit-path contract for the E2E preview launcher (spec 021 re-verification).
//
// These tests pin the SHUTDOWN WIRING, not a real server: importing the launcher must start
// nothing, and each guard (signal / stdin EOF / dead parent) must close exactly the server this
// process started and then exit 0 — once. The real end-to-end proof that `pnpm run test:e2e`
// self-exits and frees ports 4183/4184 is the repeated standalone run recorded in the handoff.

import { describe, expect, it, vi } from "vitest";
import {
  createShutdown,
  installShutdownGuards,
  isPidAlive,
  parsePreviewArgs,
  SHUTDOWN_SIGNALS,
} from "./e2e-preview.mjs";

describe("parsePreviewArgs", () => {
  it("accepts only the two repo apps", () => {
    expect(parsePreviewArgs(["mockup", "4183"])).toEqual({
      ok: true,
      app: "mockup",
      root: "apps/mockup",
      port: 4183,
    });
    expect(parsePreviewArgs(["admin", "4184"])).toEqual({
      ok: true,
      app: "admin",
      root: "apps/admin",
      port: 4184,
    });
  });

  it("rejects an unknown app or a bad port", () => {
    expect(parsePreviewArgs(["legacy", "4183"])).toEqual({ ok: false, reason: "unknown-app" });
    expect(parsePreviewArgs([])).toEqual({ ok: false, reason: "unknown-app" });
    for (const port of ["", "abc", "80", "70000", "4183.5", undefined]) {
      expect(parsePreviewArgs(["mockup", port])).toEqual({ ok: false, reason: "invalid-port" });
    }
  });
});

describe("createShutdown", () => {
  it("closes the server then exits 0", async () => {
    const order = [];
    const shutdown = createShutdown({
      closeServer: async () => void order.push("close"),
      exit: (code) => order.push(`exit:${code}`),
    });
    await shutdown();
    expect(order).toEqual(["close", "exit:0"]);
  });

  it("is idempotent — repeated guards close and exit once", async () => {
    const closeServer = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();
    const shutdown = createShutdown({ closeServer, exit });
    await Promise.all([shutdown(), shutdown(), shutdown()]);
    await shutdown();
    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("still exits 0 when closing throws, and never rejects", async () => {
    const exit = vi.fn();
    const shutdown = createShutdown({
      closeServer: async () => {
        throw new Error("close failed");
      },
      exit,
    });
    await expect(shutdown()).resolves.toBeUndefined();
    expect(exit).toHaveBeenCalledWith(0);
  });
});

describe("installShutdownGuards", () => {
  const harness = () => {
    const signalHandlers = new Map();
    const stdinHandlers = new Map();
    const timers = [];
    const shutdown = vi.fn();
    const clearIntervalFn = vi.fn();
    const dispose = installShutdownGuards({
      shutdown,
      signalTarget: { on: (name, handler) => signalHandlers.set(name, handler) },
      stdin: { on: (name, handler) => stdinHandlers.set(name, handler), resume: () => {} },
      parentPid: 4242,
      isProcessAlive: (pid) => pid === 4242 && aliveRef.alive,
      setIntervalFn: (fn, ms) => {
        const timer = { fn, ms, unref: vi.fn() };
        timers.push(timer);
        return timer;
      },
      clearIntervalFn,
      intervalMs: 250,
    });
    return { signalHandlers, stdinHandlers, timers, shutdown, clearIntervalFn, dispose };
  };
  const aliveRef = { alive: true };

  it("registers every termination signal", () => {
    aliveRef.alive = true;
    const h = harness();
    expect([...h.signalHandlers.keys()]).toEqual([...SHUTDOWN_SIGNALS]);
    for (const signal of SHUTDOWN_SIGNALS) {
      h.shutdown.mockClear();
      h.signalHandlers.get(signal)();
      expect(h.shutdown).toHaveBeenCalledTimes(1);
    }
  });

  it("shuts down on stdin end/close (the owner's pipe died)", () => {
    aliveRef.alive = true;
    const h = harness();
    expect([...h.stdinHandlers.keys()]).toEqual(["end", "close"]);
    h.stdinHandlers.get("end")();
    h.stdinHandlers.get("close")();
    expect(h.shutdown).toHaveBeenCalledTimes(2);
  });

  it("shuts down when the owning parent process is gone, and not while it lives", () => {
    aliveRef.alive = true;
    const h = harness();
    expect(h.timers).toHaveLength(1);
    expect(h.timers[0].ms).toBe(250);
    expect(h.timers[0].unref).toHaveBeenCalled();
    h.timers[0].fn();
    expect(h.shutdown).not.toHaveBeenCalled();
    aliveRef.alive = false;
    h.timers[0].fn();
    expect(h.shutdown).toHaveBeenCalledTimes(1);
  });

  it("dispose clears the orphan timer", () => {
    aliveRef.alive = true;
    const h = harness();
    h.dispose();
    expect(h.clearIntervalFn).toHaveBeenCalledWith(h.timers[0]);
  });
});

describe("isPidAlive", () => {
  it("reports this process alive and rejects invalid pids", () => {
    expect(isPidAlive(process.pid)).toBe(true);
    for (const pid of [0, -1, 1.5, Number.NaN, undefined]) {
      expect(isPidAlive(pid)).toBe(false);
    }
  });

  it("reports a never-existing pid as gone", () => {
    // 0x7FFFFFFE is above Windows' and Linux' practical pid range.
    expect(isPidAlive(0x7ffffffe)).toBe(false);
  });
});
