import type { SpaceOpenPort } from "@denn/spaces";
import { describe, expect, it, vi } from "vitest";
import { createSpaceProductionController } from "./composition";

const ENV = {
  VITE_DENN_SPACE_FIREBASE_ENABLED: "true",
  VITE_DENN_SPACE_FIREBASE_API_KEY: "key",
  VITE_DENN_SPACE_FIREBASE_AUTH_DOMAIN: "auth.example",
  VITE_DENN_SPACE_FIREBASE_PROJECT_ID: "project",
  VITE_DENN_SPACE_FIREBASE_STORAGE_BUCKET: "bucket",
  VITE_DENN_SPACE_FIREBASE_APP_ID: "app",
};
const document = { schema: "space-v1", enc: { salt: "s", iv: "i", ct: "c" } };

describe("production space composition", () => {
  it.each(["", "?space=one&space=two"])(
    "keeps Firebase at zero outside a valid explicit submit: %s",
    async (search) => {
      const factory = vi.fn(async () => ({
        readDocument: vi.fn(async () => ({ exists: true, data: document })),
      }));
      const opener: SpaceOpenPort = {
        open: vi.fn(async () => ({
          ok: false as const,
          code: "SPACE_OPEN_DECRYPT_FAILED" as const,
        })),
      };
      const controller = createSpaceProductionController(search, ENV, {
        createFacade: factory,
        opener,
      });
      expect(factory).not.toHaveBeenCalled();
      controller.submitPassword("password");
      await Promise.resolve();
      expect(factory).not.toHaveBeenCalled();
    },
  );

  it("initializes once on submit and reuses the document for password retry", async () => {
    const readDocument = vi.fn(async () => ({ exists: true, data: document }));
    const factory = vi.fn(async () => ({ readDocument }));
    const open = vi.fn(async () => ({
      ok: false as const,
      code: "SPACE_OPEN_DECRYPT_FAILED" as const,
    }));
    const controller = createSpaceProductionController("?space=token", ENV, {
      createFacade: factory,
      opener: { open },
    });

    expect(factory).not.toHaveBeenCalled();
    controller.submitPassword("first");
    await vi.waitFor(() => expect(controller.getState().status).toBe("error"));
    controller.submitPassword("second");
    await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(2));
    expect(factory).toHaveBeenCalledOnce();
    expect(readDocument).toHaveBeenCalledOnce();
  });

  it("fails closed with zero initialization for incomplete config", async () => {
    const factory = vi.fn();
    const opener: SpaceOpenPort = {
      open: vi.fn(async () => ({
        ok: false as const,
        code: "SPACE_OPEN_DECRYPT_FAILED" as const,
      })),
    };
    const controller = createSpaceProductionController(
      "?space=token",
      { ...ENV, VITE_DENN_SPACE_FIREBASE_APP_ID: "" },
      { createFacade: factory, opener },
    );
    controller.submitPassword("password");
    await vi.waitFor(() => expect(controller.getState().status).toBe("error"));
    expect(factory).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({
      code: "SPACE_VIEW_LOAD_FAILED",
      retryable: false,
    });
  });

  it("maps factory rejection without leaking raw data", async () => {
    const factory = vi.fn(async () => {
      throw new Error("raw-project-token");
    });
    const opener: SpaceOpenPort = {
      open: vi.fn(async () => ({
        ok: false as const,
        code: "SPACE_OPEN_DECRYPT_FAILED" as const,
      })),
    };
    const controller = createSpaceProductionController("?space=token", ENV, {
      createFacade: factory,
      opener,
    });
    controller.submitPassword("password");
    await vi.waitFor(() => expect(controller.getState().status).toBe("error"));
    expect(JSON.stringify(controller.getState())).not.toContain("raw-project-token");
    expect(controller.getState()).toMatchObject({ retryable: false });
  });
});
