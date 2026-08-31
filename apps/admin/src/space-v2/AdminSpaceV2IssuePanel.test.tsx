// Unit contract for the Space V2 issue panel (spec 083 §2 - §7).
// Synthetic controllers and a synthetic catalog only — no Firebase SDK, no adapter, no network, no
// DOM. Interactive behaviour (freeze, password, single flight, copy) is asserted in the Chromium
// E2E; what is pinned here is the pure selection gate, the width rule and the safe rendered state.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readLegacyCatalog, type CatalogDocumentV1 } from "@denn/shared";
import type { AdminStateBaselineValue } from "@denn/firebase/admin-write";
import type {
  AdminWriteSessionController,
  AdminWriteSessionSnapshot,
} from "../admin-write/session-controller";
import {
  AdminSpaceV2IssuePanel,
  copyLinkToClipboard,
  eligibleFrameColors,
  evaluateIssueSelection,
  toLogicalWidth,
} from "./AdminSpaceV2IssuePanel";
import type { SpaceV2IssueSessionController, SpaceV2IssueSessionSnapshot } from "./issue-session";

const LEGACY = {
  brand: { name: "DENN PRODUCTS" },
  models: [],
  // The legacy clock is opt-OUT: a template with no `clock` field IS a clock frame, so every
  // template that this first capability can issue has to say so explicitly.
  frameTemplates: [
    { id: "full", name: "전체 사진", type: "builtin", dataUrl: null, clock: false },
    { id: "clocked", name: "시계형", type: "builtin", dataUrl: null },
    {
      id: "art",
      name: "아트",
      type: "uploaded",
      dataUrl: "data:image/png;base64,QUJD",
      clock: false,
    },
    { id: "broken", name: "깨진 참조", type: "uploaded", dataUrl: "not-a-url", clock: false },
  ],
  frameCategories: [],
  frameSizes: [
    { id: "a4", name: "A4", aspect: 1.5, clock: null },
    { id: "wide", name: "가로형", aspect: 0.75, clock: null },
  ],
  frameColors: [
    { id: "black", name: "블랙", fill: "#1A1A1A", grain: false },
    { id: "oak", name: "오크", fill: "#C8A87A", grain: true },
    { id: "broken", name: "잘못된 색", fill: "black", grain: false },
  ],
  frameThickness: 5.5,
  clockSettings: { x: 88, y: 88, size: 12, customImg: null },
};

function catalog(): CatalogDocumentV1 {
  const read = readLegacyCatalog(LEGACY);
  if (!read.ok) throw new Error("fixture catalog must read");
  return read.document;
}

const WRITE_SNAPSHOT: AdminWriteSessionSnapshot = {
  status: "ready-clean",
  revision: 3,
  source: "rebuild",
  errorCode: null,
  canLoad: true,
  canEdit: true,
  canSave: false,
};

function writeController(
  snapshot: AdminWriteSessionSnapshot = WRITE_SNAPSHOT,
  baseline: CatalogDocumentV1 | null = catalog(),
): AdminWriteSessionController {
  const value: AdminStateBaselineValue | null =
    baseline === null
      ? null
      : { catalog: baseline, revision: 3, source: "rebuild", promotedLegacyPrintSizeIds: [] };
  return {
    subscribe: () => () => undefined,
    getSnapshot: () => snapshot,
    getBaseline: () => value,
    loadBaseline: async () => undefined,
    setDraftState: () => undefined,
    save: async () => undefined,
    dispose: () => undefined,
  };
}

function issueSession(
  snapshot: SpaceV2IssueSessionSnapshot = {
    status: "empty",
    canIssue: false,
    errorCode: null,
    confirmedToken: null,
  },
): SpaceV2IssueSessionController {
  return {
    subscribe: () => () => undefined,
    getSnapshot: () => snapshot,
    beginDraft: () => undefined,
    clearDraft: () => undefined,
    issue: async () => undefined,
    dispose: () => undefined,
  };
}

const render = (
  write: AdminWriteSessionController = writeController(),
  session: SpaceV2IssueSessionController = issueSession(),
): string =>
  renderToStaticMarkup(
    <AdminSpaceV2IssuePanel
      writeController={write}
      session={session}
      readOrigin={() => "https://design.example.test"}
    />,
  );

// --- the selection gate (spec 083 §4) ----------------------------------------

describe("evaluateIssueSelection", () => {
  it("is incomplete until all three choices are made — nothing is auto-selected", () => {
    const document = catalog();
    for (const selection of [
      { frameSizeId: "", templateId: "", colorId: "" },
      { frameSizeId: "a4", templateId: "", colorId: "black" },
      { frameSizeId: "a4", templateId: "full", colorId: "" },
      { frameSizeId: "", templateId: "full", colorId: "black" },
    ]) {
      expect(evaluateIssueSelection(document, selection).status, JSON.stringify(selection)).toBe(
        "incomplete",
      );
    }
  });

  it("accepts a supported combination and derives the orientation from the aspect", () => {
    const document = catalog();
    const portrait = evaluateIssueSelection(document, {
      frameSizeId: "a4",
      templateId: "full",
      colorId: "black",
    });
    expect(portrait.status).toBe("eligible");
    expect(portrait.frameOrientation).toBe("portrait");
    expect(portrait.frameColor).toBe("#1A1A1A");
    expect(portrait.geometry?.aspect).toBe(1.5);

    // aspect = H / W, so an aspect below 1 is a landscape frame.
    const landscape = evaluateIssueSelection(document, {
      frameSizeId: "wide",
      templateId: "full",
      colorId: "black",
    });
    expect(landscape.status).toBe("eligible");
    expect(landscape.frameOrientation).toBe("landscape");
  });

  it("refuses template art, an unproven art reference and an unknown selection", () => {
    const document = catalog();
    // Real art is a later capability, not something to draw over silently.
    expect(
      evaluateIssueSelection(document, {
        frameSizeId: "a4",
        templateId: "art",
        colorId: "black",
      }).status,
    ).toBe("unsupported");
    // `invalid-reference` proves nothing about absence, so it is refused rather than assumed empty.
    expect(
      evaluateIssueSelection(document, {
        frameSizeId: "a4",
        templateId: "broken",
        colorId: "black",
      }).status,
    ).toBe("unsupported");
    expect(
      evaluateIssueSelection(document, {
        frameSizeId: "missing",
        templateId: "full",
        colorId: "black",
      }).status,
    ).toBe("unsupported");
    // A physical clock is preview-only and cannot be replayed, so a clock template is refused.
    expect(
      evaluateIssueSelection(document, {
        frameSizeId: "a4",
        templateId: "clocked",
        colorId: "black",
      }).status,
    ).toBe("unsupported");
  });

  it("refuses a grain finish and a colour that is not canonical hex", () => {
    const document = catalog();
    expect(eligibleFrameColors(document).map((item) => item.id)).toEqual(["black"]);
    for (const colorId of ["oak", "broken", "missing"]) {
      expect(
        evaluateIssueSelection(document, { frameSizeId: "a4", templateId: "full", colorId }).status,
        colorId,
      ).toBe("unsupported");
    }
  });

  it("has nothing to evaluate without a baseline catalog", () => {
    expect(
      evaluateIssueSelection(null, { frameSizeId: "a4", templateId: "full", colorId: "black" })
        .status,
    ).toBe("incomplete");
  });
});

// --- the measured width (spec 083 §4) ----------------------------------------

describe("toLogicalWidth", () => {
  it("is a positive integer capped at 500", () => {
    expect(toLogicalWidth(320)).toBe(320);
    expect(toLogicalWidth(319.9)).toBe(319);
    expect(toLogicalWidth(900)).toBe(500);
    expect(toLogicalWidth(500)).toBe(500);
  });

  it("has no width to offer for an unmeasured or empty box", () => {
    expect(toLogicalWidth(0)).toBeNull();
    expect(toLogicalWidth(0.4)).toBeNull();
    expect(toLogicalWidth(-10)).toBeNull();
    expect(toLogicalWidth(Number.NaN)).toBeNull();
    expect(toLogicalWidth(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

// --- the copy attempt (spec 083 §7) ------------------------------------------

describe("copyLinkToClipboard", () => {
  const LINK = "https://design.example.test/?space=3f2504e0-4f89-41d3-9a0c-0305e82c3301";

  it("copies through the injected port exactly once when it resolves", async () => {
    const written: string[] = [];
    const clipboard = {
      write: async (text: string) => {
        written.push(text);
      },
    };
    await expect(copyLinkToClipboard(LINK, clipboard)).resolves.toBe("copied");
    expect(written).toEqual([LINK]);
  });

  it("fails closed when there is no clipboard port and no link", async () => {
    await expect(copyLinkToClipboard(LINK, undefined)).resolves.toBe("failed");
    await expect(copyLinkToClipboard(null, { write: async () => undefined })).resolves.toBe(
      "failed",
    );
  });

  it("fails closed when the port rejects, and keeps the reason to itself", async () => {
    const clipboard = {
      write: () =>
        Promise.reject(new Error("NotAllowedError: denied for https://real.host/secret")),
    };
    await expect(copyLinkToClipboard(LINK, clipboard)).resolves.toBe("failed");
  });

  it("fails closed when the port throws SYNCHRONOUSLY", async () => {
    // The production port reads `navigator.clipboard.writeText` inside `write`, so a browser
    // without the capability throws before any promise exists. Nothing may escape the click.
    const clipboard = {
      write: (): Promise<void> => {
        throw new TypeError("Cannot read properties of undefined (reading 'writeText')");
      },
    };
    const attempt = copyLinkToClipboard(LINK, clipboard);
    expect(attempt).toBeInstanceOf(Promise);
    await expect(attempt).resolves.toBe("failed");
  });

  it("fails closed when the port returns something that is not a promise", async () => {
    const clipboard = { write: (() => undefined) as unknown as (text: string) => Promise<void> };
    // A non-thenable return is not evidence that the text reached the clipboard, but it is also
    // not a rejection — `Promise.resolve` absorbs it rather than letting `.then` throw.
    await expect(copyLinkToClipboard(LINK, clipboard)).resolves.toBe("copied");
  });
});

// --- the rendered states (spec 083 §6) ---------------------------------------

describe("AdminSpaceV2IssuePanel", () => {
  it("explains why a draft cannot start when the baseline is not ready-clean", () => {
    for (const status of ["unloaded", "ready-dirty-valid", "saving", "conflict"] as const) {
      const html = render(writeController({ ...WRITE_SNAPSHOT, status }));
      expect(html, status).toContain(
        "편집 기준을 저장할 변경이 없는 상태로 불러온 뒤에 시안을 준비할 수 있습니다.",
      );
      // No Canvas and no issue affordance exist in that state.
      expect(html, status).not.toContain('data-testid="space-v2-preview-canvas"');
      expect(html, status).not.toContain('data-testid="space-v2-issue"');
    }
  });

  it("offers no automatic first selection", () => {
    const html = render();
    expect(html).toContain("사이즈를 선택하세요");
    expect(html).toContain("템플릿을 선택하세요");
    expect(html).toContain("색상을 선택하세요");
    expect(html).toContain("액자 사이즈, 템플릿, 색상을 모두 선택하세요.");
    // The grain colour never becomes an option at all.
    expect(html).not.toContain("오크");
  });

  it("shows the freeze action disabled and no password form before a draft exists", () => {
    const html = render();
    expect(html).toContain('data-testid="space-v2-freeze"');
    expect(html).toMatch(/data-testid="space-v2-freeze"[^>]*disabled/);
    expect(html).not.toContain('data-testid="space-v2-password"');
    expect(html).not.toContain('data-testid="space-v2-issue"');
  });

  it("announces an outcome-unknown as an alert with no link and no retry", () => {
    const html = render(
      writeController(),
      issueSession({
        status: "outcome-unknown",
        canIssue: false,
        errorCode: null,
        confirmedToken: null,
      }),
    );
    expect(html).toContain(
      "결과를 확인할 수 없습니다. 같은 시안을 다시 발급하지 말고 상태를 먼저 확인하세요.",
    );
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("?space=");
    expect(html).not.toContain('data-testid="space-v2-copy-link"');
    expect(html).not.toContain('data-testid="space-v2-issue"');
  });

  it("maps every definite failure to fixed copy and shows no code", () => {
    const codes = [
      "SPACE_V2_SESSION_PASSWORD_MISMATCH",
      "SPACE_V2_SESSION_PROOF_FAILED",
      "SPACE_V2_SESSION_PREPARATION_FAILED",
      "SPACE_V2_ISSUE_AUTH_REQUIRED",
      "SPACE_V2_ISSUE_FORBIDDEN",
      "SPACE_V2_ISSUE_UPLOAD_FAILED",
      "SPACE_V2_ISSUE_ASSET_MISMATCH",
    ] as const;
    for (const errorCode of codes) {
      const html = render(
        writeController(),
        issueSession({ status: "error", canIssue: false, errorCode, confirmedToken: null }),
      );
      expect(html, errorCode).not.toContain(errorCode);
      expect(html, errorCode).not.toContain("SPACE_V2");
      // The only way forward from a definite failure is a NEW draft.
      expect(html, errorCode).toContain('data-testid="space-v2-new-draft"');
      expect(html, errorCode).not.toContain('data-testid="space-v2-copy-link"');
      expect(html, errorCode).not.toContain('data-testid="space-v2-issue"');
    }
  });

  it("shows the confirmed same-origin link and an explicit copy action on success", () => {
    const token = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
    const html = render(
      writeController(),
      issueSession({
        status: "success",
        canIssue: false,
        errorCode: null,
        confirmedToken: token,
      }),
    );
    expect(html).toContain(`https://design.example.test/?space=${token}`);
    expect(html).toContain('data-testid="space-v2-copy-link"');
    expect(html).toContain("발급이 완료됐습니다.");
    // The password form is gone and nothing was auto-copied.
    expect(html).not.toContain('data-testid="space-v2-password"');
    expect(html).not.toContain("링크를 복사했습니다.");
  });

  it("says the link cannot be shown rather than inventing one", () => {
    const html = renderToStaticMarkup(
      <AdminSpaceV2IssuePanel
        writeController={writeController()}
        session={issueSession({
          status: "success",
          canIssue: false,
          errorCode: null,
          confirmedToken: "not-a-token",
        })}
        readOrigin={() => "https://design.example.test"}
      />,
    );
    expect(html).toContain("링크를 표시할 수 없습니다.");
    expect(html).not.toContain("?space=");
  });

  it("renders no password value and no sensitive marker anywhere", () => {
    const html = render(
      writeController(),
      issueSession({
        status: "draft-ready",
        canIssue: true,
        errorCode: null,
        confirmedToken: null,
      }),
    );
    // The panel holds no frozen generation in this render, so the password form is not offered.
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain("rebuild-space-assets");
    expect(html).not.toContain("admin/state.json");
  });
});
