// Lifecycle contract for the E2E preview servers (spec 021 re-verification, round 3).
//
// These tests pin OWNERSHIP and SHUTDOWN with fake servers — no real port is opened here. They
// assert that exactly the created handles are closed, that keep-alive connections are dropped before
// close, that a hanging or failing close is REPORTED rather than swallowed, that a partial startup
// closes only what it started, and that the host listeners Vite's `preview()` installs are removed
// again. The end-to-end proof (49/49, reporter summary, exit 0, ports free, no leftovers) is the
// repeated standalone run recorded in the handoff.

import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  assertPortAvailable,
  closePreviewServers,
  isPortTaken,
  PREVIEW_APP_ROOTS,
  resolveAppRoot,
  startPreviewServers,
} from "./e2e-preview.mjs";

/** Fake socket whose connect either succeeds, errors, or never settles. */
function fakeConnect({ mode }) {
  return (_options, onConnect) => {
    const socket = new EventEmitter();
    socket.destroy = () => {};
    socket.setTimeout = (_ms, onTimeout) => {
      if (mode === "timeout") queueMicrotask(onTimeout);
    };
    if (mode === "open") queueMicrotask(() => onConnect());
    if (mode === "refused") queueMicrotask(() => socket.emit("error", new Error("ECONNREFUSED")));
    return socket;
  };
}

/** Minimal stand-in for a Vite PreviewServer + its http.Server. */
function fakeServer({ close = () => Promise.resolve(), http = true } = {}) {
  const calls = { closeAllConnections: 0, closeIdleConnections: 0, close: 0 };
  const server = {
    calls,
    httpServer: http
      ? {
          closeAllConnections: () => {
            calls.closeAllConnections += 1;
          },
          closeIdleConnections: () => {
            calls.closeIdleConnections += 1;
          },
        }
      : undefined,
    close: () => {
      calls.close += 1;
      return close();
    },
  };
  return server;
}

/** A host process whose stdin/SIGTERM listener sets can be inspected. */
function fakeHost() {
  const host = new EventEmitter();
  host.stdin = new EventEmitter();
  return host;
}

const STAGING = "/tmp/denn-e2e-abc123";
const SPECS = [
  { app: "mockup", port: 4183, outDir: `${STAGING}/mockup` },
  { app: "admin", port: 4184, outDir: `${STAGING}/admin` },
];

describe("app roots", () => {
  it("exposes only the two repo apps", () => {
    expect([...PREVIEW_APP_ROOTS.entries()]).toEqual([
      ["mockup", "apps/mockup"],
      ["admin", "apps/admin"],
    ]);
    expect(resolveAppRoot("mockup")).toBe("apps/mockup");
    expect(resolveAppRoot("legacy")).toBeNull();
  });

  it("stores no served directory of its own — the caller must pass the staging outDir", async () => {
    const previewFn = vi.fn(async () => fakeServer());
    for (const outDir of [undefined, "", 4183]) {
      await expect(
        startPreviewServers([{ app: "mockup", port: 4183, outDir }], {
          previewFn,
          hostProcess: fakeHost(),
          assertAvailable: async () => {},
        }),
      ).rejects.toThrow(/missing E2E staging outDir/);
    }
    expect(previewFn).not.toHaveBeenCalled();
  });
});

describe("existing-server refusal (reuseExistingServer:false equivalent)", () => {
  it("reports a port as taken only when something answers", async () => {
    expect(await isPortTaken("127.0.0.1", 4183, { connectFn: fakeConnect({ mode: "open" }) })).toBe(
      true,
    );
    expect(
      await isPortTaken("127.0.0.1", 4183, { connectFn: fakeConnect({ mode: "refused" }) }),
    ).toBe(false);
    expect(
      await isPortTaken("127.0.0.1", 4183, { connectFn: fakeConnect({ mode: "timeout" }) }),
    ).toBe(false);
  });

  it("refuses when either loopback address is answering", async () => {
    await expect(
      assertPortAvailable(4183, { connectFn: fakeConnect({ mode: "open" }) }),
    ).rejects.toThrow(/already in use on 127\.0\.0\.1 — refusing to reuse an existing server/);
    await expect(
      assertPortAvailable(4183, { connectFn: fakeConnect({ mode: "refused" }) }),
    ).resolves.toBeUndefined();
  });

  it("never starts a server when the port is refused", async () => {
    const previewFn = vi.fn(async () => fakeServer());
    await expect(
      startPreviewServers(SPECS, {
        previewFn,
        hostProcess: fakeHost(),
        assertAvailable: async () => {
          throw new Error("port 4183 is already in use on ::1");
        },
      }),
    ).rejects.toThrow(/already in use/);
    expect(previewFn).not.toHaveBeenCalled();
  });
});

describe("startPreviewServers", () => {
  const freePorts = async () => {};

  it("starts one server per spec from staging with the app root and a strict port", async () => {
    const seen = [];
    const previewFn = vi.fn(async (config) => {
      seen.push(config);
      return fakeServer();
    });
    const handles = await startPreviewServers(SPECS, {
      previewFn,
      hostProcess: fakeHost(),
      assertAvailable: freePorts,
    });
    expect(seen).toEqual([
      {
        root: "apps/mockup",
        build: { outDir: `${STAGING}/mockup` },
        preview: { port: 4183, strictPort: true },
      },
      {
        root: "apps/admin",
        build: { outDir: `${STAGING}/admin` },
        preview: { port: 4184, strictPort: true },
      },
    ]);
    expect(handles.map((h) => [h.app, h.port])).toEqual([
      ["mockup", 4183],
      ["admin", 4184],
    ]);
  });

  it("rejects an unknown app or an invalid port without starting anything", async () => {
    const previewFn = vi.fn(async () => fakeServer());
    await expect(
      startPreviewServers([{ app: "legacy", port: 4183, outDir: `${STAGING}/x` }], {
        previewFn,
        hostProcess: fakeHost(),
        assertAvailable: freePorts,
      }),
    ).rejects.toThrow(/unknown preview app/);
    for (const port of [80, 70000, Number.NaN, 4183.5, undefined]) {
      await expect(
        startPreviewServers([{ app: "mockup", port, outDir: `${STAGING}/mockup` }], {
          previewFn,
          hostProcess: fakeHost(),
          assertAvailable: freePorts,
        }),
      ).rejects.toThrow(/invalid preview port/);
    }
    expect(previewFn).not.toHaveBeenCalled();
  });

  it("closes exactly the already-started handles when a later server fails, and rethrows", async () => {
    const first = fakeServer();
    const previewFn = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce(new Error("Port 4184 is already in use"));
    await expect(
      startPreviewServers(SPECS, {
        previewFn,
        hostProcess: fakeHost(),
        assertAvailable: freePorts,
      }),
    ).rejects.toThrow(/already in use/);
    expect(first.calls.close).toBe(1);
    expect(first.calls.closeAllConnections).toBe(1);
  });

  it("removes exactly the host listeners preview() installed, leaving pre-existing ones", async () => {
    const host = fakeHost();
    const preExistingStdin = () => {};
    const preExistingSigterm = () => {};
    host.stdin.on("end", preExistingStdin);
    host.on("SIGTERM", preExistingSigterm);

    const viteStdin = () => {};
    const viteSigterm = () => {};
    const previewFn = vi.fn(async () => {
      // what vite's preview() does: process.stdin.on("end", cb) + process.once("SIGTERM", cb)
      host.stdin.on("end", viteStdin);
      host.once("SIGTERM", viteSigterm);
      return fakeServer();
    });

    const handles = await startPreviewServers([SPECS[0]], {
      previewFn,
      hostProcess: host,
      assertAvailable: freePorts,
    });
    expect(host.stdin.listeners("end")).toEqual([preExistingStdin]);
    expect(host.listeners("SIGTERM")).toEqual([preExistingSigterm]);
    expect(handles[0].detached.stdinEnd).toEqual([viteStdin]);
    expect(handles[0].detached.sigterm).toEqual([viteSigterm]);
  });
});

describe("closePreviewServers", () => {
  it("drops keep-alive connections before closing each handle", async () => {
    const servers = [fakeServer(), fakeServer()];
    const handles = servers.map((server, i) => ({ app: SPECS[i].app, server }));
    await closePreviewServers(handles);
    for (const server of servers) {
      expect(server.calls.closeAllConnections).toBe(1);
      expect(server.calls.closeIdleConnections).toBe(1);
      expect(server.calls.close).toBe(1);
    }
  });

  it("tolerates a server without the newer http close helpers", async () => {
    const server = fakeServer({ http: false });
    await expect(closePreviewServers([{ app: "mockup", server }])).resolves.toBeUndefined();
    expect(server.calls.close).toBe(1);
  });

  it("reports a hanging close instead of hiding it, and still closes the other handle", async () => {
    const hanging = fakeServer({ close: () => new Promise(() => {}) });
    const healthy = fakeServer();
    const timers = [];
    const promise = closePreviewServers(
      [
        { app: "mockup", server: hanging },
        { app: "admin", server: healthy },
      ],
      {
        timeoutMs: 15_000,
        setTimeoutFn: (fn, ms) => {
          const timer = { fn, ms, unref: () => {} };
          timers.push(timer);
          // fire immediately so no wall-clock sleep is involved
          fn();
          return timer;
        },
        clearTimeoutFn: () => {},
      },
    );
    await expect(promise).rejects.toThrow(/did not close within 15000ms/);
    expect(timers[0].ms).toBe(15_000);
    expect(healthy.calls.close).toBe(1);
  });

  it("reports a rejecting close", async () => {
    const failing = fakeServer({ close: () => Promise.reject(new Error("EBUSY")) });
    await expect(closePreviewServers([{ app: "admin", server: failing }])).rejects.toThrow(
      /shutdown failed — admin: EBUSY/,
    );
  });

  it("aggregates every failure and closes nothing else", async () => {
    const a = fakeServer({ close: () => Promise.reject(new Error("first")) });
    const b = fakeServer({ close: () => Promise.reject(new Error("second")) });
    await expect(
      closePreviewServers([
        { app: "mockup", server: a },
        { app: "admin", server: b },
      ]),
    ).rejects.toThrow(/mockup: first; admin: second/);
  });

  it("is a no-op for an empty handle list", async () => {
    await expect(closePreviewServers([])).resolves.toBeUndefined();
  });
});
