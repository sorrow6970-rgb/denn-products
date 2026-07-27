import { execFileSync } from "node:child_process";
import { ADMIN_PORT, MOCKUP_PORT } from "../../playwright.config";

// Deterministic teardown safety net (spec 017 re-verify): after the whole run, force-free the two
// preview ports so no `vite preview` / esbuild child can outlive the test process regardless of how
// Playwright's webServer tree-kill behaves on a given OS. Playwright already stops the webServers
// (reuseExistingServer:false + gracefulShutdown); this only kills a straggler still LISTENING on
// MOCKUP_PORT/ADMIN_PORT, and is a no-op when — as expected — nothing is left.

const PORTS = [MOCKUP_PORT, ADMIN_PORT] as const;

function listeningPids(port: number): number[] {
  const pids = new Set<number>();
  try {
    if (process.platform === "win32") {
      const out = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
      for (const line of out.split(/\r?\n/)) {
        // "  TCP  <local:port>  <remote:port>  LISTENING  <pid>"  (local address may be IPv6)
        const m = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/);
        if (m && Number(m[1]) === port) pids.add(Number(m[2]));
      }
    } else {
      const out = execFileSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], {
        encoding: "utf8",
      });
      for (const token of out.split(/\s+/)) {
        const pid = Number(token);
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
    }
  } catch {
    // netstat/lsof missing or no match → nothing to clean.
  }
  return [...pids];
}

function forceKill(pid: number): void {
  if (pid <= 4) return; // never touch system/idle pids
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/F", "/T", "/PID", String(pid)], { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGKILL");
    }
  } catch {
    // already gone
  }
}

export default function globalTeardown(): void {
  for (const port of PORTS) {
    for (const pid of listeningPids(port)) forceKill(pid);
  }
}
