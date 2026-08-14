// Deterministic synthetic verification for the write path (spec 037 §7.5 B, §11).
//
// Everything here is driven by an injected fake: no Firebase SDK, no network, no emulator.
// These tests prove call order, branch selection and error mapping. They prove NOTHING about the
// server's rules or its atomicity — that is the emulator gate's job, and neither layer borrows the
// other's conclusion.

import { readFileSync } from "node:fs";
import { readLegacyCatalog } from "@denn/shared";
import { describe, expect, it } from "vitest";
import type { AdminStateReadPort, OperatorAuthPort, OperatorAuthState } from "../admin-read/types";
import { HEAD_SCHEMA_VERSION, REBUILD_OBJECT_MAX_BYTES } from "./constants";
import type { AdminWriteFacade } from "./facade";
import { isValidExpectedBase, isValidPersistedRevision, validateHead } from "./head";
import type { AdminStateHead } from "./types";
import { createAdminStateWritePort } from "./write-port";

const CID = "abcdef01";
const UUID_A = "11111111-2222-3333-4444-555555555555";
const UUID_B = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const REC_A = `${UUID_A}.json`;
const REC_B = `${UUID_B}.json`;
const PATH_A = `rebuild-admin-state/objects/${UUID_A}.json`;

const CATALOG = { version: 1, items: [] } as unknown as Parameters<
  ReturnType<typeof createAdminStateWritePort>["save"]
>[0]["catalog"];

function headDoc(revision: number, recId: string): AdminStateHead {
  return { schemaVersion: HEAD_SCHEMA_VERSION, revision, recId };
}

function sdkError(code: string): Error {
  const error = new Error("raw-sdk-message-SECRET");
  (error as Error & { code?: string }).code = code;
  return error;
}

interface FakeOptions {
  readonly authState?: OperatorAuthState;
  readonly uuids?: readonly string[];
  readonly upload?: () => Promise<void>;
  readonly claim?: () => Promise<void>;
  /** Number of times the fake SDK re-runs the transaction callback before settling. */
  readonly callbackRuns?: number;
  readonly headSequence?: readonly (unknown | null)[];
  readonly transactionError?: unknown;
  readonly getHeadError?: unknown;
  readonly legacyResult?: Awaited<ReturnType<AdminStateReadPort["load"]>>;
  readonly readObjectBytes?: () => Promise<Uint8Array>;
}

function createHarness(options: FakeOptions = {}) {
  const calls: string[] = [];
  const uuids = [...(options.uuids ?? [UUID_A, UUID_B])];
  let uuidIndex = 0;
  const headSequence = [...(options.headSequence ?? [null])];
  let headIndex = 0;
  let written: AdminStateHead | null = null;
  let uploaded: string | null = null;

  const nextHead = (): unknown | null => {
    const value = headSequence[Math.min(headIndex, headSequence.length - 1)];
    headIndex += 1;
    return value ?? null;
  };

  const facade: AdminWriteFacade = {
    randomOperationId: () => {
      calls.push("randomOperationId");
      const value = uuids[Math.min(uuidIndex, uuids.length - 1)] ?? UUID_A;
      uuidIndex += 1;
      return value;
    },
    createObjectClaim: async () => {
      calls.push("createObjectClaim");
      if (options.claim) await options.claim();
    },
    uploadJsonObject: async (request) => {
      calls.push("uploadJsonObject");
      uploaded = request.json;
      if (options.upload) await options.upload();
    },
    readObjectBytes: async () => {
      calls.push("readObjectBytes");
      if (options.readObjectBytes) return options.readObjectBytes();
      return new TextEncoder().encode("{}");
    },
    getHead: async () => {
      calls.push("getHead");
      if (options.getHeadError !== undefined) throw options.getHeadError;
      return nextHead();
    },
    runHeadTransaction: async (compute) => {
      calls.push("runHeadTransaction");
      // The SDK is allowed to run the callback more than once; compute must survive that.
      const runs = options.callbackRuns ?? 1;
      let last: AdminStateHead | null = null;
      for (let i = 0; i < runs; i += 1) {
        calls.push("computeCallback");
        last = compute(nextHead());
      }
      if (options.transactionError !== undefined) throw options.transactionError;
      written = last;
    },
  };

  const auth: OperatorAuthPort = {
    subscribe: () => () => undefined,
    currentOperator: () => options.authState ?? { status: "authenticated" },
    signInWithEmailPassword: async () => ({ ok: true, value: { correlationId: CID } }),
    signOut: async () => ({ ok: true, value: { correlationId: CID } }),
  };

  const legacyRead: AdminStateReadPort = {
    load: async () => {
      calls.push("legacyRead.load");
      return (
        options.legacyResult ?? {
          ok: true,
          value: {
            document: CATALOG as never,
            report: {} as never,
            byteLength: 2,
            correlationId: CID,
          },
        }
      );
    },
  };

  return {
    calls,
    port: createAdminStateWritePort({ facade, auth, legacyRead }),
    writtenHead: () => written,
    uploadedJson: () => uploaded,
  };
}

// ── F-8 / §5.7 range validation ────────────────────────────────────────────────────────────────

describe("revision range (§5.7)", () => {
  it("accepts 0 as expectedBase and rejects everything outside the safe non-negative integers", () => {
    expect(isValidExpectedBase(0)).toBe(true);
    expect(isValidExpectedBase(1)).toBe(true);
    expect(isValidExpectedBase(-1)).toBe(false);
    expect(isValidExpectedBase(1.5)).toBe(false);
    expect(isValidExpectedBase(Number.NaN)).toBe(false);
    expect(isValidExpectedBase(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(isValidExpectedBase("0")).toBe(false);
  });

  it("refuses a persisted revision whose increment would leave the safe integers", () => {
    expect(isValidPersistedRevision(1)).toBe(true);
    expect(isValidPersistedRevision(0)).toBe(false);
    // MAX_SAFE_INTEGER + 1 === MAX_SAFE_INTEGER + 2, so a CAS built on it stops discriminating.
    expect(isValidPersistedRevision(Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it("makes an invalid expectedBase fail before any Storage call", async () => {
    const h = createHarness();
    const result = await h.port.save({ correlationId: CID, expectedBase: -1, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_INVALID_INPUT");
    expect(h.calls).toEqual([]); // no uuid, no upload, no transaction
  });
});

// ── head validation ────────────────────────────────────────────────────────────────────────────

describe("head validation (§4.3)", () => {
  it("accepts exactly the three contract keys", () => {
    expect(validateHead(headDoc(3, REC_A)).ok).toBe(true);
  });

  it("refuses a fourth key, a wrong schemaVersion and a malformed recId", () => {
    expect(validateHead({ ...headDoc(3, REC_A), extra: 1 }).ok).toBe(false);
    expect(validateHead({ ...headDoc(3, REC_A), schemaVersion: 2 }).ok).toBe(false);
    expect(validateHead({ ...headDoc(3, "admin/state.json") }).ok).toBe(false);
    expect(validateHead(null).ok).toBe(false);
    expect(validateHead([]).ok).toBe(false);
  });
});

// ── F-9 / §4.3 first create ────────────────────────────────────────────────────────────────────

describe("first head create (§4.3)", () => {
  it("creates revision 1 when there is no head and expectedBase is 0", async () => {
    const h = createHarness({ headSequence: [null] });
    const result = await h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    expect(result).toEqual({ ok: true, value: { revision: 1, objectPath: PATH_A } });
    expect(h.writtenHead()).toEqual(headDoc(1, REC_A));
  });

  it("refuses to start over when there is no head but expectedBase is not 0", async () => {
    // Without this, an editing session based on revision 5 would write revision 1 and push five
    // revisions of history aside.
    const h = createHarness({ headSequence: [null] });
    const result = await h.port.save({ correlationId: CID, expectedBase: 5, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_CONFLICT");
    expect(h.writtenHead()).toBeNull(); // zero head writes
  });
});

// ── F-1 / F-2 / §5.5 callback re-execution ─────────────────────────────────────────────────────

describe("transaction callback re-execution (§5.5)", () => {
  it("runs the callback many times while uploading once and minting one operation id", async () => {
    const h = createHarness({
      callbackRuns: 4,
      headSequence: [headDoc(7, REC_B), headDoc(7, REC_B), headDoc(7, REC_B), headDoc(7, REC_B)],
    });
    const result = await h.port.save({ correlationId: CID, expectedBase: 7, catalog: CATALOG });
    expect(result).toEqual({ ok: true, value: { revision: 8, objectPath: PATH_A } });

    expect(h.calls.filter((c) => c === "computeCallback")).toHaveLength(4);
    expect(h.calls.filter((c) => c === "createObjectClaim")).toHaveLength(1);
    expect(h.calls.filter((c) => c === "uploadJsonObject")).toHaveLength(1);
    expect(h.calls.filter((c) => c === "randomOperationId")).toHaveLength(1);
    expect(h.calls.filter((c) => c === "runHeadTransaction")).toHaveLength(1);
  });

  it("does not re-adopt a new base when the head moves between callback runs", async () => {
    const h = createHarness({
      callbackRuns: 2,
      headSequence: [headDoc(7, REC_B), headDoc(9, REC_B)],
    });
    const result = await h.port.save({ correlationId: CID, expectedBase: 7, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_CONFLICT");
  });

  it("fixes the operation id before the transaction, in contract order", async () => {
    const h = createHarness({ headSequence: [null] });
    await h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    expect(h.calls).toEqual([
      "randomOperationId",
      "createObjectClaim",
      "uploadJsonObject",
      "runHeadTransaction",
      "computeCallback",
    ]);
  });
});

// ── F-3 upload outcomes ────────────────────────────────────────────────────────────────────────

describe("upload outcomes (§6.5)", () => {
  it("never opens a transaction when the upload fails", async () => {
    const h = createHarness({
      upload: () => Promise.reject(sdkError("storage/quota-exceeded")),
    });
    const result = await h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_UPLOAD_FAILED");
    expect(h.calls).not.toContain("runHeadTransaction");
  });

  it("treats an unmapped upload error as an unknown outcome rather than a definite failure", async () => {
    const h = createHarness({
      upload: () => Promise.reject(sdkError("storage/retry-limit-exceeded")),
    });
    const result = await h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WRITE_UPLOAD_OUTCOME_UNKNOWN");
      expect(result.error.retryable).toBe(false); // retrying is how a duplicate object happens
    }
  });
});

describe("G-4 structure A claim", () => {
  it("creates the write-once REC before upload", async () => {
    const h = createHarness({ headSequence: [null] });
    await h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    expect(h.calls.indexOf("createObjectClaim")).toBeLessThan(h.calls.indexOf("uploadJsonObject"));
  });

  it("stops before Storage when REC creation fails definitively", async () => {
    const h = createHarness({ claim: () => Promise.reject(sdkError("already-exists")) });
    const result = await h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_CLAIM_FAILED");
    expect(h.calls).not.toContain("uploadJsonObject");
    expect(h.calls).not.toContain("runHeadTransaction");
  });

  it("does not retry an unknown REC outcome or touch Storage", async () => {
    const h = createHarness({ claim: () => Promise.reject(sdkError("deadline-exceeded")) });
    const result = await h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WRITE_CLAIM_OUTCOME_UNKNOWN");
      expect(result.error.retryable).toBe(false);
    }
    expect(h.calls.filter((call) => call === "createObjectClaim")).toHaveLength(1);
    expect(h.calls).not.toContain("uploadJsonObject");
  });
});

// ── F-4 / §6.6 bounded reconciliation ──────────────────────────────────────────────────────────

describe("reconciliation after an indeterminate transaction (§6.6)", () => {
  const indeterminate = sdkError("deadline-exceeded");

  it("confirms success when the head advanced by one and points at this operation", async () => {
    const h = createHarness({
      headSequence: [headDoc(4, REC_B), headDoc(5, REC_A)],
      transactionError: indeterminate,
    });
    const result = await h.port.save({ correlationId: CID, expectedBase: 4, catalog: CATALOG });
    expect(result).toEqual({ ok: true, value: { revision: 5, objectPath: PATH_A } });
    // exactly one bounded read, no re-upload, no second transaction
    expect(h.calls.filter((c) => c === "getHead")).toHaveLength(1);
    expect(h.calls.filter((c) => c === "uploadJsonObject")).toHaveLength(1);
    expect(h.calls.filter((c) => c === "runHeadTransaction")).toHaveLength(1);
  });

  it("declares a definite conflict when another writer took base+1", async () => {
    const h = createHarness({
      headSequence: [headDoc(4, REC_B), headDoc(5, REC_B)],
      transactionError: indeterminate,
    });
    const result = await h.port.save({ correlationId: CID, expectedBase: 4, catalog: CATALOG });
    expect(result.ok).toBe(false);
    // the head is no longer expectedBase and a revision only advances, so our late commit can
    // never win the CAS — this one really is decided
    if (!result.ok) expect(result.error.code).toBe("WRITE_CONFLICT");
  });

  it("stays undecided when the head is still at the base, because a late commit may still land", async () => {
    const h = createHarness({
      headSequence: [headDoc(4, REC_B), headDoc(4, REC_B)],
      transactionError: indeterminate,
    });
    const result = await h.port.save({ correlationId: CID, expectedBase: 4, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WRITE_COMMIT_OUTCOME_UNKNOWN");
      expect(result.error.retryable).toBe(false);
    }
  });

  it("stays undecided when the head moved beyond base+1", async () => {
    const h = createHarness({
      headSequence: [headDoc(4, REC_B), headDoc(9, REC_B)],
      transactionError: indeterminate,
    });
    const result = await h.port.save({ correlationId: CID, expectedBase: 4, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_COMMIT_OUTCOME_UNKNOWN");
  });

  it("stays undecided when the reconciliation read itself fails", async () => {
    // First getHead (inside the callback) works, the reconciliation read throws.
    const calls: string[] = [];
    let getHeadCount = 0;
    const facade: AdminWriteFacade = {
      randomOperationId: () => UUID_A,
      createObjectClaim: async () => undefined,
      uploadJsonObject: async () => {
        calls.push("upload");
      },
      readObjectBytes: async () => new Uint8Array(),
      getHead: async () => {
        getHeadCount += 1;
        if (getHeadCount > 1) throw sdkError("unavailable");
        return headDoc(4, REC_B);
      },
      runHeadTransaction: async (compute) => {
        compute(await facadeHead());
        throw indeterminate;
      },
    };
    const facadeHead = async () => headDoc(4, REC_B) as unknown;
    const port = createAdminStateWritePort({
      facade,
      auth: {
        subscribe: () => () => undefined,
        currentOperator: () => ({ status: "authenticated" }),
        signInWithEmailPassword: async () => ({ ok: true, value: { correlationId: CID } }),
        signOut: async () => ({ ok: true, value: { correlationId: CID } }),
      },
      legacyRead: { load: async () => ({ ok: false, error: {} as never }) },
    });
    const result = await port.save({ correlationId: CID, expectedBase: 4, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_COMMIT_OUTCOME_UNKNOWN");
  });

  it("does not reconcile when the transaction failed definitively", async () => {
    const h = createHarness({
      headSequence: [headDoc(4, REC_B)],
      transactionError: sdkError("permission-denied"),
    });
    const result = await h.port.save({ correlationId: CID, expectedBase: 4, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_FORBIDDEN");
    // zero reconciliation reads: a definite rejection is already decided, so re-reading the head
    // would only invite a guess
    expect(h.calls.filter((c) => c === "getHead")).toHaveLength(0);
  });
});

// ── F-6 / F-7 error surface ────────────────────────────────────────────────────────────────────

describe("error surface (§5.4)", () => {
  it("blocks an unauthenticated save before any network call", async () => {
    const h = createHarness({ authState: { status: "signed-out" } });
    const result = await h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_AUTH_REQUIRED");
    expect(h.calls).toEqual([]);
  });

  it("keeps every raw detail out of the error envelope", async () => {
    const h = createHarness({ upload: () => Promise.reject(sdkError("storage/unauthorized")) });
    const result = await h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const serialised = JSON.stringify(result.error);
      expect(serialised).not.toContain("SECRET");
      expect(serialised).not.toContain(UUID_A); // no operationId
      expect(serialised).not.toContain("rebuild-admin-state"); // no objectPath
      expect(Object.keys(result.error).sort()).toEqual([
        "category",
        "code",
        "correlationId",
        "retryable",
      ]);
    }
  });

  it("runs one save at a time", async () => {
    const h = createHarness({ headSequence: [null] });
    const first = h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    const second = h.port.save({ correlationId: CID, expectedBase: 0, catalog: CATALOG });
    expect(second).toBe(first); // the second click reuses the running promise
    await first;
    expect(h.calls.filter((c) => c === "uploadJsonObject")).toHaveLength(1);
  });

  it("rejects a malformed correlationId without touching the network", async () => {
    const h = createHarness();
    const result = await h.port.save({
      correlationId: "NOT HEX",
      expectedBase: 0,
      catalog: CATALOG,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_INVALID_INPUT");
    expect(h.calls).toEqual([]);
  });

  it("rejects a payload over the size ceiling before uploading", async () => {
    const h = createHarness();
    const huge = { blob: "x".repeat(REBUILD_OBJECT_MAX_BYTES) } as unknown as typeof CATALOG;
    const result = await h.port.save({ correlationId: CID, expectedBase: 0, catalog: huge });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_INVALID_INPUT");
    expect(h.calls).toEqual([]);
  });
});

// ── F-10 baseline branches ─────────────────────────────────────────────────────────────────────

describe("loadBaseline (§6.1, §6.2)", () => {
  it("returns legacy at revision 0 when there is no head", async () => {
    const h = createHarness({ headSequence: [null] });
    const result = await h.port.loadBaseline({ correlationId: CID });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.revision).toBe(0);
      expect(result.value.source).toBe("legacy");
    }
    expect(h.calls).toContain("legacyRead.load");
    expect(h.calls).not.toContain("readObjectBytes");
  });

  it("preserves the spec 036 read error verbatim when the legacy read fails", async () => {
    const legacyError = {
      category: "VALIDATION",
      code: "ADMIN_STATE_NOT_FOUND",
      retryable: false,
      correlationId: CID,
    } as const;
    const h = createHarness({
      headSequence: [null],
      legacyResult: { ok: false, error: legacyError as never },
    });
    const result = await h.port.loadBaseline({ correlationId: CID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(legacyError); // same object, not remapped
  });

  it("reads only the rebuild object when a head exists, and never falls back to legacy", async () => {
    const h = createHarness({
      headSequence: [headDoc(6, REC_A)],
      readObjectBytes: async () => new TextEncoder().encode("{}"),
    });
    const result = await h.port.loadBaseline({ correlationId: CID });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.revision).toBe(6);
      expect(result.value.source).toBe("rebuild");
    }
    expect(h.calls).toContain("readObjectBytes");
    expect(h.calls).not.toContain("legacyRead.load");
  });

  it("fails closed with the baseline-only code when the head document itself is malformed", async () => {
    const h = createHarness({
      headSequence: [{ schemaVersion: 1, revision: 0, recId: REC_A }],
    });
    const result = await h.port.loadBaseline({ correlationId: CID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REBUILD_BASELINE_INVALID");
    expect(h.calls).not.toContain("legacyRead.load"); // no silent fallback
  });

  it("keeps a missing referenced object on the existing read code, not on a write code", async () => {
    const h = createHarness({
      headSequence: [headDoc(6, REC_A)],
      readObjectBytes: () => Promise.reject(sdkError("storage/object-not-found")),
    });
    const result = await h.port.loadBaseline({ correlationId: CID });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ADMIN_STATE_NOT_FOUND");
      expect(result.error.code.startsWith("WRITE_")).toBe(false);
    }
  });

  it("reports a read timeout as a read timeout, never as an upload outcome", async () => {
    const h = createHarness({ getHeadError: sdkError("deadline-exceeded") });
    const result = await h.port.loadBaseline({ correlationId: CID });
    expect(result.ok).toBe(false);
    // a read changes no state, so calling it "upload outcome unknown" would be untrue
    if (!result.ok) expect(result.error.code).toBe("NETWORK_TIMEOUT");
  });

  it("fails closed on malformed JSON in the referenced object", async () => {
    const h = createHarness({
      headSequence: [headDoc(6, REC_A)],
      readObjectBytes: async () => new TextEncoder().encode("{not json"),
    });
    const result = await h.port.loadBaseline({ correlationId: CID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_JSON");
  });
});

// ── rules equivalence (§7.3) ───────────────────────────────────────────────────────────────────

describe("emulator rules copies (§7.3)", () => {
  const root = new URL("../../../../", import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, root), "utf8").split(/\r?\n/);
  const PLACEHOLDER = "UNCONFIRMED_OPERATOR_UID_REPLACE_BEFORE_DEPLOY";
  const SYNTHETIC = "emulator-operator-DO-NOT-DEPLOY";

  for (const [deployed, emulator] of [
    ["storage.rules", "storage.emulator.rules"],
    ["firestore.rules", "firestore.emulator.rules"],
  ] as const) {
    it(`${emulator} differs from ${deployed} only in the UID constant`, () => {
      const a = read(deployed);
      const b = read(emulator);
      expect(b).toHaveLength(a.length);
      const differing = a.map((line, i) => [line, b[i]] as const).filter(([x, y]) => x !== y);
      // Without this the emulator would be testing something other than the real rules, and the
      // whole "verified against the real rules" claim would be hollow.
      expect(differing.length).toBeGreaterThan(0);
      for (const [targetLine, emulatorLine] of differing) {
        expect(targetLine).toContain(PLACEHOLDER);
        expect(emulatorLine).toContain(SYNTHETIC);
        expect(emulatorLine).toBe(targetLine.replace(PLACEHOLDER, SYNTHETIC));
      }
    });

    it(`${deployed} still carries the UNCONFIRMED placeholder, so it cannot be deployed as-is`, () => {
      expect(read(deployed).join("\n")).toContain(PLACEHOLDER);
      expect(read(deployed).join("\n")).not.toContain(SYNTHETIC);
    });
  }
});

// ── payload validation before any write (correction round 1) ───────────────────────────────────

describe("catalog payload validation (§5.4, correction round 1)", () => {
  it("refuses a payload the read authority rejects, before minting an id or uploading", async () => {
    const h = createHarness();
    // schemaVersion 2 is an UNSUPPORTED_SCHEMA_VERSION fatal for readLegacyCatalog.
    const bad = {
      schemaVersion: 2,
      migratedFrom: "legacy-v0",
      data: {},
    } as unknown as typeof CATALOG;
    const result = await h.port.save({ correlationId: CID, expectedBase: 0, catalog: bad });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_INVALID_INPUT");
    // an immutable object is permanent, so an unreadable one must never be created at all
    expect(h.calls).toEqual([]);
  });

  it("refuses a circular payload without minting an id or uploading", async () => {
    const h = createHarness();
    const circular: Record<string, unknown> = { frameSizes: [] };
    circular.self = circular;
    const result = await h.port.save({
      correlationId: CID,
      expectedBase: 0,
      catalog: circular as unknown as typeof CATALOG,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_INVALID_INPUT");
    expect(h.calls).toEqual([]);
  });

  it("uploads the VALIDATED document rather than the caller's object", async () => {
    const h = createHarness({ headSequence: [null] });
    const raw = {
      frameSizes: [{ id: "s", name: "s", aspect: 1.41 }],
    } as unknown as typeof CATALOG;
    const result = await h.port.save({ correlationId: CID, expectedBase: 0, catalog: raw });
    expect(result.ok).toBe(true);

    const json = h.uploadedJson();
    expect(json).not.toBeNull();
    const parsed = JSON.parse(json as string);
    // the validated V1 wrapper, not the raw legacy input that was handed in
    expect(parsed.schemaVersion).toBe(1);
    expect(Object.hasOwn(parsed, "data")).toBe(true);
    // and it round-trips through the same authority
    expect(readLegacyCatalog(parsed).ok).toBe(true);
  });
});
