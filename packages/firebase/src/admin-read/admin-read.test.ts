// Unit contract for operator auth + private admin-state read (spec 036 §8).
// 100% synthetic: the SDK facade is a fake, so there is no Firebase import, no app, no network.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_STATE_MAX_BYTES,
  ADMIN_STATE_OBJECT_PATH,
  ADMIN_STATE_READ_TIMEOUT_MS,
  createAdminStateReadPort,
  createOperatorAuthPort,
} from "./index";
import type { AdminFacadeUser, AdminFirebaseFacade, AdminReadObjectRequest } from "./facade";
import { createAdminStateReadPortWithTimeout } from "./read-port";
import type { OperatorAuthState } from "./types";

const CID = "0123abcd";
const CID2 = "beefcafe";

/** A promise whose resolve is callable from the test body (TS cannot narrow closure writes). */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const encode = (value: unknown): Uint8Array =>
  new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value));

const OK_CATALOG = { frameSizes: [{ id: "s1", name: "s1", aspect: 1.41 }] };

interface Fake extends AdminFirebaseFacade {
  emit(user: AdminFacadeUser | null): void;
  emitError(error: unknown): void;
  readonly reads: AdminReadObjectRequest[];
  readonly observerCount: () => number;
}

function makeFake(
  overrides: Partial<AdminFirebaseFacade> & { bytes?: Uint8Array; readError?: unknown } = {},
): Fake {
  const listeners = new Set<(user: AdminFacadeUser | null) => void>();
  const errorCallbacks = new Set<(error: unknown) => void>();
  const reads: AdminReadObjectRequest[] = [];
  const fake: Fake = {
    setPersistenceLocal: overrides.setPersistenceLocal ?? (() => Promise.resolve()),
    onAuthStateChanged:
      overrides.onAuthStateChanged ??
      ((listener, onError) => {
        listeners.add(listener);
        errorCallbacks.add(onError);
        return () => {
          listeners.delete(listener);
          errorCallbacks.delete(onError);
        };
      }),
    signInWithEmailPassword: overrides.signInWithEmailPassword ?? (() => Promise.resolve()),
    signOut: overrides.signOut ?? (() => Promise.resolve()),
    readObjectBytes:
      overrides.readObjectBytes ??
      ((request) => {
        reads.push(request);
        if (overrides.readError !== undefined) return Promise.reject(overrides.readError);
        return Promise.resolve(overrides.bytes ?? encode(OK_CATALOG));
      }),
    emit: (user) => {
      for (const listener of [...listeners]) listener(user);
    },
    emitError: (error) => {
      for (const onError of [...errorCallbacks]) onError(error);
    },
    reads,
    observerCount: () => listeners.size,
  };
  return fake;
}

/** An authenticated port with an attached observer, plus its unsubscribe. */
function authenticatedPort(fake: Fake) {
  const port = createOperatorAuthPort(fake);
  const seen: OperatorAuthState[] = [];
  const unsubscribe = port.subscribe((state) => seen.push(state));
  fake.emit({ isAnonymous: false });
  return { port, seen, unsubscribe };
}

afterEach(() => {
  vi.useRealTimers();
});

// --- boundary ---------------------------------------------------------------

describe("admin-read module boundary", () => {
  it("exposes no write / upload / delete / published surface", async () => {
    const surface = await import("./index");
    const names = Object.keys(surface).join(" ").toLowerCase();
    for (const forbidden of ["upload", "write", "delete", "publish", "getdownloadurl"]) {
      expect(names, forbidden).not.toContain(forbidden);
    }
  });

  it("importing the module initializes no SDK and performs no network call", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (() => {
      calls++;
      throw new Error("no network is allowed here");
    }) as typeof globalThis.fetch;
    try {
      // a genuinely fresh module instance, via the module registry rather than a query-string
      // path (an interpolated dynamic import is not statically analysable and Vite warns on it)
      vi.resetModules();
      await import("./index");
    } finally {
      globalThis.fetch = original;
    }
    expect(calls).toBe(0);
  });

  it("pins the contract constants", () => {
    expect(ADMIN_STATE_OBJECT_PATH).toBe("admin/state.json");
    expect(ADMIN_STATE_MAX_BYTES).toBe(20 * 1024 * 1024 - 1);
    expect(ADMIN_STATE_MAX_BYTES).toBe(20_971_519);
    expect(ADMIN_STATE_READ_TIMEOUT_MS).toBe(30_000);
  });
});

// --- auth port --------------------------------------------------------------

describe("createOperatorAuthPort — observer", () => {
  it("starts initializing and only settles through the observer", () => {
    const fake = makeFake();
    const port = createOperatorAuthPort(fake);
    expect(port.currentOperator()).toEqual({ status: "initializing" });
    const seen: OperatorAuthState[] = [];
    port.subscribe((s) => seen.push(s));
    expect(seen[0]).toEqual({ status: "initializing" });
    fake.emit(null);
    expect(port.currentOperator()).toEqual({ status: "signed-out" });
  });

  it("balances subscribe / unsubscribe (StrictMode double-subscribe leaks nothing)", () => {
    const fake = makeFake();
    const port = createOperatorAuthPort(fake);
    expect(fake.observerCount()).toBe(0);
    const a = port.subscribe(() => {});
    const b = port.subscribe(() => {});
    expect(fake.observerCount()).toBe(1); // one SDK observer regardless of listener count
    a();
    expect(fake.observerCount()).toBe(1);
    b();
    expect(fake.observerCount()).toBe(0);
    a(); // a repeated unsubscribe must not detach a later observer
    expect(fake.observerCount()).toBe(0);
  });

  it("never reports an anonymous session as authenticated", () => {
    const fake = makeFake();
    const port = createOperatorAuthPort(fake);
    port.subscribe(() => {});
    fake.emit({ isAnonymous: true });
    expect(port.currentOperator()).toEqual({
      status: "error",
      code: "ANONYMOUS_NOT_ALLOWED",
    });
  });
});

describe("createOperatorAuthPort — single authority (§4.3)", () => {
  it("does NOT flip to authenticated when the sign-in promise resolves first", async () => {
    const fake = makeFake();
    const port = createOperatorAuthPort(fake);
    port.subscribe(() => {});
    fake.emit(null);

    const result = await port.signInWithEmailPassword("a@b.c", "pw", { correlationId: CID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.value)).toEqual(["correlationId"]);
    // the observer has not spoken yet, so the state must still be signed-out
    expect(port.currentOperator()).toEqual({ status: "signed-out" });

    fake.emit({ isAnonymous: false });
    expect(port.currentOperator()).toEqual({ status: "authenticated" });
  });

  it("does NOT roll the observer's state back when the action finishes later", async () => {
    const signInGate = deferred<void>();
    const fake = makeFake({ signInWithEmailPassword: () => signInGate.promise });
    const port = createOperatorAuthPort(fake);
    port.subscribe(() => {});
    const pending = port.signInWithEmailPassword("a@b.c", "pw", { correlationId: CID });
    // the port awaits setPersistenceLocal first, so let that microtask drain before releasing
    await new Promise((resolve) => setTimeout(resolve, 0));
    fake.emit({ isAnonymous: false }); // observer wins the race
    expect(port.currentOperator()).toEqual({ status: "authenticated" });
    signInGate.resolve();
    await pending;
    expect(port.currentOperator()).toEqual({ status: "authenticated" });
  });

  it("applies the same rule to sign-out", async () => {
    const fake = makeFake();
    const port = createOperatorAuthPort(fake);
    port.subscribe(() => {});
    fake.emit({ isAnonymous: false });
    const result = await port.signOut({ correlationId: CID });
    expect(result.ok).toBe(true);
    expect(port.currentOperator()).toEqual({ status: "authenticated" }); // observer has not spoken
    fake.emit(null);
    expect(port.currentOperator()).toEqual({ status: "signed-out" });
  });
});

describe("createOperatorAuthPort — errors", () => {
  it("fails closed when local persistence cannot be set, without attempting sign-in", async () => {
    const signIn = vi.fn(() => Promise.resolve());
    const fake = makeFake({
      setPersistenceLocal: () => Promise.reject(new Error("nope")),
      signInWithEmailPassword: signIn,
    });
    const port = createOperatorAuthPort(fake);
    const result = await port.signInWithEmailPassword("a@b.c", "pw", { correlationId: CID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("AUTH_PERSISTENCE_FAILED");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("collapses every invalid-credential variant into one code", async () => {
    for (const code of [
      "auth/invalid-credential",
      "auth/wrong-password",
      "auth/user-not-found",
      "auth/invalid-email",
      "auth/user-disabled",
    ]) {
      const fake = makeFake({
        signInWithEmailPassword: () => Promise.reject({ code, message: "raw", email: "x@y.z" }),
      });
      const port = createOperatorAuthPort(fake);
      const result = await port.signInWithEmailPassword("a@b.c", "pw", { correlationId: CID });
      expect(result.ok, code).toBe(false);
      if (!result.ok) expect(result.error.code, code).toBe("INVALID_CREDENTIAL");
    }
  });

  it("maps rate limiting, network failure and unknown codes", async () => {
    const cases: ReadonlyArray<[unknown, string]> = [
      [{ code: "auth/too-many-requests" }, "AUTH_RATE_LIMITED"],
      [{ code: "auth/network-request-failed" }, "NETWORK_UNAVAILABLE"],
      [{ code: "auth/some-brand-new-code" }, "UNEXPECTED_ADMIN_READ_ERROR"],
      [new Error("plain"), "UNEXPECTED_ADMIN_READ_ERROR"],
    ];
    for (const [thrown, expected] of cases) {
      const fake = makeFake({ signInWithEmailPassword: () => Promise.reject(thrown) });
      const port = createOperatorAuthPort(fake);
      const result = await port.signInWithEmailPassword("a@b.c", "pw", { correlationId: CID });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code, expected).toBe(expected);
    }
  });

  it("rejects a malformed correlationId without calling the SDK", async () => {
    const signIn = vi.fn(() => Promise.resolve());
    const fake = makeFake({ signInWithEmailPassword: signIn });
    const port = createOperatorAuthPort(fake);
    for (const bad of ["", "ABC12345", "short", "x".repeat(65), "0123abc!"]) {
      const result = await port.signInWithEmailPassword("a@b.c", "pw", { correlationId: bad });
      expect(result.ok, bad).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_REQUEST");
    }
    expect(signIn).not.toHaveBeenCalled();
  });

  it("never leaks a raw SDK message, email, uid or token", async () => {
    const fake = makeFake({
      signInWithEmailPassword: () =>
        Promise.reject({
          code: "auth/wrong-password",
          message: "SECRET-RAW-MESSAGE",
          email: "operator@example.com",
          uid: "UID-XYZ",
          token: "TOKEN-123",
        }),
    });
    const port = createOperatorAuthPort(fake);
    const result = await port.signInWithEmailPassword("a@b.c", "pw", { correlationId: CID });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const serialized = JSON.stringify(result.error);
    for (const secret of ["SECRET-RAW-MESSAGE", "operator@example.com", "UID-XYZ", "TOKEN-123"]) {
      expect(serialized, secret).not.toContain(secret);
    }
    expect(Object.keys(result.error).sort()).toEqual([
      "category",
      "code",
      "correlationId",
      "retryable",
    ]);
  });
});

// --- read port --------------------------------------------------------------

describe("createAdminStateReadPort — auth gate", () => {
  it("makes ZERO storage calls while initializing, signed-out or anonymous", async () => {
    for (const setup of [
      (_f: Fake) => {},
      (f: Fake) => f.emit(null),
      (f: Fake) => f.emit({ isAnonymous: true }),
    ]) {
      const fake = makeFake();
      const auth = createOperatorAuthPort(fake);
      auth.subscribe(() => {});
      setup(fake);
      const port = createAdminStateReadPort({ facade: fake, auth });
      const result = await port.load({ correlationId: CID });
      expect(result.ok).toBe(false);
      expect(fake.reads).toHaveLength(0);
    }
  });

  it("reports the specific auth reason", async () => {
    const expectCode = async (setup: (f: Fake) => void, code: string) => {
      const fake = makeFake();
      const auth = createOperatorAuthPort(fake);
      auth.subscribe(() => {});
      setup(fake);
      const port = createAdminStateReadPort({ facade: fake, auth });
      const result = await port.load({ correlationId: CID });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code, code).toBe(code);
    };
    await expectCode(() => {}, "AUTH_NOT_READY");
    await expectCode((f) => f.emit(null), "AUTH_REQUIRED");
    await expectCode((f) => f.emit({ isAnonymous: true }), "ANONYMOUS_NOT_ALLOWED");
  });

  it("rejects a malformed correlationId before touching storage", async () => {
    const fake = makeFake();
    const { port: auth } = authenticatedPort(fake);
    const port = createAdminStateReadPort({ facade: fake, auth });
    const result = await port.load({ correlationId: "nope!" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_REQUEST");
    expect(fake.reads).toHaveLength(0);
  });
});

describe("createAdminStateReadPort — success path", () => {
  it("reads the fixed object exactly once with the size ceiling", async () => {
    const fake = makeFake();
    const { port: auth } = authenticatedPort(fake);
    const port = createAdminStateReadPort({ facade: fake, auth });
    const result = await port.load({ correlationId: CID });
    expect(result.ok).toBe(true);
    expect(fake.reads).toEqual([
      { objectPath: "admin/state.json", maxDownloadSizeBytes: ADMIN_STATE_MAX_BYTES },
    ]);
    if (!result.ok) return;
    expect(result.value.document.schemaVersion).toBe(1);
    expect(result.value.correlationId).toBe(CID);
    expect(result.value.byteLength).toBe(encode(OK_CATALOG).byteLength);
  });

  it("keeps no raw bytes or raw JSON string on the success value", async () => {
    const fake = makeFake();
    const { port: auth } = authenticatedPort(fake);
    const port = createAdminStateReadPort({ facade: fake, auth });
    const result = await port.load({ correlationId: CID });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.value).sort()).toEqual([
      "byteLength",
      "correlationId",
      "document",
      "report",
    ]);
  });

  it("accepts no path, bucket or URL from the caller", async () => {
    const fake = makeFake();
    const { port: auth } = authenticatedPort(fake);
    const port = createAdminStateReadPort({ facade: fake, auth });
    // an injected path is simply not part of the request type; at runtime it is ignored
    await port.load({ correlationId: CID, objectPath: "admin/secret.json" } as never);
    expect(fake.reads.map((r) => r.objectPath)).toEqual(["admin/state.json"]);
  });
});

describe("createAdminStateReadPort — failures", () => {
  it("maps storage codes to the contract codes", async () => {
    const cases: ReadonlyArray<[string, string]> = [
      ["storage/object-not-found", "ADMIN_STATE_NOT_FOUND"],
      ["storage/unauthorized", "ADMIN_STATE_FORBIDDEN"],
      ["storage/download-size-exceeded", "RESPONSE_TOO_LARGE"],
      ["storage/retry-limit-exceeded", "NETWORK_UNAVAILABLE"],
      ["storage/brand-new", "UNEXPECTED_ADMIN_READ_ERROR"],
    ];
    for (const [code, expected] of cases) {
      const fake = makeFake({ readError: { code, message: "RAW-STORAGE-MESSAGE" } });
      const { port: auth } = authenticatedPort(fake);
      const port = createAdminStateReadPort({ facade: fake, auth });
      const result = await port.load({ correlationId: CID });
      expect(result.ok, code).toBe(false);
      if (!result.ok) {
        expect(result.error.code, code).toBe(expected);
        expect(JSON.stringify(result.error)).not.toContain("RAW-STORAGE-MESSAGE");
      }
    }
  });

  it("fails closed on invalid UTF-8, invalid JSON and an invalid catalog", async () => {
    const invalidUtf8 = new Uint8Array([0xff, 0xfe, 0xfd]);
    const notJson = encode("{ not json");
    const badCatalog = encode({ frameSizes: [{ id: "s", name: "s", printWidthCm: 21 }] });

    const run = async (bytes: Uint8Array) => {
      const fake = makeFake({ bytes });
      const { port: auth } = authenticatedPort(fake);
      const port = createAdminStateReadPort({ facade: fake, auth });
      return port.load({ correlationId: CID });
    };

    const utf8 = await run(invalidUtf8);
    expect(utf8.ok).toBe(false);
    if (!utf8.ok) expect(utf8.error.code).toBe("INVALID_JSON");

    const json = await run(notJson);
    expect(json.ok).toBe(false);
    if (!json.ok) expect(json.error.code).toBe("INVALID_JSON");

    const catalog = await run(badCatalog);
    expect(catalog.ok).toBe(false);
    if (!catalog.ok) {
      expect(catalog.error.code).toBe("INVALID_CATALOG");
      // only {code, path} pairs travel out — never the offending centimetres
      for (const issue of catalog.error.issues ?? []) {
        expect(Object.keys(issue).sort()).toEqual(["code", "path"]);
      }
      expect(JSON.stringify(catalog.error)).not.toContain("21");
    }
  });

  it("keeps the raw payload out of failure errors", async () => {
    const secret = encode('{"token":"TOKEN-IN-PAYLOAD","b64":"AAAA" ');
    const fake = makeFake({ bytes: secret });
    const { port: auth } = authenticatedPort(fake);
    const port = createAdminStateReadPort({ facade: fake, auth });
    const result = await port.load({ correlationId: CID });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(JSON.stringify(result.error)).not.toContain("TOKEN-IN-PAYLOAD");
  });
});

describe("createAdminStateReadPort — concurrency and timeout", () => {
  it("reuses a single in-flight read for a duplicate call", async () => {
    const reads: AdminReadObjectRequest[] = [];
    const first_gate = deferred<Uint8Array>();
    const second_gate = deferred<Uint8Array>();
    const fake = makeFake({
      readObjectBytes: (request) => {
        reads.push(request);
        return reads.length === 1 ? first_gate.promise : second_gate.promise;
      },
    });
    const { port: auth } = authenticatedPort(fake);
    const port = createAdminStateReadPort({ facade: fake, auth });

    const first = port.load({ correlationId: CID });
    const second = port.load({ correlationId: CID2 });
    expect(reads).toHaveLength(1); // the second click did not start a second request
    first_gate.resolve(encode(OK_CATALOG));
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b); // the same promise, so the same result object

    // once settled, a later manual retry is allowed to start a new request
    const third = port.load({ correlationId: CID });
    expect(reads).toHaveLength(2);
    second_gate.resolve(encode(OK_CATALOG));
    await third;
  });

  it("times out at exactly 30,000 ms and not at 29,999 ms", async () => {
    vi.useFakeTimers();
    const fake = makeFake({ readObjectBytes: () => new Promise<Uint8Array>(() => {}) });
    const { port: auth } = authenticatedPort(fake);
    // the PUBLIC factory always uses the contract constant; this drives the internal seam with
    // exactly that value so the assertion is about the real number, not an injected one
    const port = createAdminStateReadPortWithTimeout(
      { facade: fake, auth },
      ADMIN_STATE_READ_TIMEOUT_MS,
    );

    let settled = false;
    const pending = port.load({ correlationId: CID }).then((r) => {
      settled = true;
      return r;
    });

    await vi.advanceTimersByTimeAsync(29_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_TIMEOUT");
      expect(result.error.retryable).toBe(true);
    }
  });

  it("discards a late success that arrives after the timeout", async () => {
    vi.useFakeTimers();
    const gate = deferred<Uint8Array>();
    const fake = makeFake({ readObjectBytes: () => gate.promise });
    const { port: auth } = authenticatedPort(fake);
    const port = createAdminStateReadPortWithTimeout(
      { facade: fake, auth },
      ADMIN_STATE_READ_TIMEOUT_MS,
    );

    const pending = port.load({ correlationId: CID });
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await pending;
    expect(result.ok).toBe(false);

    // the SDK call was never cancelled — it simply finishes into the void
    gate.resolve(encode(OK_CATALOG));
    await vi.advanceTimersByTimeAsync(1_000);
    const again = await pending;
    expect(again).toBe(result);
    if (!again.ok) expect(again.error.code).toBe("NETWORK_TIMEOUT");
  });
});

// --- CORRECTION_REQUIRED round 1 --------------------------------------------

describe("createOperatorAuthPort — observer/init failures fail closed", () => {
  it("leaves `initializing` when the observer reports an error, with a safe code", () => {
    const fake = makeFake();
    const port = createOperatorAuthPort(fake);
    const seen: OperatorAuthState[] = [];
    port.subscribe((s) => seen.push(s));
    expect(port.currentOperator()).toEqual({ status: "initializing" });

    fake.emitError({ code: "auth/network-request-failed", message: "RAW-OBSERVER-MESSAGE" });
    expect(port.currentOperator()).toEqual({ status: "error", code: "NETWORK_UNAVAILABLE" });
    expect(JSON.stringify(seen)).not.toContain("RAW-OBSERVER-MESSAGE");
  });

  it("folds an unmapped observer error into the UNKNOWN code", () => {
    const fake = makeFake();
    const port = createOperatorAuthPort(fake);
    port.subscribe(() => {});
    fake.emitError(new Error("adapter could not be built"));
    expect(port.currentOperator()).toEqual({
      status: "error",
      code: "UNEXPECTED_ADMIN_READ_ERROR",
    });
  });

  it("refuses a read while the auth observer is in an error state", async () => {
    const fake = makeFake();
    const port = createOperatorAuthPort(fake);
    port.subscribe(() => {});
    fake.emitError({ code: "auth/network-request-failed" });
    const read = createAdminStateReadPort({ facade: fake, auth: port });
    const result = await read.load({ correlationId: CID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("AUTH_REQUIRED");
    expect(fake.reads).toHaveLength(0);
  });

  it("reports nothing once unsubscribed", () => {
    const fake = makeFake();
    const port = createOperatorAuthPort(fake);
    const seen: OperatorAuthState[] = [];
    const unsubscribe = port.subscribe((s) => seen.push(s));
    const before = seen.length;
    unsubscribe();
    fake.emitError({ code: "auth/network-request-failed" });
    fake.emit({ isAnonymous: false });
    expect(seen).toHaveLength(before);
    expect(fake.observerCount()).toBe(0);
  });
});

describe("createAdminStateReadPort — the timeout is not negotiable", () => {
  it("ignores any timeout the caller tries to inject", async () => {
    vi.useFakeTimers();
    const fake = makeFake({ readObjectBytes: () => new Promise<Uint8Array>(() => {}) });
    const { port: auth } = authenticatedPort(fake);
    // a runtime override attempt: the public factory reads no such field
    const port = createAdminStateReadPort({ facade: fake, auth, timeoutMs: 5 } as never);
    let settled = false;
    const pending = port.load({ correlationId: CID }).then((r) => {
      settled = true;
      return r;
    });
    await vi.advanceTimersByTimeAsync(29_999);
    expect(settled).toBe(false); // an injected 5 ms would have fired long ago
    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NETWORK_TIMEOUT");
  });

  it("does not expose a timeout override on the public surface", async () => {
    const surface = await import("./index");
    expect(Object.keys(surface)).not.toContain("createAdminStateReadPortWithTimeout");
  });
});
