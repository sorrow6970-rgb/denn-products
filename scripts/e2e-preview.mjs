// Repo-only Vite preview launcher for Playwright's `webServer` (spec 021 re-verification).
//
// WHY THIS EXISTS — measured Windows exit non-determinism:
//   Playwright always spawns a webServer `command` with `shell: true` and, on win32, without
//   `detached` (playwright-core `launchProcess`). So the PID Playwright owns is a `cmd.exe` wrapper,
//   while the process that actually owns the HTTP port is a DESCENDANT. On win32 Playwright's
//   `gracefulShutdown` option is also refused outright ("Graceful shutdown is not supported on
//   Windows"), so shutdown always falls back to `taskkill /pid <wrapper> /T /F`, and that call is
//   skipped entirely once the wrapper has already closed. A surviving descendant then keeps the
//   inherited stdout/stderr pipes open, the wrapper's `close` event never fires, and Playwright's
//   webServer teardown awaits it forever: every test passes and the command never exits, with the
//   ports still LISTENING. Reproduced by force-killing only the wrapper mid-run.
//
// WHAT THIS CHANGES: this launcher starts the preview server IN-PROCESS via Vite's Node API (the
// existing `vite` devDependency — no new dependency), so the node process Playwright's wrapper
// spawns is itself the port owner: no extra descendant to orphan. It then guards its own lifetime:
//   - SIGTERM/SIGINT/SIGHUP/SIGBREAK  -> close this server, exit 0
//   - stdin EOF (the pipe Playwright gives us dies with the runner) -> close this server, exit 0
//   - parent process gone (orphan)     -> close this server, exit 0
// Every guard terminates ONLY this process and closes ONLY the server it started. Nothing is killed
// by port number, and no other process — in this repo or outside it — is ever signalled.

import { pathToFileURL } from "node:url";
import { preview } from "vite";

/** Only these two apps may be previewed; the port must be an explicit high port. */
const APP_ROOTS = new Map([
  ["mockup", "apps/mockup"],
  ["admin", "apps/admin"],
]);

export function parsePreviewArgs(argv) {
  const [app, rawPort] = argv;
  const root = APP_ROOTS.get(app);
  if (root === undefined) return { ok: false, reason: "unknown-app" };
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return { ok: false, reason: "invalid-port" };
  }
  return { ok: true, app, root, port };
}

/** Idempotent shutdown: close the server we started, then exit 0 even if closing failed. */
export function createShutdown({ closeServer, exit }) {
  let closing = false;
  return async () => {
    if (closing) return;
    closing = true;
    try {
      await closeServer();
    } catch {
      // the process is going away anyway; a close error must not turn into an unhandled rejection.
    }
    exit(0);
  };
}

export const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT", "SIGHUP", "SIGBREAK"];

/**
 * Wire every lifetime guard. Pure wiring over injected collaborators so the exit path is unit
 * tested without starting a server. Returns a dispose function that clears the orphan timer.
 */
export function installShutdownGuards({
  shutdown,
  signalTarget,
  stdin,
  parentPid,
  isProcessAlive,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  intervalMs = 1000,
}) {
  for (const signal of SHUTDOWN_SIGNALS) signalTarget.on(signal, shutdown);
  // The runner holds the write end of our stdin pipe; EOF means our owner is gone.
  stdin.on("end", shutdown);
  stdin.on("close", shutdown);
  stdin.resume?.();
  // Orphan guard: if the process Playwright owns dies without taking us with it, exit ourselves.
  const timer = setIntervalFn(() => {
    if (!isProcessAlive(parentPid)) shutdown();
  }, intervalMs);
  timer?.unref?.();
  return () => clearIntervalFn(timer);
}

/** Existence probe (signal 0 never terminates anything). */
export function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM = alive but not ours to signal; only ESRCH means gone.
    return error?.code === "EPERM";
  }
}

async function main() {
  const parsed = parsePreviewArgs(process.argv.slice(2));
  if (!parsed.ok) {
    process.stderr.write(
      `e2e-preview: ${parsed.reason} (usage: node scripts/e2e-preview.mjs <mockup|admin> <port>)\n`,
    );
    process.exit(1);
  }
  const server = await preview({
    root: parsed.root,
    preview: { port: parsed.port, strictPort: true },
  });
  const shutdown = createShutdown({
    closeServer: () => server.close(),
    exit: (code) => process.exit(code),
  });
  installShutdownGuards({
    shutdown,
    signalTarget: process,
    stdin: process.stdin,
    parentPid: process.ppid,
    isProcessAlive: isPidAlive,
  });
  process.stdout.write(`e2e-preview: ${parsed.app} on port ${parsed.port} (pid ${process.pid})\n`);
}

// Only run when executed directly; importing this file (unit tests) must start no server.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
