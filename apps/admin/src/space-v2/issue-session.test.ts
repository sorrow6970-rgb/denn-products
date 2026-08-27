// Unit contract for the local space V2 admin issue session (spec 081 §검증 절차).
//
// Everything is synthetic and injected: a synthetic catalog, synthetic PNG header bytes, a
// synthetic password, a fixed UUID sequence and a fake write port. No real token, no network, no
// Firebase, no UI, no clock and no global randomness. The Firebase entry points are mocked purely
// so the "nothing imports the SDK" assertion has something to observe.

import { beforeEach, describe, expect, it, vi } from "vitest";

const sdkImports = vi.hoisted(() => [] as string[]);
vi.mock("firebase/app", () => {
  sdkImports.push("firebase/app");
  return {};
});
vi.mock("firebase/auth", () => {
  sdkImports.push("firebase/auth");
  return {};
});
vi.mock("firebase/firestore", () => {
  sdkImports.push("firebase/firestore");
  return {};
});
vi.mock("firebase/storage", () => {
  sdkImports.push("firebase/storage");
  return {};
});

import type {
  SafeSpaceV2IssueError,
  SpaceV2IssueErrorCategory,
  SpaceV2IssueErrorCode,
  SpaceV2IssueRequest,
  SpaceV2IssueResult,
  SpaceV2IssueWritePort,
} from "@denn/firebase/space-write";
import type { CatalogDocumentV1 } from "@denn/shared";
import type { SpaceCryptoPort, SpaceSha256Port } from "@denn/spaces";
import {
  createSpaceV2IssueSession,
  type SpaceV2FrozenIssueDraftSource,
  type SpaceV2FrozenIssueFields,
  type SpaceV2IssueSessionSnapshot,
} from "./issue-session";
import type { SpaceV2IssueUuidPort } from "./issue-token-candidate";

/** Captured before any test body runs: importing the module must pull in no Firebase SDK. */
const SDK_IMPORTS_AT_IMPORT = [...sdkImports];

// --- fixtures ----------------------------------------------------------------

const ASSET_ID = "0f9c1b2a-4d3e-4f5a-9b6c-7d8e9f0a1b2c";
const TOKEN = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const OBJECT_PATH = `rebuild-space-assets/objects/${ASSET_ID}.png`;
const CORRELATION_ID = "00c0ffee";
const PASSWORD = "PRIVATE_PASSWORD_MARKER";

const be32 = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

/** 33-byte PNG header candidate: signature + IHDR(13) + placeholder CRC. */
const pngHeader = (width = 1200, height = 1680): Uint8Array =>
  Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...be32(13),
    0x49,
    0x48,
    0x44,
    0x52,
    ...be32(width),
    ...be32(height),
    8,
    6,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);

const doc = (data: Record<string, unknown>): CatalogDocumentV1 =>
  ({ schemaVersion: 1, migratedFrom: "legacy-v0", data }) as unknown as CatalogDocumentV1;

const SIZE = { id: "s1", name: "사이즈", aspect: 1.4, frameThickness: 4 };
const TEMPLATE = { id: "ft1", name: "템플릿", type: "uploaded", clockEnabled: false };
const catalogSource = () => doc({ frameSizes: [SIZE], frameTemplates: [TEMPLATE] });

const fields = (over: Partial<SpaceV2FrozenIssueFields> = {}): SpaceV2FrozenIssueFields => ({
  catalog: catalogSource(),
  selection: { frameSizeId: "s1", templateId: "ft1" },
  frameOrientation: "portrait",
  logicalWidth: 1000,
  frameColor: "#191A1D",
  transform: { scale: 1.25, x: 0.5, y: -0.25, rotationQuarterTurns: 0 },
  ...over,
});

const webCryptoSha256: SpaceSha256Port = {
  async digest(bytes) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
    return new Uint8Array(digest);
  },
};

const b64 = (bytes: number[]): string => btoa(String.fromCharCode(...bytes));
const ENVELOPE = {
  salt: b64(new Array(16).fill(0x11)),
  iv: b64(new Array(12).fill(0x22)),
  ct: b64(new Array(48).fill(0x33)),
};

/**
 * The canonical metadata the spec 074 port issues each code with. Stated here as a fixture, so a
 * test can build an envelope that is genuinely well formed — and, by flipping one field, one that
 * is not.
 */
const CANONICAL_ISSUE_METADATA = {
  SPACE_V2_ISSUE_INVALID_INPUT: { category: "VALIDATION", retryable: false },
  SPACE_V2_ISSUE_AUTH_REQUIRED: { category: "AUTH", retryable: true },
  SPACE_V2_ISSUE_FORBIDDEN: { category: "AUTH", retryable: false },
  SPACE_V2_ISSUE_UPLOAD_FAILED: { category: "NETWORK", retryable: true },
  SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN: { category: "NETWORK", retryable: false },
  SPACE_V2_ISSUE_DOCUMENT_FAILED: { category: "VALIDATION", retryable: false },
  SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN: { category: "UNKNOWN", retryable: false },
  SPACE_V2_ISSUE_ASSET_MISMATCH: { category: "VALIDATION", retryable: false },
} as const satisfies Record<
  SpaceV2IssueErrorCode,
  { readonly category: SpaceV2IssueErrorCategory; readonly retryable: boolean }
>;

const ALL_ISSUE_CODES = Object.keys(CANONICAL_ISSUE_METADATA) as SpaceV2IssueErrorCode[];

/** The two codes whose meaning is "the remote outcome is not known", not "it failed". */
const OUTCOME_UNKNOWN_TEST_CODES: ReadonlySet<SpaceV2IssueErrorCode> = new Set([
  "SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN",
  "SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN",
]);

/** A well-formed failure for this attempt: the code with the metadata it is really issued with. */
const issueError = (code: SpaceV2IssueErrorCode): SafeSpaceV2IssueError => ({
  category: CANONICAL_ISSUE_METADATA[code].category,
  code,
  retryable: CANONICAL_ISSUE_METADATA[code].retryable,
  correlationId: CORRELATION_ID,
});

interface HarnessOptions {
  readonly exportProofPng?: () => Promise<Uint8Array>;
  readonly writerResult?: () => Promise<SpaceV2IssueResult>;
  readonly createCorrelationId?: () => string;
  readonly uuidValues?: unknown[];
  readonly source?: unknown;
  readonly fieldValues?: SpaceV2FrozenIssueFields;
  /** Fires on each SHA-256 call, so a test can act while the bundle is mid-flight. */
  readonly onSha?: (call: number) => void;
}

function harness(options: HarnessOptions = {}) {
  const order: string[] = [];
  const exports_: number[] = [];
  const uuidCalls: number[] = [];
  const shaCalls: Uint8Array[] = [];
  const cryptoCalls: { value: unknown; password: string }[] = [];
  const writerCalls: SpaceV2IssueRequest[] = [];
  const uuidValues = options.uuidValues ?? [ASSET_ID, TOKEN];
  const mutable = options.fieldValues ?? fields();

  const uuid: SpaceV2IssueUuidPort = {
    randomUUID: () => {
      order.push(`uuid#${uuidCalls.length + 1}`);
      uuidCalls.push(uuidCalls.length + 1);
      return uuidValues[uuidCalls.length - 1] as string;
    },
  };
  const sha256: SpaceSha256Port = {
    digest: async (bytes) => {
      order.push("sha");
      shaCalls.push(Uint8Array.from(bytes));
      options.onSha?.(shaCalls.length);
      return webCryptoSha256.digest(bytes);
    },
  };
  const crypto = {
    encryptJson: async (value: unknown, password: string) => {
      order.push("encrypt");
      cryptoCalls.push({ value, password });
      return { ok: true as const, value: { ...ENVELOPE } };
    },
    decryptJson: vi.fn(),
  } as unknown as SpaceCryptoPort;

  const writer: SpaceV2IssueWritePort = {
    issue: async (request) => {
      order.push("write");
      writerCalls.push(request);
      return (
        options.writerResult?.() ??
        Promise.resolve({ ok: true as const, value: { token: TOKEN, objectPath: OBJECT_PATH } })
      );
    },
  };

  const defaultSource: SpaceV2FrozenIssueDraftSource = {
    copyFields: () => {
      order.push("fields");
      return mutable;
    },
    exportProofPng: async () => {
      order.push("export");
      exports_.push(exports_.length + 1);
      return options.exportProofPng?.() ?? pngHeader();
    },
  };

  const snapshots: SpaceV2IssueSessionSnapshot[] = [];
  const session = createSpaceV2IssueSession({
    uuid,
    crypto,
    sha256,
    writer,
    createCorrelationId: options.createCorrelationId ?? (() => CORRELATION_ID),
  });
  session.subscribe((next) => snapshots.push(next));

  return {
    order,
    exports: exports_,
    uuidCalls,
    shaCalls,
    cryptoCalls,
    writerCalls,
    snapshots,
    session,
    mutable,
    source: (options.source ?? defaultSource) as SpaceV2FrozenIssueDraftSource,
  };
}

const good = () => ({ password: PASSWORD, confirmation: PASSWORD });

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}

/** A promise whose settlement the test controls, without tripping TS's `never` narrowing. */
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** No exporter, identity, hash, encryption or write happened at all. */
function expectNothingSpent(h: ReturnType<typeof harness>): void {
  expect(h.exports).toEqual([]);
  expect(h.uuidCalls).toEqual([]);
  expect(h.shaCalls).toEqual([]);
  expect(h.cryptoCalls).toEqual([]);
  expect(h.writerCalls).toEqual([]);
}

beforeEach(() => {
  sdkImports.length = 0;
});

// --- 1. exact success order ---------------------------------------------------

describe("space V2 issue session — success", () => {
  it("freezes once, then exports, prepares and writes exactly once each in order", async () => {
    const h = harness();
    h.session.beginDraft(h.source);
    expect(h.session.getSnapshot()).toEqual({
      status: "draft-ready",
      canIssue: true,
      errorCode: null,
      confirmedToken: null,
    });

    await h.session.issue(good());

    expect(h.order).toEqual([
      "fields",
      "export",
      "uuid#1",
      "uuid#2",
      "sha",
      "sha",
      "sha",
      "encrypt",
      "write",
    ]);
    expect(h.exports).toEqual([1]);
    expect(h.writerCalls).toHaveLength(1);
    expect(h.session.getSnapshot()).toEqual({
      status: "success",
      canIssue: false,
      errorCode: null,
      confirmedToken: TOKEN,
    });
  });

  it("passes the writer a correlation id and the prepared bundle, and nothing else", async () => {
    const h = harness();
    h.session.beginDraft(h.source);
    await h.session.issue(good());

    const request = h.writerCalls[0];
    expect(request).toBeDefined();
    if (!request) throw new Error("expected a write request");
    expect(Object.keys(request).sort()).toEqual(["bundle", "correlationId"]);
    expect(request.correlationId).toBe(CORRELATION_ID);
    expect(request.bundle.token).toBe(TOKEN);
    expect(request.bundle.copyProofDescriptor().objectPath).toBe(OBJECT_PATH);
  });

  it("keeps the object path out of the public snapshot and builds no URL", async () => {
    const h = harness();
    h.session.beginDraft(h.source);
    await h.session.issue(good());

    const serialized = JSON.stringify(h.snapshots);
    expect(serialized).not.toContain(OBJECT_PATH);
    expect(serialized).not.toContain("rebuild-space-assets");
    expect(serialized).not.toContain("https://");
    expect(Object.keys(h.session.getSnapshot()).sort()).toEqual([
      "canIssue",
      "confirmedToken",
      "errorCode",
      "status",
    ]);
  });

  it("moves through preparing and issuing before success", async () => {
    const h = harness();
    h.session.beginDraft(h.source);
    await h.session.issue(good());
    expect(h.snapshots.map((snapshot) => snapshot.status)).toEqual([
      "draft-ready",
      "preparing",
      "issuing",
      "success",
    ]);
  });
});

// --- 2. draft source validation ----------------------------------------------

describe("space V2 issue session — draft source", () => {
  const hostileSources: [string, unknown][] = [
    ["null", null],
    ["a primitive", "source"],
    ["an array", []],
    ["a missing method", { copyFields: () => fields() }],
    [
      "an extra key",
      { copyFields: () => fields(), exportProofPng: async () => pngHeader(), extra: 1 },
    ],
    ["a non-callable method", { copyFields: () => fields(), exportProofPng: "nope" }],
  ];

  for (const [label, source] of hostileSources) {
    it(`refuses ${label} without spending anything`, async () => {
      const h = harness();
      h.session.beginDraft(source as SpaceV2FrozenIssueDraftSource);
      expect(h.session.getSnapshot()).toEqual({
        status: "error",
        canIssue: false,
        errorCode: "SPACE_V2_SESSION_INVALID_DRAFT",
        confirmedToken: null,
      });
      await h.session.issue(good());
      expectNothingSpent(h);
    });
  }

  it("refuses a non-enumerable method", async () => {
    const h = harness();
    const hidden = { copyFields: () => fields() };
    Object.defineProperty(hidden, "exportProofPng", {
      value: async () => pngHeader(),
      enumerable: false,
    });
    h.session.beginDraft(hidden as SpaceV2FrozenIssueDraftSource);
    expect(h.session.getSnapshot().errorCode).toBe("SPACE_V2_SESSION_INVALID_DRAFT");
    expectNothingSpent(h);
  });

  it("refuses a throwing copyFields and never reaches the exporter", async () => {
    const h = harness();
    let exported = 0;
    h.session.beginDraft({
      copyFields: () => {
        throw new Error("PRIVATE_SOURCE_MARKER");
      },
      exportProofPng: async () => {
        exported += 1;
        return pngHeader();
      },
    });
    expect(h.session.getSnapshot().errorCode).toBe("SPACE_V2_SESSION_INVALID_DRAFT");
    expect(JSON.stringify(h.snapshots)).not.toContain("PRIVATE_SOURCE_MARKER");
    await h.session.issue(good());
    expect(exported).toBe(0);
    expectNothingSpent(h);
  });

  const badFields: [string, unknown][] = [
    ["a missing key", { catalog: catalogSource(), selection: {} }],
    ["an extra key", { ...fields(), assetId: ASSET_ID }],
    ["a non-object", "fields"],
    ["a value the evidence contract rejects", { ...fields(), frameColor: () => "#191A1D" }],
  ];

  for (const [label, value] of badFields) {
    it(`refuses frozen fields with ${label}`, async () => {
      const h = harness();
      h.session.beginDraft({
        copyFields: () => value as SpaceV2FrozenIssueFields,
        exportProofPng: async () => pngHeader(),
      });
      expect(h.session.getSnapshot().errorCode).toBe("SPACE_V2_SESSION_INVALID_DRAFT");
      await h.session.issue(good());
      expectNothingSpent(h);
    });
  }

  it("calls copyFields exactly once, at freeze time", async () => {
    const h = harness();
    h.session.beginDraft(h.source);
    await h.session.issue(good());
    expect(h.order.filter((step) => step === "fields")).toEqual(["fields"]);
  });
});

// --- 3. password ---------------------------------------------------------------

describe("space V2 issue session — password", () => {
  const badRequests: [string, unknown][] = [
    ["an empty password", { password: "", confirmation: "" }],
    ["a mismatch", { password: PASSWORD, confirmation: `${PASSWORD}!` }],
    ["a whitespace-only difference", { password: PASSWORD, confirmation: ` ${PASSWORD}` }],
    ["a non-string password", { password: 1, confirmation: 1 }],
    ["a missing key", { password: PASSWORD }],
    ["an extra key", { password: PASSWORD, confirmation: PASSWORD, hint: "x" }],
    ["a non-object", "password"],
  ];

  for (const [label, request] of badRequests) {
    it(`refuses ${label} before the exporter runs`, async () => {
      const h = harness();
      h.session.beginDraft(h.source);
      await h.session.issue(request as { password: string; confirmation: string });

      expect(h.session.getSnapshot()).toEqual({
        status: "error",
        canIssue: false,
        errorCode: "SPACE_V2_SESSION_PASSWORD_MISMATCH",
        confirmedToken: null,
      });
      expectNothingSpent(h);
    });
  }

  it("never puts the password in a snapshot", async () => {
    const h = harness();
    h.session.beginDraft(h.source);
    await h.session.issue({ password: PASSWORD, confirmation: `${PASSWORD}!` });
    await h.session.issue(good());
    expect(JSON.stringify(h.snapshots)).not.toContain(PASSWORD);
    expect(JSON.stringify(h.session.getSnapshot())).not.toContain(PASSWORD);
  });

  it("requires a fresh frozen draft after a refused password", async () => {
    const h = harness();
    h.session.beginDraft(h.source);
    await h.session.issue({ password: PASSWORD, confirmation: "other" });
    // A second attempt on the stale draft does nothing at all.
    await h.session.issue(good());
    expectNothingSpent(h);

    h.session.beginDraft(h.source);
    await h.session.issue(good());
    expect(h.session.getSnapshot().status).toBe("success");
  });
});

// --- 4 & 5. frozen values ------------------------------------------------------

describe("space V2 issue session — frozen values", () => {
  it("ignores catalog, selection and transform mutation after beginDraft", async () => {
    const mutable = fields();
    const h = harness({ fieldValues: mutable });
    h.session.beginDraft(h.source);

    // Everything the caller can still reach is changed after the freeze.
    (mutable.transform as { scale: number }).scale = 99;
    (mutable.selection as { frameSizeId: string }).frameSizeId = "NOT_A_SIZE";
    (mutable as { frameColor: string }).frameColor = "#FFFFFF";
    (mutable as { logicalWidth: number }).logicalWidth = 1;
    (mutable.catalog.data.frameSizes as unknown as { aspect: number }[])[0].aspect = 9;

    await h.session.issue(good());

    expect(h.session.getSnapshot().status).toBe("success");
    const scene = h.cryptoCalls[0]?.value as { frameEvidence: Record<string, unknown> };
    expect(scene.frameEvidence).toMatchObject({
      logicalWidth: 1000,
      frameColor: "#191A1D",
      transform: { scale: 1.25, x: 0.5, y: -0.25, rotationQuarterTurns: 0 },
    });
    expect((scene.frameEvidence.geometry as { aspect: number }).aspect).toBe(1.4);
  });

  it("ignores a swapped exporter after beginDraft", async () => {
    let original = 0;
    let swapped = 0;
    const source = {
      copyFields: () => fields(),
      exportProofPng: async () => {
        original += 1;
        return pngHeader();
      },
    };
    const h = harness({ source });
    h.session.beginDraft(source as SpaceV2FrozenIssueDraftSource);
    source.exportProofPng = async () => {
      swapped += 1;
      return pngHeader(2, 2);
    };

    await h.session.issue(good());
    expect(original).toBe(1);
    expect(swapped).toBe(0);
  });

  it("copies the exported bytes the moment they arrive", async () => {
    const live = pngHeader();
    const h = harness({
      // The exporter hands out its own live buffer and keeps scribbling on it while the bundle is
      // still being hashed and encrypted.
      exportProofPng: async () => live,
      onSha: (call) => {
        if (call === 1) {
          live[0] = 0;
          live[1] = 0;
        }
      },
    });
    h.session.beginDraft(h.source);
    await h.session.issue(good());

    expect(h.session.getSnapshot().status).toBe("success");
    const uploaded = h.writerCalls[0]?.bundle.copyUploadBytes();
    expect(uploaded?.[0]).toBe(0x89);
    expect(uploaded?.[1]).toBe(0x50);

    // And it stays detached after the issue finished.
    live[2] = 0;
    expect(h.writerCalls[0]?.bundle.copyUploadBytes()[2]).toBe(0x4e);
  });
});

// --- 6 & 7. proof and preparation failures -------------------------------------

describe("space V2 issue session — local failures", () => {
  const proofFailures: [string, () => Promise<Uint8Array>][] = [
    [
      "a throwing exporter",
      () => {
        throw new Error("PRIVATE_EXPORT_MARKER");
      },
    ],
    ["a rejecting exporter", () => Promise.reject(new Error("PRIVATE_EXPORT_MARKER"))],
    ["a non-Uint8Array result", () => Promise.resolve("bytes" as unknown as Uint8Array)],
    ["an ArrayBuffer result", () => Promise.resolve(new ArrayBuffer(8) as unknown as Uint8Array)],
  ];

  for (const [label, exportProofPng] of proofFailures) {
    it(`stops at ${label} with no identity, hash, encryption or write`, async () => {
      const h = harness({ exportProofPng });
      h.session.beginDraft(h.source);
      await h.session.issue(good());

      expect(h.session.getSnapshot()).toEqual({
        status: "error",
        canIssue: false,
        errorCode: "SPACE_V2_SESSION_PROOF_FAILED",
        confirmedToken: null,
      });
      expect(h.exports).toEqual([1]);
      expect(h.uuidCalls).toEqual([]);
      expect(h.shaCalls).toEqual([]);
      expect(h.cryptoCalls).toEqual([]);
      expect(h.writerCalls).toEqual([]);
      expect(JSON.stringify(h.snapshots)).not.toContain("PRIVATE_EXPORT_MARKER");
    });
  }

  it("stops at a preparation failure without writing or leaking the child code", async () => {
    // A refused identity: the UUID source hands back something that is not a UUID v4.
    const h = harness({ uuidValues: ["not-a-uuid", TOKEN] });
    h.session.beginDraft(h.source);
    await h.session.issue(good());

    expect(h.session.getSnapshot()).toEqual({
      status: "error",
      canIssue: false,
      errorCode: "SPACE_V2_SESSION_PREPARATION_FAILED",
      confirmedToken: null,
    });
    expect(h.writerCalls).toEqual([]);
    const serialized = JSON.stringify(h.snapshots);
    for (const secret of ["not-a-uuid", ASSET_ID, TOKEN, OBJECT_PATH, "SPACE_V2_BUNDLE_"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("stops before the writer when the correlation id cannot be produced", async () => {
    const h = harness({
      createCorrelationId: () => {
        throw new Error("PRIVATE_CORRELATION_MARKER");
      },
    });
    h.session.beginDraft(h.source);
    await h.session.issue(good());

    expect(h.session.getSnapshot().errorCode).toBe("SPACE_V2_SESSION_PREPARATION_FAILED");
    expect(h.writerCalls).toEqual([]);
    expect(JSON.stringify(h.snapshots)).not.toContain("PRIVATE_CORRELATION_MARKER");
  });
});

// --- 8, 9 & 10. writer outcomes -------------------------------------------------

describe("space V2 issue session — writer outcomes", () => {
  const definiteFailures: SpaceV2IssueErrorCode[] = [
    "SPACE_V2_ISSUE_INVALID_INPUT",
    "SPACE_V2_ISSUE_AUTH_REQUIRED",
    "SPACE_V2_ISSUE_FORBIDDEN",
    "SPACE_V2_ISSUE_UPLOAD_FAILED",
    "SPACE_V2_ISSUE_DOCUMENT_FAILED",
    "SPACE_V2_ISSUE_ASSET_MISMATCH",
  ];

  for (const code of definiteFailures) {
    it(`preserves the exact safe code ${code}`, async () => {
      const h = harness({
        writerResult: async () => ({ ok: false, error: issueError(code) }),
      });
      h.session.beginDraft(h.source);
      await h.session.issue(good());

      expect(h.session.getSnapshot()).toEqual({
        status: "error",
        canIssue: false,
        errorCode: code,
        confirmedToken: null,
      });
      // Whatever `retryable` the port reports, it is not a licence to retry here.
      await h.session.issue(good());
      expect(h.writerCalls).toHaveLength(1);
      expect(h.exports).toEqual([1]);
    });
  }

  const unknownCodes: SpaceV2IssueErrorCode[] = [
    "SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN",
    "SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN",
  ];

  for (const code of unknownCodes) {
    it(`reports ${code} as its own status and never guesses`, async () => {
      const h = harness({
        writerResult: async () => ({ ok: false, error: issueError(code) }),
      });
      h.session.beginDraft(h.source);
      await h.session.issue(good());

      expect(h.session.getSnapshot()).toEqual({
        status: "outcome-unknown",
        canIssue: false,
        errorCode: code,
        confirmedToken: null,
      });
      // No automatic retry and no automatic replacement token.
      await h.session.issue(good());
      expect(h.writerCalls).toHaveLength(1);
      expect(h.uuidCalls).toEqual([1, 2]);
    });
  }

  it("treats a throwing writer as outcome-unknown, not a failure", async () => {
    const h = harness({
      writerResult: async () => {
        throw new Error("PRIVATE_WRITER_MARKER");
      },
    });
    h.session.beginDraft(h.source);
    await h.session.issue(good());

    expect(h.session.getSnapshot()).toEqual({
      status: "outcome-unknown",
      canIssue: false,
      errorCode: null,
      confirmedToken: null,
    });
    expect(JSON.stringify(h.snapshots)).not.toContain("PRIVATE_WRITER_MARKER");
  });

  it("treats a malformed writer result as outcome-unknown", async () => {
    const h = harness({
      writerResult: async () => ({ ok: "yes" }) as unknown as SpaceV2IssueResult,
    });
    h.session.beginDraft(h.source);
    await h.session.issue(good());
    expect(h.session.getSnapshot().status).toBe("outcome-unknown");
  });

  it("refuses a success without a usable token", async () => {
    const h = harness({
      writerResult: async () =>
        ({ ok: true, value: { token: "", objectPath: OBJECT_PATH } }) as SpaceV2IssueResult,
    });
    h.session.beginDraft(h.source);
    await h.session.issue(good());
    expect(h.session.getSnapshot()).toEqual({
      status: "outcome-unknown",
      canIssue: false,
      errorCode: null,
      confirmedToken: null,
    });
  });
});

// --- 11. concurrency and lifecycle ---------------------------------------------

describe("space V2 issue session — concurrency and lifecycle", () => {
  it("runs one issue at a time however many times it is called", async () => {
    const h = harness();
    h.session.beginDraft(h.source);
    await Promise.all([h.session.issue(good()), h.session.issue(good()), h.session.issue(good())]);

    expect(h.exports).toEqual([1]);
    expect(h.writerCalls).toHaveLength(1);
    expect(h.uuidCalls).toEqual([1, 2]);
    expect(h.session.getSnapshot().status).toBe("success");
  });

  it("does not issue again after success", async () => {
    const h = harness();
    h.session.beginDraft(h.source);
    await h.session.issue(good());
    await h.session.issue(good());
    expect(h.writerCalls).toHaveLength(1);
    expect(h.exports).toEqual([1]);
  });

  it("drops a late completion after the draft is replaced, before the writer ran", async () => {
    const gate = deferred<Uint8Array>();
    const h = harness({ exportProofPng: () => gate.promise });
    h.session.beginDraft(h.source);
    const pending = h.session.issue(good());
    expect(h.session.getSnapshot().status).toBe("preparing");

    // Nothing has been persisted yet, so replacing the draft is safe.
    h.session.beginDraft(h.source);
    expect(h.session.getSnapshot().status).toBe("draft-ready");

    gate.resolve(pngHeader());
    await pending;
    // The abandoned attempt neither wrote nor overwrote the newer state.
    expect(h.writerCalls).toEqual([]);
    expect(h.session.getSnapshot().status).toBe("draft-ready");
  });

  it("closes as outcome-unknown when the draft is replaced after the write started", async () => {
    const gate = deferred<SpaceV2IssueResult>();
    const h = harness({ writerResult: () => gate.promise });
    h.session.beginDraft(h.source);
    const pending = h.session.issue(good());
    await vi.waitFor(() => expect(h.writerCalls).toHaveLength(1));

    h.session.beginDraft(h.source);
    expect(h.session.getSnapshot()).toEqual({
      status: "outcome-unknown",
      canIssue: false,
      errorCode: null,
      confirmedToken: null,
    });

    // The late remote success must not resurrect a confirmed token for the abandoned attempt.
    gate.resolve({ ok: true, value: { token: TOKEN, objectPath: OBJECT_PATH } });
    await pending;
    expect(h.session.getSnapshot().status).toBe("outcome-unknown");
    expect(h.session.getSnapshot().confirmedToken).toBeNull();
    expect(h.exports).toEqual([1]);
    expect(h.writerCalls).toHaveLength(1);
  });

  it("clears a previous token and error on clearDraft", async () => {
    const h = harness();
    h.session.beginDraft(h.source);
    await h.session.issue(good());
    expect(h.session.getSnapshot().confirmedToken).toBe(TOKEN);

    h.session.clearDraft();
    expect(h.session.getSnapshot()).toEqual({
      status: "empty",
      canIssue: false,
      errorCode: null,
      confirmedToken: null,
    });
  });

  it("closes as outcome-unknown when cleared after the write started", async () => {
    const gate = deferred<SpaceV2IssueResult>();
    const h = harness({ writerResult: () => gate.promise });
    h.session.beginDraft(h.source);
    const pending = h.session.issue(good());
    await vi.waitFor(() => expect(h.writerCalls).toHaveLength(1));

    h.session.clearDraft();
    expect(h.session.getSnapshot().status).toBe("outcome-unknown");
    gate.resolve({ ok: true, value: { token: TOKEN, objectPath: OBJECT_PATH } });
    await pending;
    expect(h.session.getSnapshot().confirmedToken).toBeNull();
  });

  it("stops everything on dispose and lets no late result through", async () => {
    const gate = deferred<Uint8Array>();
    const h = harness({ exportProofPng: () => gate.promise });
    h.session.beginDraft(h.source);
    const pending = h.session.issue(good());
    h.session.dispose();
    expect(h.session.getSnapshot()).toEqual({
      status: "disposed",
      canIssue: false,
      errorCode: null,
      confirmedToken: null,
    });

    gate.resolve(pngHeader());
    await pending;
    expect(h.writerCalls).toEqual([]);
    expect(h.session.getSnapshot().status).toBe("disposed");

    // Every entry point is inert afterwards.
    h.session.beginDraft(h.source);
    h.session.clearDraft();
    await h.session.issue(good());
    expect(h.session.getSnapshot().status).toBe("disposed");
    expect(h.exports).toEqual([1]);
  });

  it("stops notifying an unsubscribed listener", async () => {
    const h = harness();
    const seen: string[] = [];
    const unsubscribe = h.session.subscribe((next) => seen.push(next.status));
    h.session.beginDraft(h.source);
    unsubscribe();
    await h.session.issue(good());
    expect(seen).toEqual(["draft-ready"]);
  });

  it("survives a throwing subscriber", () => {
    const h = harness();
    h.session.subscribe(() => {
      throw new Error("PRIVATE_LISTENER_MARKER");
    });
    expect(() => h.session.beginDraft(h.source)).not.toThrow();
    expect(h.session.getSnapshot().status).toBe("draft-ready");
  });
});

// --- 12. inert boundary ---------------------------------------------------------

describe("space V2 issue session — inert boundary", () => {
  it("imports no Firebase SDK, and touches no clock, DOM or network", async () => {
    expect(SDK_IMPORTS_AT_IMPORT).toEqual([]);

    const now = vi.spyOn(Date, "now");
    const random = vi.spyOn(Math, "random");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("network is forbidden here");
    });
    try {
      const h = harness();
      expect(sdkImports).toEqual([]);
      h.session.beginDraft(h.source);
      expect(sdkImports).toEqual([]);
      await h.session.issue(good());

      expect(sdkImports).toEqual([]);
      expect(now).not.toHaveBeenCalled();
      expect(random).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      // Nothing in this environment provides a DOM, so any DOM use would have thrown by now.
      expect(globalThis.document).toBeUndefined();
      expect(h.session.getSnapshot().status).toBe("success");
    } finally {
      now.mockRestore();
      random.mockRestore();
      fetchSpy.mockRestore();
    }
  });

  it("does nothing at all until beginDraft is called", () => {
    const h = harness();
    expect(h.session.getSnapshot()).toEqual({
      status: "empty",
      canIssue: false,
      errorCode: null,
      confirmedToken: null,
    });
    expectNothingSpent(h);
  });

  it("refuses to issue without a draft", async () => {
    const h = harness();
    await h.session.issue(good());
    expect(h.session.getSnapshot()).toEqual({
      status: "error",
      canIssue: false,
      errorCode: "SPACE_V2_SESSION_INVALID_DRAFT",
      confirmedToken: null,
    });
    expectNothingSpent(h);
  });
});

// --- correction round 1: semantic preflight ------------------------------------
//
// Exact keys are not enough. A structurally fine but semantically invalid composition must be
// refused at `beginDraft`, BEFORE the exporter, the two UUIDs, the three hashes and the encryption
// are spent — otherwise the operator pays for a draft that could never have been issued.

describe("space V2 issue session — semantic preflight", () => {
  const ART_TEMPLATE = {
    id: "ft1",
    name: "템플릿",
    type: "uploaded",
    clockEnabled: false,
    dataUrl: "https://example.test/art.png",
  };
  const BROKEN_ART_TEMPLATE = {
    id: "ft1",
    name: "템플릿",
    type: "uploaded",
    clockEnabled: false,
    dataUrl: "not-an-image-reference",
  };
  const TEXT_TEMPLATE = {
    ...TEMPLATE,
    textZones: [{ key: "main", xPercent: 50, yPercent: 80, fontSizePercent: 6, color: "#191A1D" }],
  };
  /** No explicit opt-out: the projection then reports a physical clock. */
  const CLOCK_TEMPLATE = { id: "ft1", name: "템플릿", type: "uploaded" };

  const withTemplate = (template: Record<string, unknown>) =>
    fields({ catalog: doc({ frameSizes: [SIZE], frameTemplates: [template] }) });

  const invalidDrafts: [string, SpaceV2FrozenIssueFields][] = [
    ["a null catalog", fields({ catalog: null as unknown as CatalogDocumentV1 })],
    ["an empty catalog", fields({ catalog: {} as unknown as CatalogDocumentV1 })],
    ["a catalog that is not a legacy document", fields({ catalog: doc({}) })],
    [
      "a frame size the catalog does not have",
      fields({ selection: { frameSizeId: "nope", templateId: "ft1" } }),
    ],
    [
      "a template the catalog does not have",
      fields({ selection: { frameSizeId: "s1", templateId: "nope" } }),
    ],
    [
      "a non-string selection id",
      fields({ selection: { frameSizeId: 1, templateId: "ft1" } as never }),
    ],
    [
      "a selection with an extra key",
      fields({ selection: { frameSizeId: "s1", templateId: "ft1", extra: 1 } as never }),
    ],
    ["landscape on a portrait aspect", fields({ frameOrientation: "landscape" })],
    [
      "an orientation that is not a V2 orientation",
      fields({ frameOrientation: "diagonal" as never }),
    ],
    ["a zero logical width", fields({ logicalWidth: 0 })],
    ["a negative logical width", fields({ logicalWidth: -1000 })],
    ["a fractional logical width", fields({ logicalWidth: 1000.5 })],
    ["a named colour", fields({ frameColor: "red" })],
    ["a malformed hex colour", fields({ frameColor: "#GGGGGG" })],
    ["a colour that is not a string", fields({ frameColor: 0x191a1d as never })],
    [
      "a scale below the contract range",
      fields({ transform: { scale: 0.5, x: 0, y: 0, rotationQuarterTurns: 0 } }),
    ],
    [
      "a scale above the contract range",
      fields({ transform: { scale: 6, x: 0, y: 0, rotationQuarterTurns: 0 } }),
    ],
    [
      "a pan outside the normalised range",
      fields({ transform: { scale: 1, x: 2, y: 0, rotationQuarterTurns: 0 } }),
    ],
    [
      "a rotation that is not a quarter turn",
      fields({ transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: 4 } as never }),
    ],
    ["a transform with a missing key", fields({ transform: { scale: 1, x: 0, y: 0 } as never })],
    ["a template whose art is present", withTemplate(ART_TEMPLATE)],
    ["a template whose art cannot be classified", withTemplate(BROKEN_ART_TEMPLATE)],
    ["a template that authors operator text", withTemplate(TEXT_TEMPLATE)],
    ["a template that carries a physical clock", withTemplate(CLOCK_TEMPLATE)],
  ];

  for (const [label, value] of invalidDrafts) {
    it(`refuses ${label} before anything is spent`, async () => {
      const h = harness();
      h.session.beginDraft({
        copyFields: () => value,
        exportProofPng: async () => pngHeader(),
      });

      expect(h.session.getSnapshot()).toEqual({
        status: "error",
        canIssue: false,
        errorCode: "SPACE_V2_SESSION_INVALID_DRAFT",
        confirmedToken: null,
      });
      await h.session.issue(good());
      expectNothingSpent(h);
    });
  }

  it("stores the detached catalog the read boundary returned, not the caller's object", async () => {
    const source = fields();
    const h = harness();
    h.session.beginDraft({
      copyFields: () => source,
      exportProofPng: async () => pngHeader(),
    });
    // The caller's catalog is wrecked after the freeze; the frozen read stays usable.
    (source.catalog.data as { frameSizes: unknown }).frameSizes = [];
    await h.session.issue(good());
    expect(h.session.getSnapshot().status).toBe("success");
  });
});

// --- correction round 1: writer failure envelope --------------------------------

describe("space V2 issue session — writer failure envelope", () => {
  const rejected: [string, unknown][] = [
    [
      "an unknown error code",
      {
        ok: false,
        error: {
          category: "UNKNOWN",
          code: "PRIVATE_WRITER_ERROR_MARKER",
          retryable: false,
          correlationId: CORRELATION_ID,
        },
      },
    ],
    [
      "an unknown category",
      {
        ok: false,
        error: {
          category: "PRIVATE_CATEGORY_MARKER",
          code: "SPACE_V2_ISSUE_FORBIDDEN",
          retryable: false,
          correlationId: CORRELATION_ID,
        },
      },
    ],
    [
      "a non-boolean retryable",
      {
        ok: false,
        error: {
          category: "AUTH",
          code: "SPACE_V2_ISSUE_FORBIDDEN",
          retryable: "no",
          correlationId: CORRELATION_ID,
        },
      },
    ],
    [
      "a correlation id from another attempt",
      {
        ok: false,
        error: {
          category: "AUTH",
          code: "SPACE_V2_ISSUE_FORBIDDEN",
          retryable: false,
          correlationId: "deadbeef",
        },
      },
    ],
    [
      "an extra key in the error",
      {
        ok: false,
        error: {
          category: "AUTH",
          code: "SPACE_V2_ISSUE_FORBIDDEN",
          retryable: false,
          correlationId: CORRELATION_ID,
          detail: "PRIVATE_DETAIL_MARKER",
        },
      },
    ],
    [
      "a missing key in the error",
      { ok: false, error: { code: "SPACE_V2_ISSUE_FORBIDDEN", correlationId: CORRELATION_ID } },
    ],
    [
      "an extra key at the top level",
      { ok: false, error: issueError("SPACE_V2_ISSUE_FORBIDDEN"), note: 1 },
    ],
    ["a non-object error", { ok: false, error: "SPACE_V2_ISSUE_FORBIDDEN" }],
  ];

  for (const [label, result] of rejected) {
    it(`closes ${label} as outcome-unknown with no code`, async () => {
      const h = harness({ writerResult: async () => result as SpaceV2IssueResult });
      h.session.beginDraft(h.source);
      await h.session.issue(good());

      expect(h.session.getSnapshot()).toEqual({
        status: "outcome-unknown",
        canIssue: false,
        errorCode: null,
        confirmedToken: null,
      });
      const serialized = JSON.stringify(h.snapshots);
      for (const marker of [
        "PRIVATE_WRITER_ERROR_MARKER",
        "PRIVATE_CATEGORY_MARKER",
        "PRIVATE_DETAIL_MARKER",
        "deadbeef",
      ]) {
        expect(serialized).not.toContain(marker);
      }
    });
  }

  it("still accepts a well-formed failure from this attempt", async () => {
    const h = harness({
      writerResult: async () => ({
        ok: false,
        error: {
          category: "AUTH",
          code: "SPACE_V2_ISSUE_FORBIDDEN",
          retryable: false,
          correlationId: CORRELATION_ID,
        },
      }),
    });
    h.session.beginDraft(h.source);
    await h.session.issue(good());
    expect(h.session.getSnapshot().errorCode).toBe("SPACE_V2_ISSUE_FORBIDDEN");
    expect(h.session.getSnapshot().status).toBe("error");
  });
});

// --- correction round 1: writer success envelope --------------------------------

describe("space V2 issue session — writer success envelope", () => {
  const OTHER_UUID = "2b3c4d5e-6f70-4a8b-9c0d-1e2f3a4b5c6d";

  const rejected: [string, unknown][] = [
    [
      "a token that is not a UUID",
      { ok: true, value: { token: "PRIVATE_NON_UUID_TOKEN", objectPath: OBJECT_PATH } },
    ],
    ["a different token", { ok: true, value: { token: OTHER_UUID, objectPath: OBJECT_PATH } }],
    [
      "a different object path",
      {
        ok: true,
        value: { token: TOKEN, objectPath: `rebuild-space-assets/objects/${OTHER_UUID}.png` },
      },
    ],
    [
      "an extra key in the value",
      { ok: true, value: { token: TOKEN, objectPath: OBJECT_PATH, url: "https://example.test/x" } },
    ],
    ["a missing object path", { ok: true, value: { token: TOKEN } }],
    ["a non-object value", { ok: true, value: TOKEN }],
    [
      "an extra key at the top level",
      { ok: true, value: { token: TOKEN, objectPath: OBJECT_PATH }, note: 1 },
    ],
  ];

  for (const [label, result] of rejected) {
    it(`refuses ${label} and confirms no token`, async () => {
      const h = harness({ writerResult: async () => result as SpaceV2IssueResult });
      h.session.beginDraft(h.source);
      await h.session.issue(good());

      expect(h.session.getSnapshot()).toEqual({
        status: "outcome-unknown",
        canIssue: false,
        errorCode: null,
        confirmedToken: null,
      });
      const serialized = JSON.stringify(h.snapshots);
      expect(serialized).not.toContain("PRIVATE_NON_UUID_TOKEN");
      expect(serialized).not.toContain("https://example.test/x");
      expect(serialized).not.toContain(OTHER_UUID);
    });
  }

  it("refuses a hostile success value without throwing", async () => {
    const h = harness({
      writerResult: async () =>
        ({
          ok: true,
          get value(): never {
            throw new Error("PRIVATE_HOSTILE_VALUE_MARKER");
          },
        }) as unknown as SpaceV2IssueResult,
    });
    h.session.beginDraft(h.source);
    await h.session.issue(good());
    expect(h.session.getSnapshot().status).toBe("outcome-unknown");
    expect(JSON.stringify(h.snapshots)).not.toContain("PRIVATE_HOSTILE_VALUE_MARKER");
  });

  it("refuses a correlation id the session could never have sent", async () => {
    const h = harness({ createCorrelationId: () => "NOT A CORRELATION ID" });
    h.session.beginDraft(h.source);
    await h.session.issue(good());
    // Refused locally: the writer is never called, so nothing was persisted.
    expect(h.session.getSnapshot()).toEqual({
      status: "error",
      canIssue: false,
      errorCode: "SPACE_V2_SESSION_PREPARATION_FAILED",
      confirmedToken: null,
    });
    expect(h.writerCalls).toEqual([]);
  });
});

// --- correction round 2: failure metadata must be the combination the port issues ---
//
// A code alone is not an envelope. `SPACE_V2_ISSUE_AUTH_REQUIRED` is only ever issued as
// `AUTH` / `retryable: true`; the same code carrying `VALIDATION` / `false` is a combination no
// real write attempt produces, so believing it would mean surfacing a definite auth failure the
// port never reported.

describe("space V2 issue session — failure metadata table", () => {
  const OTHER_CATEGORY: Record<SpaceV2IssueErrorCategory, SpaceV2IssueErrorCategory> = {
    VALIDATION: "AUTH",
    AUTH: "VALIDATION",
    NETWORK: "UNKNOWN",
    UNKNOWN: "NETWORK",
  };

  it("covers every code in the spec 074 vocabulary", () => {
    expect(ALL_ISSUE_CODES).toHaveLength(8);
  });

  for (const code of ALL_ISSUE_CODES) {
    const canonical = CANONICAL_ISSUE_METADATA[code];
    const unknownOutcome = OUTCOME_UNKNOWN_TEST_CODES.has(code);

    it(`accepts ${code} with its canonical ${canonical.category}/${canonical.retryable}`, async () => {
      const h = harness({ writerResult: async () => ({ ok: false, error: issueError(code) }) });
      h.session.beginDraft(h.source);
      await h.session.issue(good());

      expect(h.session.getSnapshot()).toEqual({
        status: unknownOutcome ? "outcome-unknown" : "error",
        canIssue: false,
        errorCode: code,
        confirmedToken: null,
      });
    });

    it(`refuses ${code} carrying another category`, async () => {
      const h = harness({
        writerResult: async () => ({
          ok: false,
          error: { ...issueError(code), category: OTHER_CATEGORY[canonical.category] },
        }),
      });
      h.session.beginDraft(h.source);
      await h.session.issue(good());

      expect(h.session.getSnapshot()).toEqual({
        status: "outcome-unknown",
        canIssue: false,
        errorCode: null,
        confirmedToken: null,
      });
      expect(JSON.stringify(h.snapshots)).not.toContain(code);
    });

    it(`refuses ${code} carrying the wrong retryable`, async () => {
      const h = harness({
        writerResult: async () => ({
          ok: false,
          error: { ...issueError(code), retryable: !canonical.retryable },
        }),
      });
      h.session.beginDraft(h.source);
      await h.session.issue(good());

      expect(h.session.getSnapshot()).toEqual({
        status: "outcome-unknown",
        canIssue: false,
        errorCode: null,
        confirmedToken: null,
      });
      expect(JSON.stringify(h.snapshots)).not.toContain(code);
    });
  }

  it("refuses a code that resolves only through the prototype chain", async () => {
    const h = harness({
      writerResult: async () =>
        ({
          ok: false,
          error: {
            category: "UNKNOWN",
            code: "toString",
            retryable: false,
            correlationId: CORRELATION_ID,
          },
        }) as unknown as SpaceV2IssueResult,
    });
    h.session.beginDraft(h.source);
    await h.session.issue(good());
    expect(h.session.getSnapshot()).toEqual({
      status: "outcome-unknown",
      canIssue: false,
      errorCode: null,
      confirmedToken: null,
    });
  });
});
