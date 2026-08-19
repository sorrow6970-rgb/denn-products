import { describe, expect, it, vi } from "vitest";
import { createSpaceCrypto, type SpaceCryptoPort } from "./crypto";
import { createSpaceOpenPort } from "./open";

const envelope = {
  salt: "AAECAwQFBgcICQoLDA0ODw==",
  iv: "EBESExQVFhcYGRob",
  ct: "l+K0Xv7nnslbRvPYSyv2Wn8V4pOc4gjyqtr55KOL3Pr4yz7eh5vAcatSzVALe0bz+8ayWLPxP3AK1SH4SafChPBViBC9",
};

const document = {
  schema: "space-v1",
  enc: envelope,
  ownerMeta: { label: "고객" },
  createdAt: "2026-08-19T00:00:00.000Z",
};

const scene = {
  schema: "space-scene-v1",
  design: { tplId: "tpl", texts: { main: "안녕" } },
  room: { bgId: "room", controls: { size: 1 } },
};

function decryptPort(result: Awaited<ReturnType<SpaceCryptoPort["decryptJson"]>>) {
  return { decryptJson: vi.fn(async () => result) };
}

describe("space local read pipeline", () => {
  it("validates, decrypts and returns only projected metadata plus scene", async () => {
    const crypto = decryptPort({ ok: true, value: { ...scene, future: "ignored" } });
    const result = await createSpaceOpenPort(crypto).open({ ...document, future: "ignored" }, "pw");
    expect(crypto.decryptJson).toHaveBeenCalledOnce();
    expect(crypto.decryptJson).toHaveBeenCalledWith(envelope, "pw");
    expect(result).toEqual({
      ok: true,
      value: {
        ownerLabel: "고객",
        createdAt: "2026-08-19T00:00:00.000Z",
        scene: {
          schema: "space-scene-v1",
          design: {
            tplId: "tpl",
            sizeId: null,
            colorId: null,
            texts: { main: "안녕", name: "", name2: "", date: "", sub: "" },
            imgT: null,
          },
          room: {
            bgId: "room",
            guideIndex: null,
            pos: null,
            sunPos: null,
            controls: { size: 1 },
            settings: null,
            common: null,
            gallery: [],
          },
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain(envelope.ct);
    expect(JSON.stringify(result)).not.toContain("pw");
  });

  it.each([null, {}, { ...document, schema: "space-v2" }])(
    "rejects an invalid document before crypto",
    async (input) => {
      const crypto = decryptPort({ ok: true, value: scene });
      await expect(createSpaceOpenPort(crypto).open(input, "pw")).resolves.toEqual({
        ok: false,
        code: "SPACE_OPEN_INVALID_DOCUMENT",
      });
      expect(crypto.decryptJson).not.toHaveBeenCalled();
    },
  );

  it.each([null, 1, ""])("rejects an invalid password before crypto", async (password) => {
    const crypto = decryptPort({ ok: true, value: scene });
    await expect(createSpaceOpenPort(crypto).open(document, password)).resolves.toEqual({
      ok: false,
      code: "SPACE_OPEN_INVALID_INPUT",
    });
    expect(crypto.decryptJson).not.toHaveBeenCalled();
  });

  it("maps crypto failure and rejection to one safe failure", async () => {
    const failed = decryptPort({ ok: false, code: "SPACE_DECRYPT_FAILED" });
    await expect(createSpaceOpenPort(failed).open(document, "secret-password")).resolves.toEqual({
      ok: false,
      code: "SPACE_OPEN_DECRYPT_FAILED",
    });
    const rejected = { decryptJson: vi.fn(async () => Promise.reject(new Error("raw-secret"))) };
    const result = await createSpaceOpenPort(rejected).open(document, "secret-password");
    expect(result).toEqual({ ok: false, code: "SPACE_OPEN_DECRYPT_FAILED" });
    expect(JSON.stringify(result)).not.toMatch(/secret|raw/);
  });

  it("fails closed when decrypted plaintext is not a valid scene", async () => {
    const crypto = decryptPort({ ok: true, value: { schema: "space-scene-v2" } });
    await expect(createSpaceOpenPort(crypto).open(document, "pw")).resolves.toEqual({
      ok: false,
      code: "SPACE_OPEN_INVALID_SCENE",
    });
    expect(crypto.decryptJson).toHaveBeenCalledOnce();
  });

  it("composes the real local crypto roundtrip without Firebase or network", async () => {
    const crypto = createSpaceCrypto();
    const encrypted = await crypto.encryptJson(scene, "비밀번호🔒");
    expect(encrypted.ok).toBe(true);
    if (!encrypted.ok) return;
    const result = await createSpaceOpenPort(crypto).open(
      { schema: "space-v1", enc: encrypted.value },
      "비밀번호🔒",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scene.design.texts.main).toBe("안녕");
    expect(result.value.ownerLabel).toBe("");
  });
});
