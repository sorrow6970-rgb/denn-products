// E2E preview server lifecycle, owned by exact handles (spec 021 re-verification, round 3).
//
// WHY NOT A `webServer` CHILD PROCESS ANY MORE — measured on Windows:
//   playwright-core `launchProcess` spawns every `webServer.command` with `shell: true` and, on
//   win32, without `detached`. The PID Playwright owns is a `cmd.exe` wrapper, `gracefulShutdown`
//   is refused outright on win32 ("Graceful shutdown is not supported on Windows"), and the
//   fallback `taskkill /pid <wrapper> /T /F` is skipped once the wrapper has closed. Teardown then
//   awaits the wrapper's `close` event, which requires every inherited stdio pipe to be closed —
//   so ANY surviving descendant blocks the whole command forever. Owning a child process at all is
//   the hazard, so these servers now run IN-PROCESS inside the Playwright runner and are closed by
//   their exact handles. No PID lookup, no port scan, no taskkill/SIGKILL, nothing else is touched.
//
// A second measured hazard this module neutralizes: Vite's `preview()` registers ITS OWN host
// listeners (`process.once("SIGTERM")` and, unless `CI === "true"`, `process.stdin.on("end")`) whose
// callback calls `process.exit()`. In a child process that was harmless; inside the Playwright
// runner it would let a stdin EOF (every non-TTY run) or a SIGTERM kill the run mid-flight. So each
// listener that `preview()` added is captured by difference and removed again — only those.

import { createConnection } from "node:net";
import { preview } from "vite";

/** Loopback addresses a test navigating to `http://localhost:<port>` can end up on. */
const LOOPBACK_HOSTS = ["127.0.0.1", "::1"];

/** True when something already answers on host:port. Connect-only — nothing is sent or killed. */
export function isPortTaken(host, port, { connectFn = createConnection, timeoutMs = 1000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (taken) => {
      if (settled) return;
      settled = true;
      socket?.destroy?.();
      resolve(taken);
    };
    const socket = connectFn({ host, port }, () => finish(true));
    socket.setTimeout?.(timeoutMs, () => finish(false));
    socket.on("error", () => finish(false));
  });
}

/**
 * Refuse to run against a server we did not start (the contract `reuseExistingServer: false` used to
 * provide). `strictPort` alone is NOT enough: a stale server bound to the IPv4 wildcard does not
 * collide with Vite's `localhost` (::1) bind, so both can hold the same port — measured. Both
 * loopback addresses are probed instead.
 */
export async function assertPortAvailable(port, options) {
  for (const host of LOOPBACK_HOSTS) {
    if (await isPortTaken(host, port, options)) {
      throw new Error(
        `port ${port} is already in use on ${host} — refusing to reuse an existing server`,
      );
    }
  }
}

/**
 * Only these two apps may be previewed. The directory each one is SERVED from is not stored here:
 * `scripts/e2e-run.mjs` builds them into a per-run `mkdtemp` directory under the OS temp root and
 * `tests/global-setup.ts` passes that absolute path in as `spec.outDir`. Nothing is ever served from
 * `apps/<app>/dist`, and no repo path is used — `firebase.json` publishes `hosting.public: "."`, so
 * any build output inside the repository would be a deploy candidate.
 */
export const PREVIEW_APP_ROOTS = new Map([
  ["mockup", "apps/mockup"],
  ["admin", "apps/admin"],
  ["hosting", "."],
]);

export function resolveAppRoot(app) {
  return PREVIEW_APP_ROOTS.get(app) ?? null;
}

function snapshotHostListeners(hostProcess) {
  return {
    stdinEnd: [...hostProcess.stdin.listeners("end")],
    sigterm: [...hostProcess.listeners("SIGTERM")],
  };
}

/** Remove exactly the listeners `preview()` added to the host process, and return them. */
function detachAddedHostListeners(hostProcess, before) {
  const stdinEnd = hostProcess.stdin.listeners("end").filter((l) => !before.stdinEnd.includes(l));
  const sigterm = hostProcess.listeners("SIGTERM").filter((l) => !before.sigterm.includes(l));
  for (const listener of stdinEnd) hostProcess.stdin.off("end", listener);
  for (const listener of sigterm) hostProcess.off("SIGTERM", listener);
  return { stdinEnd, sigterm };
}

/**
 * Start one preview server per spec and return the exact handles.
 *
 * `strictPort: true` is the "refuse an existing server" contract: Vite fails instead of silently
 * moving to another port, so a stale server on 4183/4184 fails the run rather than being reused.
 * If a later server fails to start, only the handles already created here are closed, and the
 * original startup error is rethrown.
 */
export async function startPreviewServers(
  specs,
  { previewFn = preview, hostProcess = process, assertAvailable = assertPortAvailable } = {},
) {
  const handles = [];
  try {
    for (const { app, port, outDir } of specs) {
      const root = resolveAppRoot(app);
      if (root === null) throw new Error(`unknown preview app: ${String(app)}`);
      if (typeof outDir !== "string" || outDir.length === 0) {
        throw new Error(`missing E2E staging outDir for ${app}`);
      }
      if (!Number.isInteger(port) || port < 1024 || port > 65535) {
        throw new Error(`invalid preview port for ${app}`);
      }
      await assertAvailable(port);
      const before = snapshotHostListeners(hostProcess);
      const server = await previewFn({
        root,
        // absolute per-run staging directory supplied by the caller (never a repo path)
        build: { outDir },
        preview: { port, strictPort: true },
      });
      handles.push({ app, port, server, detached: detachAddedHostListeners(hostProcess, before) });
    }
    return handles;
  } catch (error) {
    // exact-handle cleanup of the partially started set; the startup error is what the caller sees.
    await closePreviewServers(handles).catch(() => {});
    throw error;
  }
}

function withTimeout(promise, { timeoutMs, message, setTimeoutFn, clearTimeoutFn }) {
  return new Promise((resolve, reject) => {
    const timer = setTimeoutFn(() => reject(new Error(message)), timeoutMs);
    timer?.unref?.();
    const settle = (fn) => (value) => {
      clearTimeoutFn(timer);
      fn(value);
    };
    promise.then(settle(resolve), settle(reject));
  });
}

/**
 * Close exactly these handles. Keep-alive sockets are dropped first (`closeAllConnections`), because
 * `httpServer.close()` alone waits for idle keep-alive connections and can hang forever — the
 * "ports free but the process never exits" shape. A close that fails or exceeds `timeoutMs` is
 * REPORTED (thrown), never swallowed into a green run; every handle is attempted regardless.
 */
export async function closePreviewServers(
  handles,
  { timeoutMs = 15_000, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {},
) {
  const failures = [];
  for (const handle of handles) {
    try {
      const http = handle.server?.httpServer;
      http?.closeAllConnections?.();
      http?.closeIdleConnections?.();
      await withTimeout(handle.server.close(), {
        timeoutMs,
        message: `preview server for ${handle.app} did not close within ${timeoutMs}ms`,
        setTimeoutFn,
        clearTimeoutFn,
      });
    } catch (error) {
      failures.push(`${handle.app}: ${error?.message ?? String(error)}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`preview server shutdown failed — ${failures.join("; ")}`);
  }
}
