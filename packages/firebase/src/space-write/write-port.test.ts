import type { SpaceDocumentV2 } from "@denn/spaces";
import { describe, expect, it } from "vitest";
import type {
  SpaceV2IssueAuthPort,
  SpaceV2IssueWriteFacade,
  SpaceV2PreparedIssueBundle,
  SpaceV2ServerDocumentSnapshot,
} from "./index";
import { createSpaceV2IssueWritePort } from "./index";

const TOKEN = "11111111-1111-4111-8111-111111111111";
const ASSET_ID = "22222222-2222-4222-8222-222222222222";
const OBJECT_PATH = `rebuild-space-assets/objects/${ASSET_ID}.png`;
const CORRELATION_ID = "0123456789abcdef";
const BYTES = new Uint8Array([137, 80, 78, 71]);
const DOCUMENT: SpaceDocumentV2 = {
  schema: "space-v2",
  enc: {
    salt: "AAECAwQFBgcICQoLDA0ODw==",
    iv: "EBESExQVFhcYGRob",
    ct: "AAECAwQFBgcICQoLDA0ODw==",
  },
};

function bundle(overrides: Partial<SpaceV2PreparedIssueBundle> = {}): SpaceV2PreparedIssueBundle {
  return {
    token: TOKEN,
    copyProofDescriptor: () => ({
      objectPath: OBJECT_PATH,
      sha256: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      byteLength: BYTES.byteLength,
      contentType: "image/png",
      intrinsicWidth: 1,
      intrinsicHeight: 1,
    }),
    copyUploadBytes: () => new Uint8Array(BYTES),
    copyDocument: () => ({ schema: DOCUMENT.schema, enc: { ...DOCUMENT.enc } }),
    ...overrides,
  };
}

type HarnessOptions = {
  readonly operatorStatus?: "authenticated" | "signed-out" | "initializing" | "error";
  readonly upload?: SpaceV2IssueWriteFacade["uploadProofAsset"];
  readonly create?: SpaceV2IssueWriteFacade["createSpaceDocument"];
  readonly read?: SpaceV2IssueWriteFacade["readSpaceDocumentFromServer"];
};

function serverSnapshot(
  data: unknown = DOCUMENT,
  overrides: Partial<SpaceV2ServerDocumentSnapshot> = {},
): SpaceV2ServerDocumentSnapshot {
  return {
    exists: true,
    data,
    fromCache: false,
    hasPendingWrites: false,
    ...overrides,
  };
}

function createHarness(options: HarnessOptions = {}) {
  const calls: string[] = [];
  const uploads: Parameters<SpaceV2IssueWriteFacade["uploadProofAsset"]>[0][] = [];
  const creates: Parameters<SpaceV2IssueWriteFacade["createSpaceDocument"]>[0][] = [];
  const auth: SpaceV2IssueAuthPort = {
    currentOperator: () => {
      calls.push("auth");
      return { status: options.operatorStatus ?? "authenticated" };
    },
  };
  const facade: SpaceV2IssueWriteFacade = {
    async uploadProofAsset(request) {
      calls.push("upload");
      uploads.push(request);
      return options.upload?.(request) ?? { byteLength: request.bytes.byteLength };
    },
    async createSpaceDocument(request) {
      calls.push("create");
      creates.push(request);
      await options.create?.(request);
    },
    async readSpaceDocumentFromServer(token) {
      calls.push("read");
      return options.read?.(token) ?? serverSnapshot();
    },
  };
  return {
    calls,
    uploads,
    creates,
    port: createSpaceV2IssueWritePort({ auth, facade }),
  };
}

function request(inputBundle: SpaceV2PreparedIssueBundle = bundle()) {
  return { correlationId: CORRELATION_ID, bundle: inputBundle };
}

function sdkError(code: string, message = "SECRET raw sdk message") {
  return { code, message, token: TOKEN, objectPath: OBJECT_PATH };
}

describe("space V2 local issue write port", () => {
  it("uploads one detached proof copy before creating one detached document", async () => {
    const h = createHarness();
    const source = bundle();
    const result = await h.port.issue(request(source));

    expect(result).toEqual({ ok: true, value: { token: TOKEN, objectPath: OBJECT_PATH } });
    expect(h.calls).toEqual(["auth", "upload", "create"]);
    expect(h.uploads).toHaveLength(1);
    expect(h.creates).toHaveLength(1);
    expect(h.uploads[0]).toEqual({
      objectPath: OBJECT_PATH,
      bytes: BYTES,
      contentType: "image/png",
    });
    expect(h.uploads[0]?.bytes).not.toBe(BYTES);
    expect(h.creates[0]).toEqual({ token: TOKEN, document: DOCUMENT });
  });

  it("reads every bundle field and copy method once before the first write", async () => {
    const reads = new Map<string, number>();
    const count = (key: string, value: unknown) => ({
      enumerable: true,
      get() {
        reads.set(key, (reads.get(key) ?? 0) + 1);
        return value;
      },
    });
    const source = Object.defineProperties(
      {},
      {
        token: count("token", TOKEN),
        copyProofDescriptor: count("copyProofDescriptor", () => {
          reads.set("descriptor call", (reads.get("descriptor call") ?? 0) + 1);
          return bundle().copyProofDescriptor();
        }),
        copyUploadBytes: count("copyUploadBytes", () => {
          reads.set("bytes call", (reads.get("bytes call") ?? 0) + 1);
          return BYTES;
        }),
        copyDocument: count("copyDocument", () => {
          reads.set("document call", (reads.get("document call") ?? 0) + 1);
          return DOCUMENT;
        }),
      },
    ) as SpaceV2PreparedIssueBundle;

    expect((await createHarness().port.issue(request(source))).ok).toBe(true);
    expect([...reads.values()].every((value) => value === 1)).toBe(true);
    expect(reads.size).toBe(7);
  });

  it.each([
    ["invalid token", bundle({ token: "not-a-token" })],
    [
      "same token and asset id",
      bundle({
        copyProofDescriptor: () => ({
          ...bundle().copyProofDescriptor(),
          objectPath: `rebuild-space-assets/objects/${TOKEN}.png`,
        }),
      }),
    ],
    ["invalid document", bundle({ copyDocument: () => ({ schema: "space-v1" }) as never })],
    ["byte mismatch", bundle({ copyUploadBytes: () => new Uint8Array([1]) })],
    ["extra bundle key", { ...bundle(), extra: true } as unknown as SpaceV2PreparedIssueBundle],
  ])("rejects %s before facade writes", async (_label, inputBundle) => {
    const h = createHarness();
    const result = await h.port.issue(request(inputBundle));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SPACE_V2_ISSUE_INVALID_INPUT");
    expect(h.calls).toEqual(["auth"]);
  });

  it("fails closed for hostile bundle access without exposing its exception", async () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("SECRET hostile token");
        },
      },
    );
    const h = createHarness();
    const result = await h.port.issue(request(hostile as SpaceV2PreparedIssueBundle));
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(h.calls).toEqual(["auth"]);
  });

  it("rejects malformed correlation input before auth or facade access", async () => {
    const h = createHarness();
    const result = await h.port.issue({ correlationId: "NOT HEX", bundle: bundle() });
    expect(result).toEqual({
      ok: false,
      error: {
        category: "VALIDATION",
        code: "SPACE_V2_ISSUE_INVALID_INPUT",
        retryable: false,
        correlationId: "",
      },
    });
    expect(h.calls).toEqual([]);
  });

  it.each(["signed-out", "initializing", "error"] as const)(
    "blocks %s operators before upload",
    async (operatorStatus) => {
      const h = createHarness({ operatorStatus });
      const result = await h.port.issue(request());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("SPACE_V2_ISSUE_AUTH_REQUIRED");
      expect(h.calls).toEqual(["auth"]);
    },
  );

  it.each([
    ["storage/quota-exceeded", "SPACE_V2_ISSUE_UPLOAD_FAILED", true],
    ["storage/unauthenticated", "SPACE_V2_ISSUE_AUTH_REQUIRED", true],
    ["storage/unauthorized", "SPACE_V2_ISSUE_FORBIDDEN", false],
    ["storage/retry-limit-exceeded", "SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN", false],
    ["unmapped-secret-code", "SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN", false],
  ] as const)("maps upload %s safely", async (code, expected, retryable) => {
    const h = createHarness({ upload: () => Promise.reject(sdkError(code)) });
    const result = await h.port.issue(request());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(expected);
      expect(result.error.retryable).toBe(retryable);
    }
    expect(h.calls).toEqual(["auth", "upload"]);
  });

  it("fails closed on an upload receipt size mismatch without document create", async () => {
    const h = createHarness({ upload: async () => ({ byteLength: BYTES.byteLength + 1 }) });
    const result = await h.port.issue(request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SPACE_V2_ISSUE_ASSET_MISMATCH");
    expect(h.calls).toEqual(["auth", "upload"]);
  });

  it.each([
    ["firestore/permission-denied", "SPACE_V2_ISSUE_FORBIDDEN"],
    ["firestore/unauthenticated", "SPACE_V2_ISSUE_AUTH_REQUIRED"],
    ["firestore/already-exists", "SPACE_V2_ISSUE_DOCUMENT_FAILED"],
  ] as const)("maps definite create %s without read-back", async (code, expected) => {
    const h = createHarness({ create: () => Promise.reject(sdkError(code)) });
    const result = await h.port.issue(request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(expected);
    expect(h.calls).toEqual(["auth", "upload", "create"]);
  });

  it("reconciles an indeterminate create exactly once from an exact server document", async () => {
    const h = createHarness({
      create: () => Promise.reject(sdkError("firestore/deadline-exceeded")),
      read: async () => serverSnapshot(),
    });
    await expect(h.port.issue(request())).resolves.toEqual({
      ok: true,
      value: { token: TOKEN, objectPath: OBJECT_PATH },
    });
    expect(h.calls).toEqual(["auth", "upload", "create", "read"]);
  });

  it.each([
    [
      "missing",
      { exists: false, fromCache: false, hasPendingWrites: false },
      "SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN",
    ],
    [
      "cached",
      serverSnapshot(DOCUMENT, { fromCache: true }),
      "SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN",
    ],
    [
      "pending",
      serverSnapshot(DOCUMENT, { hasPendingWrites: true }),
      "SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN",
    ],
    [
      "mismatch",
      serverSnapshot({ ...DOCUMENT, enc: { ...DOCUMENT.enc, ct: "AQEBAQEBAQEBAQEBAQEBAQ==" } }),
      "SPACE_V2_ISSUE_DOCUMENT_FAILED",
    ],
    ["invalid", serverSnapshot({ schema: "space-v2" }), "SPACE_V2_ISSUE_DOCUMENT_FAILED"],
  ] as const)("fails closed for %s reconciliation", async (_label, snapshot, expected) => {
    const h = createHarness({
      create: () => Promise.reject(sdkError("unmapped")),
      read: async () => snapshot,
    });
    const result = await h.port.issue(request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(expected);
    expect(h.calls).toEqual(["auth", "upload", "create", "read"]);
  });

  it("keeps a failed server reconciliation outcome unknown", async () => {
    const h = createHarness({
      create: () => Promise.reject(sdkError("unmapped")),
      read: () => Promise.reject(sdkError("firestore/unavailable")),
    });
    const result = await h.port.issue(request());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN");
      expect(result.error.retryable).toBe(false);
    }
    expect(h.calls).toEqual(["auth", "upload", "create", "read"]);
  });

  it("reuses one in-flight promise and starts one upload", async () => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const h = createHarness({
      upload: async (input) => {
        await hold;
        return { byteLength: input.bytes.byteLength };
      },
    });
    const first = h.port.issue(request());
    const second = h.port.issue(request());
    expect(second).toBe(first);
    expect(h.calls).toEqual(["auth", "upload"]);
    release();
    await first;
    expect(h.calls).toEqual(["auth", "upload", "create"]);
  });

  it("returns only the safe error envelope on every raw SDK failure", async () => {
    const h = createHarness({ upload: () => Promise.reject(sdkError("SECRET-CODE")) });
    const result = await h.port.issue(request());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.error).sort()).toEqual([
      "category",
      "code",
      "correlationId",
      "retryable",
    ]);
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain("SECRET");
    expect(serialised).not.toContain(TOKEN);
    expect(serialised).not.toContain(ASSET_ID);
    expect(serialised).not.toContain(OBJECT_PATH);
    expect(serialised).not.toContain("137");
  });
});
