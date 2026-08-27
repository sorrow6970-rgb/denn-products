import type { SpaceV2ProofReadFirebaseFacade } from "@denn/firebase/space-read";
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

  it("never builds the V2 proof side for a V1 document", async () => {
    const readDocument = vi.fn(async () => ({ exists: true, data: document }));
    const createFacade = vi.fn(async () => ({ readDocument }));
    const createProofFacade = vi.fn();
    const opener: SpaceOpenPort = {
      open: vi.fn(async () => ({
        ok: false as const,
        code: "SPACE_OPEN_DECRYPT_FAILED" as const,
      })),
    };
    const controller = createSpaceProductionController("?space=token", ENV, {
      createFacade,
      opener,
      createProofFacade,
    });
    controller.submitPassword("password");
    await vi.waitFor(() => expect(controller.getState().status).toBe("error"));
    expect(createFacade).toHaveBeenCalledOnce();
    expect(createProofFacade).not.toHaveBeenCalled();
  });

  it("builds the V2 proof reader only for a space-v2 marker, and never the V1 opener", async () => {
    const v2Document = { schema: "space-v2", enc: { salt: "s", iv: "i", ct: "c" } };
    const readDocument = vi.fn(async () => ({ exists: true, data: v2Document }));
    const proofFacade: SpaceV2ProofReadFirebaseFacade = {
      readMetadata: vi.fn(),
      readBytes: vi.fn(),
    };
    const createProofFacade = vi.fn(async () => proofFacade);
    const open = vi.fn();
    const controller = createSpaceProductionController("?space=token", ENV, {
      createFacade: vi.fn(async () => ({ readDocument })),
      opener: { open } as unknown as SpaceOpenPort,
      createProofFacade,
    });

    expect(createProofFacade).not.toHaveBeenCalled();
    controller.submitPassword("password");
    await vi.waitFor(() => expect(controller.getState().status).toBe("error"));

    expect(createProofFacade).toHaveBeenCalledOnce();
    expect(createProofFacade).toHaveBeenCalledWith({
      apiKey: "key",
      authDomain: "auth.example",
      projectId: "project",
      storageBucket: "bucket",
      appId: "app",
    });
    expect(open).not.toHaveBeenCalled();
    // The document was rejected before any byte read, so the proof facade was never used.
    expect(proofFacade.readMetadata).not.toHaveBeenCalled();
    expect(proofFacade.readBytes).not.toHaveBeenCalled();
  });

  it("fails a V2 document closed when Firebase is unconfigured", async () => {
    const createProofFacade = vi.fn();
    const controller = createSpaceProductionController(
      "?space=token",
      { ...ENV, VITE_DENN_SPACE_FIREBASE_APP_ID: "" },
      {
        createFacade: vi.fn(),
        opener: { open: vi.fn() } as unknown as SpaceOpenPort,
        createProofFacade,
      },
    );
    controller.submitPassword("password");
    await vi.waitFor(() => expect(controller.getState().status).toBe("error"));
    expect(createProofFacade).not.toHaveBeenCalled();
  });
});
