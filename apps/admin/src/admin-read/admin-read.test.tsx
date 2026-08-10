// Unit contract for the admin remote-read wiring, controller and card (spec 036 §8).
// Synthetic ports only — no Firebase SDK, no adapter, no network, no DOM.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  AdminStateLoadResult,
  AdminStateReadPort,
  OperatorAuthPort,
  OperatorAuthState,
} from "@denn/firebase/admin-read";
import { AdminRemoteStateCard } from "./AdminRemoteStateCard";
import { resolveAdminFirebaseConfig } from "./config";
import { createAdminRemoteController } from "./controller";
import { createAdminRemoteControllerFromEnv, createCorrelationId } from "./create";

const FULL_ENV = {
  VITE_DENN_ADMIN_FIREBASE_ENABLED: "true",
  VITE_DENN_ADMIN_FIREBASE_API_KEY: "k",
  VITE_DENN_ADMIN_FIREBASE_AUTH_DOMAIN: "d",
  VITE_DENN_ADMIN_FIREBASE_PROJECT_ID: "p",
  VITE_DENN_ADMIN_FIREBASE_STORAGE_BUCKET: "b",
  VITE_DENN_ADMIN_FIREBASE_APP_ID: "a",
} as const;

const KEYS = Object.keys(FULL_ENV).filter((k) => k !== "VITE_DENN_ADMIN_FIREBASE_ENABLED");

/** A synthetic auth port whose observer the test drives by hand. */
function fakeAuth(initial: OperatorAuthState = { status: "initializing" }) {
  let state = initial;
  const listeners = new Set<(next: OperatorAuthState) => void>();
  const signIn = vi.fn(async (_e: string, _p: string, req: { correlationId: string }) => ({
    ok: true as const,
    value: { correlationId: req.correlationId },
  }));
  const port: OperatorAuthPort = {
    subscribe: (listener) => {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    currentOperator: () => state,
    signInWithEmailPassword: signIn,
    signOut: async (req) => ({ ok: true as const, value: { correlationId: req.correlationId } }),
  };
  return {
    port,
    signIn,
    subscriberCount: () => listeners.size,
    emit(next: OperatorAuthState) {
      state = next;
      for (const listener of [...listeners]) listener(next);
    },
  };
}

function fakeRead(result: AdminStateLoadResult | Promise<AdminStateLoadResult>) {
  const load = vi.fn(() => Promise.resolve(result));
  return { port: { load } as unknown as AdminStateReadPort, load };
}

const OK_LOAD: AdminStateLoadResult = {
  ok: true,
  value: {
    document: { schemaVersion: 1, migratedFrom: "legacy-v0", data: {} },
    report: {
      sourceVersion: "legacy-v0",
      defaultsApplied: [],
      warnings: [],
      unknownPaths: [],
      extensions: {},
      counts: {},
      imageReferences: { dataUrl: 0, storagePath: 0, dual: 0 },
    },
    byteLength: 42,
    correlationId: "0123abcd",
  },
};

const cid = () => "0123abcd";

// --- config -----------------------------------------------------------------

describe("resolveAdminFirebaseConfig", () => {
  it("is unconfigured by default", () => {
    expect(resolveAdminFirebaseConfig(undefined).status).toBe("unconfigured");
    expect(resolveAdminFirebaseConfig({}).status).toBe("unconfigured");
  });

  it("accepts ONLY the exact string 'true' as the flag", () => {
    for (const flag of ["1", "TRUE", "True", "yes", "", " true"]) {
      const env = { ...FULL_ENV, VITE_DENN_ADMIN_FIREBASE_ENABLED: flag };
      expect(resolveAdminFirebaseConfig(env).status, flag).toBe("unconfigured");
    }
    expect(resolveAdminFirebaseConfig(FULL_ENV).status).toBe("configured");
  });

  it("refuses a partial config — every one of the five values is required", () => {
    for (const key of KEYS) {
      for (const bad of [undefined, "", "   "]) {
        const env: Record<string, unknown> = { ...FULL_ENV, [key]: bad };
        expect(resolveAdminFirebaseConfig(env).status, `${key}=${String(bad)}`).toBe(
          "unconfigured",
        );
      }
    }
  });

  it("returns exactly the five config fields, trimmed", () => {
    const result = resolveAdminFirebaseConfig({
      ...FULL_ENV,
      VITE_DENN_ADMIN_FIREBASE_API_KEY: " k ",
    });
    expect(result.status).toBe("configured");
    if (result.status !== "configured") return;
    expect(Object.keys(result.config).sort()).toEqual([
      "apiKey",
      "appId",
      "authDomain",
      "projectId",
      "storageBucket",
    ]);
    expect(result.config.apiKey).toBe("k");
  });
});

describe("createAdminRemoteControllerFromEnv", () => {
  it("creates no ports and stays unconfigured without an explicit, complete config", () => {
    const controller = createAdminRemoteControllerFromEnv(undefined);
    expect(controller.getSnapshot()).toEqual({
      status: "unconfigured",
      errorCode: null,
      canSignIn: false,
      canLoad: false,
    });
    controller.dispose();
  });

  it("produces a non-identifying hex correlation id", () => {
    const id = createCorrelationId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(createCorrelationId()).not.toBe(id);
  });
});

// --- controller -------------------------------------------------------------

describe("createAdminRemoteController — observer authority", () => {
  it("follows the observer for every auth transition", () => {
    const auth = fakeAuth();
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: fakeRead(OK_LOAD).port },
      createCorrelationId: cid,
    });
    const seen: string[] = [];
    controller.subscribe((s) => seen.push(s.status));
    auth.emit({ status: "signed-out" });
    auth.emit({ status: "authenticated" });
    auth.emit({ status: "error", code: "ANONYMOUS_NOT_ALLOWED" });
    expect(seen).toEqual(["initializing", "signed-out", "authenticated", "error"]);
  });

  it("does not turn a successful sign-in promise into an authenticated view", async () => {
    const auth = fakeAuth({ status: "signed-out" });
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: fakeRead(OK_LOAD).port },
      createCorrelationId: cid,
    });
    controller.subscribe(() => {});
    await controller.signIn("a@b.c", "pw");
    expect(controller.getSnapshot().status).toBe("signed-out"); // observer has not spoken
    auth.emit({ status: "authenticated" });
    expect(controller.getSnapshot().status).toBe("authenticated");
  });

  it("surfaces a sign-in failure as a safe code", async () => {
    const auth = fakeAuth({ status: "signed-out" });
    auth.signIn.mockResolvedValueOnce({
      ok: false,
      error: {
        category: "AUTH",
        code: "INVALID_CREDENTIAL",
        retryable: false,
        correlationId: "0123abcd",
      },
    } as never);
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: fakeRead(OK_LOAD).port },
      createCorrelationId: cid,
    });
    controller.subscribe(() => {});
    await controller.signIn("a@b.c", "pw");
    expect(controller.getSnapshot()).toMatchObject({
      status: "error",
      errorCode: "INVALID_CREDENTIAL",
    });
  });
});

describe("createAdminRemoteController — load", () => {
  it("never reads automatically and only reads on an explicit call", async () => {
    const auth = fakeAuth({ status: "authenticated" });
    const read = fakeRead(OK_LOAD);
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: read.port },
      createCorrelationId: cid,
    });
    controller.subscribe(() => {});
    auth.emit({ status: "authenticated" });
    expect(read.load).not.toHaveBeenCalled();
    await controller.load();
    expect(read.load).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().status).toBe("ready");
  });

  it("ignores a duplicate click while a read is running", async () => {
    let resolve!: (value: AdminStateLoadResult) => void;
    const pending = new Promise<AdminStateLoadResult>((r) => {
      resolve = r;
    });
    const auth = fakeAuth({ status: "authenticated" });
    const read = fakeRead(pending);
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: read.port },
      createCorrelationId: cid,
    });
    controller.subscribe(() => {});
    const first = controller.load();
    const second = controller.load();
    expect(read.load).toHaveBeenCalledTimes(1);
    resolve(OK_LOAD);
    await Promise.all([first, second]);
    expect(controller.getSnapshot().status).toBe("ready");
  });

  it("does not present stale data after a failure", async () => {
    const auth = fakeAuth({ status: "authenticated" });
    const read = fakeRead(OK_LOAD);
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: read.port },
      createCorrelationId: cid,
    });
    controller.subscribe(() => {});
    await controller.load();
    expect(controller.getSnapshot().status).toBe("ready");
    read.load.mockResolvedValueOnce({
      ok: false,
      error: {
        category: "NETWORK",
        code: "NETWORK_TIMEOUT",
        retryable: true,
        correlationId: "0123abcd",
      },
    } as never);
    await controller.load();
    expect(controller.getSnapshot()).toMatchObject({
      status: "error",
      errorCode: "NETWORK_TIMEOUT",
    });
  });

  it("makes no state change after dispose, and detaches the observer", async () => {
    let resolve!: (value: AdminStateLoadResult) => void;
    const pending = new Promise<AdminStateLoadResult>((r) => {
      resolve = r;
    });
    const auth = fakeAuth({ status: "authenticated" });
    const read = fakeRead(pending);
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: read.port },
      createCorrelationId: cid,
    });
    const seen: string[] = [];
    controller.subscribe((s) => seen.push(s.status));
    expect(auth.subscriberCount()).toBe(1);

    const inFlight = controller.load();
    const before = [...seen];
    controller.dispose();
    expect(auth.subscriberCount()).toBe(0);

    resolve(OK_LOAD); // the late result must not reach a disposed controller
    await inFlight;
    auth.emit({ status: "signed-out" });
    expect(seen).toEqual(before);
  });

  it("balances subscribe / unsubscribe across a StrictMode-style double mount", () => {
    const auth = fakeAuth();
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: fakeRead(OK_LOAD).port },
      createCorrelationId: cid,
    });
    const first = controller.subscribe(() => {});
    const second = controller.subscribe(() => {});
    first();
    second();
    controller.dispose();
    expect(auth.subscriberCount()).toBe(0);
  });
});

// --- card -------------------------------------------------------------------

describe("AdminRemoteStateCard", () => {
  const html = (controller = createAdminRemoteControllerFromEnv(undefined)): string =>
    renderToStaticMarkup(<AdminRemoteStateCard controller={controller} />);

  it("shows the disabled message by default and offers no controls", () => {
    const out = html();
    expect(out).toContain("운영자 원격 읽기가 아직 활성화되지 않았습니다.");
    expect(out).not.toContain("<button");
    expect(out).not.toContain("<input");
  });

  it("announces its result region politely", () => {
    const out = html();
    expect(out).toContain('role="status"');
    expect(out).toContain('aria-live="polite"');
  });

  it("offers no save, publish, upload or order affordance", () => {
    const auth = fakeAuth({ status: "authenticated" });
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: fakeRead(OK_LOAD).port },
      createCorrelationId: cid,
    });
    controller.subscribe(() => {}); // SSR runs no effect, so attach the observer explicitly
    const out = renderToStaticMarkup(<AdminRemoteStateCard controller={controller} />);
    // the explanatory copy mentions what the card does NOT do, so assert on the ACTIONS:
    // no button in this card may offer save / publish / upload / order
    const buttonLabels = [...out.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1] ?? "");
    for (const label of buttonLabels) {
      for (const forbidden of ["저장", "발행", "업로드", "주문"]) {
        expect(label, forbidden).not.toContain(forbidden);
      }
    }
    expect(buttonLabels.length).toBeGreaterThan(0);
  });

  it("uses a password field with the agreed autocomplete contract", () => {
    const auth = fakeAuth({ status: "signed-out" });
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: fakeRead(OK_LOAD).port },
      createCorrelationId: cid,
    });
    controller.subscribe(() => {});
    const out = renderToStaticMarkup(<AdminRemoteStateCard controller={controller} />);
    expect(out).toMatch(/type="password"/);
    expect(out).toMatch(/autocomplete="current-password"/i);
    expect(out).toContain("운영자 이메일");
  });

  it("renders no catalog, path, token or address in any state", () => {
    const auth = fakeAuth({ status: "authenticated" });
    const controller = createAdminRemoteController({
      ports: { auth: auth.port, read: fakeRead(OK_LOAD).port },
      createCorrelationId: cid,
    });
    controller.subscribe(() => {});
    const out = renderToStaticMarkup(<AdminRemoteStateCard controller={controller} />);
    for (const forbidden of [
      "admin/state.json",
      "schemaVersion",
      "data:",
      "https://",
      "0123abcd",
    ]) {
      expect(out, forbidden).not.toContain(forbidden);
    }
  });
});
