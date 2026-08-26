import { readSpaceDocumentV2, type SpaceDocumentV2 } from "@denn/spaces";
import {
  SPACE_V2_ASSET_CONTENT_TYPE,
  SPACE_V2_ASSET_MAX_BYTES,
  SPACE_V2_ASSET_PATH_PATTERN,
  SPACE_V2_ISSUE_CORRELATION_ID_PATTERN,
  SPACE_V2_UUID_V4_PATTERN,
} from "./constants";
import { classifySpaceV2DocumentError, mapSpaceV2UploadError, spaceV2IssueError } from "./errors";
import type {
  SpaceV2AssetUploadReceipt,
  SpaceV2IssueWriteFacade,
  SpaceV2ServerDocumentSnapshot,
} from "./facade";
import type {
  SpaceV2IssueAuthPort,
  SpaceV2IssueRequest,
  SpaceV2IssueResult,
  SpaceV2IssueWritePort,
  SpaceV2PreparedIssueBundle,
} from "./types";

export interface SpaceV2IssueWritePortOptions {
  readonly facade: SpaceV2IssueWriteFacade;
  readonly auth: SpaceV2IssueAuthPort;
}

const REQUEST_KEYS = ["correlationId", "bundle"] as const;
const BUNDLE_KEYS = ["token", "copyProofDescriptor", "copyUploadBytes", "copyDocument"] as const;
const PROOF_KEYS = [
  "objectPath",
  "sha256",
  "byteLength",
  "contentType",
  "intrinsicWidth",
  "intrinsicHeight",
] as const;
const RECEIPT_KEYS = ["byteLength"] as const;
const SNAPSHOT_KEYS = ["exists", "data", "fromCache", "hasPendingWrites"] as const;
const SHA256_BASE64 = /^[A-Za-z0-9+/]{43}=$/;

function exactSnapshot<const Keys extends readonly string[]>(
  value: unknown,
  keys: Keys,
  optionalKeys: readonly string[] = [],
): { readonly [Key in Keys[number]]?: unknown } | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) return null;
  for (const key of ownKeys) {
    if (!Reflect.getOwnPropertyDescriptor(value, key)?.enumerable) return null;
  }
  const allowed = new Set(keys);
  if (ownKeys.some((key) => !allowed.has(key as Keys[number]))) return null;
  const present = new Set(ownKeys as string[]);
  if (keys.some((key) => !optionalKeys.includes(key) && !present.has(key))) return null;

  const source = value as Record<string, unknown>;
  const snapshot: Record<string, unknown> = {};
  for (const key of ownKeys as string[]) snapshot[key] = source[key];
  return snapshot as { readonly [Key in Keys[number]]?: unknown };
}

type PreparedSnapshot = {
  readonly token: string;
  readonly objectPath: string;
  readonly bytes: Uint8Array;
  readonly document: SpaceDocumentV2;
};

function preparedSnapshot(bundle: SpaceV2PreparedIssueBundle): PreparedSnapshot | null {
  try {
    const source = exactSnapshot(bundle, BUNDLE_KEYS);
    if (source === null || typeof source.token !== "string") return null;
    if (!SPACE_V2_UUID_V4_PATTERN.test(source.token)) return null;

    const descriptorMethod = source.copyProofDescriptor;
    const bytesMethod = source.copyUploadBytes;
    const documentMethod = source.copyDocument;
    if (
      typeof descriptorMethod !== "function" ||
      typeof bytesMethod !== "function" ||
      typeof documentMethod !== "function"
    ) {
      return null;
    }

    const descriptor = exactSnapshot(
      (descriptorMethod as (this: unknown) => unknown).call(bundle),
      PROOF_KEYS,
    );
    const rawBytes = (bytesMethod as (this: unknown) => unknown).call(bundle);
    const rawDocument = (documentMethod as (this: unknown) => unknown).call(bundle);
    if (descriptor === null || !(rawBytes instanceof Uint8Array)) return null;

    const objectPath = descriptor.objectPath;
    const sha256 = descriptor.sha256;
    const byteLength = descriptor.byteLength;
    const contentType = descriptor.contentType;
    const intrinsicWidth = descriptor.intrinsicWidth;
    const intrinsicHeight = descriptor.intrinsicHeight;
    if (
      typeof objectPath !== "string" ||
      typeof sha256 !== "string" ||
      !SHA256_BASE64.test(sha256) ||
      typeof byteLength !== "number" ||
      !Number.isSafeInteger(byteLength) ||
      byteLength < 1 ||
      byteLength > SPACE_V2_ASSET_MAX_BYTES ||
      contentType !== SPACE_V2_ASSET_CONTENT_TYPE ||
      typeof intrinsicWidth !== "number" ||
      !Number.isSafeInteger(intrinsicWidth) ||
      intrinsicWidth < 1 ||
      typeof intrinsicHeight !== "number" ||
      !Number.isSafeInteger(intrinsicHeight) ||
      intrinsicHeight < 1
    ) {
      return null;
    }
    const match = SPACE_V2_ASSET_PATH_PATTERN.exec(objectPath);
    if (match === null || match[1] === source.token) return null;

    const bytes = new Uint8Array(rawBytes);
    if (bytes.byteLength !== byteLength) return null;

    const document = readSpaceDocumentV2(rawDocument);
    if (!document.ok) return null;
    return { token: source.token, objectPath, bytes, document: document.value };
  } catch {
    return null;
  }
}

function uploadReceiptMatches(value: unknown, expectedByteLength: number): boolean {
  try {
    const receipt = exactSnapshot(value, RECEIPT_KEYS);
    return (
      receipt !== null &&
      typeof receipt.byteLength === "number" &&
      Number.isSafeInteger(receipt.byteLength) &&
      receipt.byteLength === expectedByteLength
    );
  } catch {
    return false;
  }
}

function sameDocument(left: SpaceDocumentV2, right: SpaceDocumentV2): boolean {
  return (
    left.schema === right.schema &&
    left.enc.salt === right.enc.salt &&
    left.enc.iv === right.enc.iv &&
    left.enc.ct === right.enc.ct
  );
}

function reconciledDocument(
  snapshot: SpaceV2ServerDocumentSnapshot,
  expected: SpaceDocumentV2,
): "match" | "missing" | "mismatch" | "unknown" {
  try {
    const record = exactSnapshot(snapshot, SNAPSHOT_KEYS, ["data"]);
    if (
      record === null ||
      typeof record.exists !== "boolean" ||
      record.fromCache !== false ||
      record.hasPendingWrites !== false
    ) {
      return "unknown";
    }
    if (!record.exists) return record.data === undefined ? "missing" : "unknown";
    const document = readSpaceDocumentV2(record.data);
    if (!document.ok) return "mismatch";
    return sameDocument(document.value, expected) ? "match" : "mismatch";
  } catch {
    return "unknown";
  }
}

type BoundMethods = {
  readonly currentOperator: () => unknown;
  readonly uploadProofAsset: SpaceV2IssueWriteFacade["uploadProofAsset"];
  readonly createSpaceDocument: SpaceV2IssueWriteFacade["createSpaceDocument"];
  readonly readSpaceDocumentFromServer: SpaceV2IssueWriteFacade["readSpaceDocumentFromServer"];
};

function bindMethods(options: SpaceV2IssueWritePortOptions): BoundMethods | null {
  try {
    const currentOperator = options.auth.currentOperator;
    const uploadProofAsset = options.facade.uploadProofAsset;
    const createSpaceDocument = options.facade.createSpaceDocument;
    const readSpaceDocumentFromServer = options.facade.readSpaceDocumentFromServer;
    if (
      typeof currentOperator !== "function" ||
      typeof uploadProofAsset !== "function" ||
      typeof createSpaceDocument !== "function" ||
      typeof readSpaceDocumentFromServer !== "function"
    ) {
      return null;
    }
    return {
      currentOperator: () => currentOperator.call(options.auth),
      uploadProofAsset: (request) => uploadProofAsset.call(options.facade, request),
      createSpaceDocument: (request) => createSpaceDocument.call(options.facade, request),
      readSpaceDocumentFromServer: (token) =>
        readSpaceDocumentFromServer.call(options.facade, token),
    };
  } catch {
    return null;
  }
}

function fail(
  code: Parameters<typeof spaceV2IssueError>[0],
  correlationId: string,
): SpaceV2IssueResult {
  return { ok: false, error: spaceV2IssueError(code, correlationId) };
}

export function createSpaceV2IssueWritePort(
  options: SpaceV2IssueWritePortOptions,
): SpaceV2IssueWritePort {
  let issueInFlight: Promise<SpaceV2IssueResult> | null = null;

  const run = async (
    correlationId: string,
    bundle: SpaceV2PreparedIssueBundle,
  ): Promise<SpaceV2IssueResult> => {
    const methods = bindMethods(options);
    if (methods === null) return fail("SPACE_V2_ISSUE_INVALID_INPUT", correlationId);

    let operator: unknown;
    try {
      operator = methods.currentOperator();
    } catch {
      return fail("SPACE_V2_ISSUE_AUTH_REQUIRED", correlationId);
    }
    if (
      operator === null ||
      typeof operator !== "object" ||
      (operator as { readonly status?: unknown }).status !== "authenticated"
    ) {
      return fail("SPACE_V2_ISSUE_AUTH_REQUIRED", correlationId);
    }

    const prepared = preparedSnapshot(bundle);
    if (prepared === null) return fail("SPACE_V2_ISSUE_INVALID_INPUT", correlationId);

    let receipt: SpaceV2AssetUploadReceipt;
    try {
      receipt = await methods.uploadProofAsset({
        objectPath: prepared.objectPath,
        bytes: new Uint8Array(prepared.bytes),
        contentType: SPACE_V2_ASSET_CONTENT_TYPE,
      });
    } catch (error) {
      return fail(mapSpaceV2UploadError(error), correlationId);
    }
    if (!uploadReceiptMatches(receipt, prepared.bytes.byteLength)) {
      return fail("SPACE_V2_ISSUE_ASSET_MISMATCH", correlationId);
    }

    try {
      await methods.createSpaceDocument({
        token: prepared.token,
        document: prepared.document,
      });
      return {
        ok: true,
        value: { token: prepared.token, objectPath: prepared.objectPath },
      };
    } catch (error) {
      const failure = classifySpaceV2DocumentError(error);
      if (failure.kind === "definite") return fail(failure.code, correlationId);
    }

    let snapshot: SpaceV2ServerDocumentSnapshot;
    try {
      snapshot = await methods.readSpaceDocumentFromServer(prepared.token);
    } catch {
      return fail("SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN", correlationId);
    }
    switch (reconciledDocument(snapshot, prepared.document)) {
      case "match":
        return {
          ok: true,
          value: { token: prepared.token, objectPath: prepared.objectPath },
        };
      case "mismatch":
        return fail("SPACE_V2_ISSUE_DOCUMENT_FAILED", correlationId);
      default:
        return fail("SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN", correlationId);
    }
  };

  const issue = (request: SpaceV2IssueRequest): Promise<SpaceV2IssueResult> => {
    if (issueInFlight !== null) return issueInFlight;

    let correlationId: unknown;
    let bundle: unknown;
    try {
      const snapshot = exactSnapshot(request, REQUEST_KEYS);
      if (snapshot === null) return Promise.resolve(fail("SPACE_V2_ISSUE_INVALID_INPUT", ""));
      correlationId = snapshot.correlationId;
      bundle = snapshot.bundle;
    } catch {
      return Promise.resolve(fail("SPACE_V2_ISSUE_INVALID_INPUT", ""));
    }
    if (
      typeof correlationId !== "string" ||
      !SPACE_V2_ISSUE_CORRELATION_ID_PATTERN.test(correlationId)
    ) {
      return Promise.resolve(fail("SPACE_V2_ISSUE_INVALID_INPUT", ""));
    }

    const pending = run(correlationId, bundle as SpaceV2PreparedIssueBundle).finally(() => {
      if (issueInFlight === pending) issueInFlight = null;
    });
    issueInFlight = pending;
    return pending;
  };

  return { issue };
}
