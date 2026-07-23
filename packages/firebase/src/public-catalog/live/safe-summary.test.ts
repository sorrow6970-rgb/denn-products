import { describe, expect, it } from "vitest";
import type { PublicCatalogLoadResult } from "../types";
import { buildBrowserSummary, buildNodeSummary, type NodeSummaryMeta } from "./safe-summary";

// Markers that must NEVER appear in a serialized safe summary.
const SENSITIVE = [
  "SECRET_NAME",
  "SECRET_ID",
  "SECRET_TOKEN",
  "SECRET_TS",
  "SECRET_PATH",
  "SECRET_FIELD",
  "SECRETB64",
  "data:image",
  "guides/",
  "firebasestorage.googleapis.com",
];

const META: NodeSummaryMeta = {
  runAtUtc: "2026-07-23T00:00:00.000Z",
  runAtKst: "2026-07-23T09:00:00.000+09:00",
  requests: 1,
  httpStatus: 200,
  contentTypePresent: true,
  byteLength: 492_000,
  elapsedMs: 123,
};

const successResult = (): PublicCatalogLoadResult =>
  ({
    ok: true,
    source: "network",
    correlationId: "c",
    document: {
      schemaVersion: 1,
      migratedFrom: "legacy-v0",
      data: {
        models: [
          {
            id: "SECRET_ID",
            name: "SECRET_NAME",
            dataUrl: "data:image/png;base64,SECRETB64",
            storagePath: "guides/SECRET_PATH.png",
          },
        ],
        __publishedAt: "SECRET_TS",
        token: "SECRET_TOKEN",
      },
    },
    report: {
      sourceVersion: "legacy-v0",
      defaultsApplied: ["frameSizes"],
      warnings: [
        { code: "UNKNOWN_FIELD", path: "models[0].SECRET_FIELD" },
        { code: "UNKNOWN_FIELD", path: "token" },
      ],
      unknownPaths: ["token"],
      extensions: { token: "SECRET_TOKEN" },
      counts: { models: 1, frameTemplates: 0 },
      imageReferences: { dataUrl: 1, storagePath: 1, dual: 0 },
    },
  }) as unknown as PublicCatalogLoadResult;

const failureResult = (): PublicCatalogLoadResult =>
  ({
    ok: false,
    error: {
      category: "VALIDATION",
      code: "INVALID_CATALOG",
      retryable: false,
      correlationId: "c",
      catalogIssues: [{ code: "DUPLICATE_ID", path: "frameSizes[SECRET_ID].id" }],
    },
  }) as unknown as PublicCatalogLoadResult;

describe("buildNodeSummary — no sensitive data leaks", () => {
  it("keeps only safe aggregates on success", () => {
    const summary = buildNodeSummary(successResult(), META);
    const serialized = JSON.stringify(summary);
    for (const marker of SENSITIVE) expect(serialized).not.toContain(marker);
    expect(summary).toMatchObject({
      kind: "node",
      endpointId: "published/state.json",
      outcome: "success",
      code: "OK",
      sourceSchema: "legacy-v0",
      collectionCounts: { models: 1, frameTemplates: 0 },
      warningCount: 2,
      issueCodeCounts: { UNKNOWN_FIELD: 2 },
      hasPublishedAt: true,
      byteLength: 492_000,
    });
  });

  it("keeps only safe aggregates on failure (issue codes only, no paths)", () => {
    const summary = buildNodeSummary(failureResult(), { ...META, byteLength: undefined });
    const serialized = JSON.stringify(summary);
    for (const marker of SENSITIVE) expect(serialized).not.toContain(marker);
    expect(summary).toMatchObject({
      outcome: "failure",
      code: "INVALID_CATALOG",
      issueCodeCounts: { DUPLICATE_ID: 1 },
    });
  });

  it("does not store the full endpoint URL", () => {
    const summary = buildNodeSummary(successResult(), META);
    expect(summary.endpointId).toBe("published/state.json");
    expect(JSON.stringify(summary)).not.toContain("https://");
  });
});

describe("buildNodeSummary — rejects unsafe numeric inputs", () => {
  const bad: Array<[string, Partial<NodeSummaryMeta>]> = [
    ["negative byteLength", { byteLength: -1 }],
    ["NaN byteLength", { byteLength: Number.NaN }],
    ["non-integer byteLength", { byteLength: 12.5 }],
    ["Infinity elapsedMs", { elapsedMs: Number.POSITIVE_INFINITY }],
    ["negative elapsedMs", { elapsedMs: -5 }],
    ["negative requests", { requests: -1 }],
  ];
  for (const [label, patch] of bad) {
    it(`rejects ${label}`, () => {
      expect(() => buildNodeSummary(successResult(), { ...META, ...patch })).toThrow();
    });
  }
  it("rejects missing timestamps", () => {
    expect(() => buildNodeSummary(successResult(), { ...META, runAtUtc: "" })).toThrow();
  });
});

describe("buildBrowserSummary", () => {
  it("shapes a safe browser summary and rejects bad numbers", () => {
    const summary = buildBrowserSummary(
      {
        outcome: "success",
        code: "OK",
        corsBlocked: false,
        httpStatus: 200,
        responseType: "cors",
        contentTypePresent: true,
        byteLength: 492_000,
        elapsedMs: 88,
        jsonParseOk: true,
      },
      {
        runAtUtc: "2026-07-23T00:00:00.000Z",
        runAtKst: "2026-07-23T09:00:00.000+09:00",
        requests: 1,
      },
    );
    expect(summary).toMatchObject({
      kind: "browser",
      code: "OK",
      responseType: "cors",
      jsonParseOk: true,
    });
    expect(() =>
      buildBrowserSummary(
        { outcome: "success", code: "OK", byteLength: Number.POSITIVE_INFINITY },
        { runAtUtc: "x", runAtKst: "y", requests: 1 },
      ),
    ).toThrow();
  });
});
