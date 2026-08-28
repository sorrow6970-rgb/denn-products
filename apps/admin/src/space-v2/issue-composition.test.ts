import { describe, expect, it, vi } from "vitest";
import type {
  SpaceV2IssueRequest,
  SpaceV2IssueResult,
  SpaceV2IssueWritePort,
} from "@denn/firebase/space-write";
import type { OperatorAuthPort, OperatorAuthState } from "@denn/firebase/admin-read";
// The CUSTOMER's own plan composition, imported by the equality test ONLY (see its own comment).
import { buildFrameProductPlan } from "../../../mockup/src/canvas/productPlan";
import { maxPanFromRects, toLogicalTransform } from "../../../mockup/src/preview/imageTransform";
import { resolveAdminFirebaseConfig, resolveAdminSpaceV2IssueEnabled } from "../admin-read/config";
import {
  buildAdminFrameIssuePlan,
  createAdminSpaceV2IssueSession,
  createLazySpaceV2IssueWritePort,
  formatSpaceV2SpaceLink,
  toSpaceV2IssueAuthPort,
  type AdminFrameIssuePlanInput,
} from "./issue-composition";

const CONFIG_ENV = {
  VITE_DENN_ADMIN_FIREBASE_ENABLED: "true",
  VITE_DENN_ADMIN_FIREBASE_API_KEY: "synthetic-api-key",
  VITE_DENN_ADMIN_FIREBASE_AUTH_DOMAIN: "synthetic.invalid",
  VITE_DENN_ADMIN_FIREBASE_PROJECT_ID: "demo-synthetic",
  VITE_DENN_ADMIN_FIREBASE_STORAGE_BUCKET: "synthetic.invalid",
  VITE_DENN_ADMIN_FIREBASE_APP_ID: "synthetic-app-id",
} as const;

const WRITE_ENV = { ...CONFIG_ENV, VITE_DENN_ADMIN_WRITE_ENABLED: "true" } as const;
const FULL_ENV = { ...WRITE_ENV, VITE_DENN_ADMIN_SPACE_V2_ISSUE_ENABLED: "true" } as const;

const authPort = (state: OperatorAuthState = { status: "authenticated" }): OperatorAuthPort => ({
  subscribe: () => () => undefined,
  currentOperator: () => state,
  signInWithEmailPassword: async () => ({ ok: true, value: { correlationId: "a1b2c3d4" } }),
  signOut: async () => ({ ok: true, value: { correlationId: "a1b2c3d4" } }),
});

// --- the third gate (spec 083 §1) --------------------------------------------

describe("resolveAdminSpaceV2IssueEnabled", () => {
  it("needs the exact string true", () => {
    expect(resolveAdminSpaceV2IssueEnabled(FULL_ENV)).toBe(true);
    for (const value of ["1", "TRUE", "True", "yes", "", " true", "true "]) {
      expect(
        resolveAdminSpaceV2IssueEnabled({
          ...WRITE_ENV,
          VITE_DENN_ADMIN_SPACE_V2_ISSUE_ENABLED: value,
        }),
        value,
      ).toBe(false);
    }
    expect(resolveAdminSpaceV2IssueEnabled(WRITE_ENV)).toBe(false);
    expect(resolveAdminSpaceV2IssueEnabled(undefined)).toBe(false);
  });

  it("cannot be enabled without the complete config and the write gate", () => {
    // The issue panel freezes the C5 baseline, so opening it without that baseline would be a
    // panel with nothing to freeze — the prerequisites are part of the gate, not a separate check.
    expect(
      resolveAdminSpaceV2IssueEnabled({ VITE_DENN_ADMIN_SPACE_V2_ISSUE_ENABLED: "true" }),
    ).toBe(false);
    expect(
      resolveAdminSpaceV2IssueEnabled({
        ...CONFIG_ENV,
        VITE_DENN_ADMIN_SPACE_V2_ISSUE_ENABLED: "true",
      }),
    ).toBe(false);
    const partial = { ...FULL_ENV, VITE_DENN_ADMIN_FIREBASE_APP_ID: "" };
    expect(resolveAdminSpaceV2IssueEnabled(partial)).toBe(false);
  });
});

// --- session construction (spec 083 §1) --------------------------------------

describe("createAdminSpaceV2IssueSession", () => {
  const uuid = { randomUUID: () => "00000000-0000-4000-8000-000000000000" };

  it("creates nothing when the gate is off", () => {
    const makeWritePort = vi.fn();
    const session = createAdminSpaceV2IssueSession({
      resolution: resolveAdminFirebaseConfig(WRITE_ENV),
      enabled: false,
      auth: authPort(),
      dependencies: { makeWritePort, uuid },
    });
    expect(session).toBeNull();
    expect(makeWritePort).not.toHaveBeenCalled();
  });

  it("creates nothing when the config never resolved", () => {
    const session = createAdminSpaceV2IssueSession({
      resolution: resolveAdminFirebaseConfig(undefined),
      enabled: true,
      auth: authPort(),
      dependencies: { uuid },
    });
    expect(session).toBeNull();
  });

  it("builds a session without touching the writer factory", () => {
    const makeWritePort = vi.fn(async () => ({ issue: async () => ({ ok: true }) }) as never);
    const session = createAdminSpaceV2IssueSession({
      resolution: resolveAdminFirebaseConfig(FULL_ENV),
      enabled: true,
      auth: authPort(),
      dependencies: { makeWritePort, uuid },
    });
    expect(session).not.toBeNull();
    expect(session?.getSnapshot().status).toBe("empty");
    // Constructing the session must not reach Firebase: no facade, no service, no network.
    expect(makeWritePort).not.toHaveBeenCalled();
    session?.dispose();
  });

  it("passes the EXISTING operator auth through, narrowed to the write vocabulary", () => {
    expect(toSpaceV2IssueAuthPort(authPort()).currentOperator()).toEqual({
      status: "authenticated",
    });
    // The admin error state carries a code the write port's vocabulary has no place for.
    const errored = authPort({ status: "error", code: "NETWORK_UNAVAILABLE" });
    expect(toSpaceV2IssueAuthPort(errored).currentOperator()).toEqual({ status: "error" });
  });
});

// --- the lazy writer (spec 083 §1) -------------------------------------------

describe("createLazySpaceV2IssueWritePort", () => {
  const request = (): SpaceV2IssueRequest =>
    ({ correlationId: "abcdef0123456789", bundle: {} }) as unknown as SpaceV2IssueRequest;

  it("builds the port on the first issue and reuses it", async () => {
    const issue = vi.fn(
      async (): Promise<SpaceV2IssueResult> => ({
        ok: true,
        value: { token: "t", objectPath: "p" },
      }),
    );
    const factory = vi.fn(async (): Promise<SpaceV2IssueWritePort> => ({ issue }));
    const port = createLazySpaceV2IssueWritePort(factory);
    expect(factory).not.toHaveBeenCalled();

    await port.issue(request());
    await port.issue(request());
    expect(factory).toHaveBeenCalledTimes(1);
    expect(issue).toHaveBeenCalledTimes(2);
  });

  it("closes a factory failure as a definite local failure, carrying no SDK detail", async () => {
    const factory = vi.fn(async (): Promise<SpaceV2IssueWritePort> => {
      throw new Error("apiKey mismatch for project demo-synthetic");
    });
    const port = createLazySpaceV2IssueWritePort(factory);
    const result = await port.issue(request());
    expect(result).toEqual({
      ok: false,
      error: {
        category: "VALIDATION",
        code: "SPACE_V2_ISSUE_INVALID_INPUT",
        retryable: false,
        correlationId: "abcdef0123456789",
      },
    });
    // Nothing was retried on its own, and the message never leaves the boundary.
    expect(JSON.stringify(result)).not.toContain("apiKey");
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

// --- the success link (spec 083 §7) ------------------------------------------

describe("formatSpaceV2SpaceLink", () => {
  const token = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

  it("is the current origin's root with exactly one space query", () => {
    expect(formatSpaceV2SpaceLink("https://design.example.test", token)).toBe(
      `https://design.example.test/?space=${token}`,
    );
    expect(formatSpaceV2SpaceLink("http://localhost:4184", token)).toBe(
      `http://localhost:4184/?space=${token}`,
    );
  });

  it("carries nothing from the current location", () => {
    // An origin never contains a path/query/hash, but a caller that passes a full href must not be
    // able to smuggle one into a link the operator sends to a customer.
    const link = formatSpaceV2SpaceLink(
      "https://user:secret@design.example.test/admin?email=a@b.c#frag",
      token,
    );
    expect(link).toBe(`https://design.example.test/?space=${token}`);
    expect(link).not.toContain("secret");
    expect(link).not.toContain("email");
    expect(link).not.toContain("#");
  });

  it("refuses anything that is not a confirmed v4 token on an http(s) origin", () => {
    expect(formatSpaceV2SpaceLink("https://design.example.test", "not-a-uuid")).toBeNull();
    expect(formatSpaceV2SpaceLink("https://design.example.test", token.toUpperCase())).toBeNull();
    expect(formatSpaceV2SpaceLink("https://design.example.test", "")).toBeNull();
    expect(formatSpaceV2SpaceLink("javascript:alert(1)", token)).toBeNull();
    expect(formatSpaceV2SpaceLink("file:///c:/tmp", token)).toBeNull();
    expect(formatSpaceV2SpaceLink("", token)).toBeNull();
    expect(formatSpaceV2SpaceLink(null, token)).toBeNull();
  });
});

// --- the plan (spec 083 §4) --------------------------------------------------

const PLAN_INPUT: AdminFrameIssuePlanInput = {
  geometry: {
    aspect: 1.5,
    borderPercentOfWidth: 5.5,
    matColor: "#FFFFFF",
    contentInsetPx: 8,
  },
  frameColor: "#1a1a1a",
  logicalWidth: 320,
  image: { imageRef: "admin-proof-1", intrinsicWidth: 1200, intrinsicHeight: 800 },
  transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: 0 },
};

describe("buildAdminFrameIssuePlan", () => {
  it("emits a frame plan whose canvas follows the projected aspect", () => {
    const built = buildAdminFrameIssuePlan(PLAN_INPUT);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.plan.kind).toBe("frame");
    expect(built.plan.logicalCanvas).toEqual({ width: 320, height: 480 });
  });

  it("refuses unusable geometry, width, colour and image without throwing", () => {
    const refuse = (input: AdminFrameIssuePlanInput): void => {
      expect(buildAdminFrameIssuePlan(input)).toEqual({
        ok: false,
        code: "ADMIN_SPACE_V2_PLAN_FAILED",
      });
    };
    refuse({ ...PLAN_INPUT, logicalWidth: 320.5 });
    refuse({ ...PLAN_INPUT, logicalWidth: 0 });
    refuse({ ...PLAN_INPUT, frameColor: "black" });
    refuse({ ...PLAN_INPUT, geometry: { ...PLAN_INPUT.geometry, matColor: "#FFF" } });
    refuse({ ...PLAN_INPUT, geometry: { ...PLAN_INPUT.geometry, aspect: 0 } });
    refuse({ ...PLAN_INPUT, geometry: { ...PLAN_INPUT.geometry, contentInsetPx: 4 as 0 | 8 } });
    refuse({ ...PLAN_INPUT, image: { ...PLAN_INPUT.image, intrinsicWidth: 0 } });
    // A hostile getter is unusable input, never a half-built plan.
    const hostile = {
      ...PLAN_INPUT,
      get geometry(): AdminFrameIssuePlanInput["geometry"] {
        throw new Error("boom");
      },
    } as AdminFrameIssuePlanInput;
    refuse(hostile);
  });

  it("pins an axis whose image exactly covers the zone", () => {
    // A square image in a 2:3 frame covers the horizontal axis exactly at scale 1, so the
    // normalized x has no pixels to move into and must not be scaled by nothing.
    const built = buildAdminFrameIssuePlan({
      ...PLAN_INPUT,
      image: { imageRef: "admin-proof-1", intrinsicWidth: 600, intrinsicHeight: 900 },
      transform: { scale: 1, x: 1, y: 1, rotationQuarterTurns: 0 },
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const drawn = built.plan.commands.find((command) => command.type === "draw-image-cover");
    expect(drawn?.type).toBe("draw-image-cover");
    if (drawn?.type !== "draw-image-cover") return;
    expect(drawn.drawRect.x).toBe(drawn.clipRect.x);
    expect(drawn.drawRect.y).toBe(drawn.clipRect.y);
  });
});

/**
 * The regression that makes the admin preview honest (spec 083 §4, VERIFY unit 8).
 *
 * The admin cannot import `apps/mockup/**` in its product code, so it has its own thin plan
 * composition. That is exactly the kind of duplicate that drifts — so this test drives the
 * CUSTOMER's own modules (`buildFrameProductPlan` plus the replay's normalized→logical conversion,
 * both pure) with the same evidence and asserts the emitted commands are identical, not merely
 * equivalent. The replay controller's own wiring around these two calls is covered by spec 078.
 *
 * If either side's rectangles, rounding, colour canonicalisation, cover fit or pan conversion ever
 * change, this fails and the panel must not issue.
 */
describe("admin plan vs customer replay plan", () => {
  const customerPlan = (input: AdminFrameIssuePlanInput) => {
    const build = (transform: {
      scale: number;
      x: number;
      y: number;
      rotationQuarterTurns: 0 | 1 | 2 | 3;
    }) =>
      buildFrameProductPlan({
        geometry: {
          aspect: input.geometry.aspect,
          borderPercentOfWidth: input.geometry.borderPercentOfWidth,
          matColor: input.geometry.matColor,
          contentInsetPx: input.geometry.contentInsetPx,
          textZones: [],
          clockPreview: null,
        },
        frameColor: input.frameColor,
        logicalWidth: input.logicalWidth,
        userImage: {
          imageRef: input.image.imageRef,
          intrinsicSize: {
            width: input.image.intrinsicWidth,
            height: input.image.intrinsicHeight,
          },
          transform,
        },
      });

    const probe = build({
      scale: input.transform.scale,
      x: 0,
      y: 0,
      rotationQuarterTurns: input.transform.rotationQuarterTurns,
    });
    if (!probe.ok) return null;
    const probeImage = probe.plan.commands.find(
      (command) => command.type === "draw-image-cover" && command.layerId === "frame:user-image",
    );
    if (probeImage === undefined || probeImage.type !== "draw-image-cover") return null;
    const maxPan = maxPanFromRects(probeImage.clipRect, probeImage.drawRect);
    if (maxPan === null) return null;
    const logical = toLogicalTransform(
      {
        scale: input.transform.scale,
        x: input.transform.x,
        y: input.transform.y,
        rotationQuarterTurns: input.transform.rotationQuarterTurns,
      },
      maxPan,
    );
    if (logical === null) return null;
    const plan = build(logical);
    return plan.ok ? plan.plan : null;
  };

  const CASES: readonly { readonly name: string; readonly input: AdminFrameIssuePlanInput }[] = [
    { name: "identity", input: PLAN_INPUT },
    {
      name: "zoomed and panned",
      input: {
        ...PLAN_INPUT,
        transform: { scale: 2.35, x: -0.4, y: 0.75, rotationQuarterTurns: 0 },
      },
    },
    {
      name: "quarter turn",
      input: {
        ...PLAN_INPUT,
        transform: { scale: 1.4, x: 0.2, y: -0.9, rotationQuarterTurns: 1 },
      },
    },
    {
      name: "half turn on a landscape frame",
      input: {
        ...PLAN_INPUT,
        geometry: { ...PLAN_INPUT.geometry, aspect: 0.75, contentInsetPx: 0 },
        logicalWidth: 500,
        transform: { scale: 3, x: 1, y: -1, rotationQuarterTurns: 2 },
      },
    },
    {
      name: "three quarter turns, portrait source",
      input: {
        ...PLAN_INPUT,
        image: { imageRef: "admin-proof-9", intrinsicWidth: 640, intrinsicHeight: 1600 },
        transform: { scale: 1.05, x: -1, y: 0.33, rotationQuarterTurns: 3 },
      },
    },
    {
      name: "lowercase colours are canonicalised the same way",
      input: {
        ...PLAN_INPUT,
        frameColor: "#abcdef",
        geometry: { ...PLAN_INPUT.geometry, matColor: "#fafafa" },
      },
    },
  ];

  for (const { name, input } of CASES) {
    it(`emits the same commands as the customer path — ${name}`, () => {
      const admin = buildAdminFrameIssuePlan(input);
      const customer = customerPlan(input);
      expect(admin.ok).toBe(true);
      expect(customer).not.toBeNull();
      if (!admin.ok || customer === null) return;
      expect(JSON.stringify(admin.plan)).toBe(JSON.stringify(customer));
    });
  }
});
