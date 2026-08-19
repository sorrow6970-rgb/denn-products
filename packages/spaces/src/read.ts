import type { SpaceEncryptedEnvelope } from "./crypto";

export const SPACE_DOCUMENT_VERSION = "space-v1" as const;

export type SpaceReadErrorCode = "SPACE_INVALID_DOCUMENT" | "SPACE_INVALID_SCENE";
export type SpaceReadResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: SpaceReadErrorCode };

export interface SpaceDocumentV1 {
  readonly schema: typeof SPACE_DOCUMENT_VERSION;
  readonly enc: SpaceEncryptedEnvelope;
  readonly ownerLabel: string;
  readonly createdAt: string;
}

export interface SpacePoint {
  readonly x: number;
  readonly y: number;
}

export interface SpaceImageTransform extends SpacePoint {
  readonly scale: number;
  readonly rot?: number;
}

export interface SpaceSceneV1 {
  readonly schema: "space-scene-v1";
  readonly design: {
    readonly tplId: string | null;
    readonly sizeId: string | null;
    readonly colorId: string | null;
    readonly texts: Readonly<Record<"main" | "name" | "name2" | "date" | "sub", string>>;
    readonly photoUrl?: string;
    readonly imgT: SpaceImageTransform | null;
    readonly clockOn?: boolean;
  };
  readonly room: {
    readonly bgId: string | null;
    readonly guideIndex: number | null;
    readonly guideBgUrl?: string;
    readonly pos: SpacePoint | null;
    readonly sunOn?: boolean;
    readonly sunPos: SpacePoint | null;
    readonly controls: Readonly<Record<string, string | number | boolean>>;
    readonly settings: Readonly<Record<string, unknown>> | null;
    readonly common: Readonly<Record<string, unknown>> | null;
    readonly gallery: readonly {
      readonly name: string;
      readonly bgId: string;
      readonly url: string;
      readonly settings: Readonly<Record<string, unknown>> | null;
    }[];
  };
}

const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const TEXT_KEYS = ["main", "name", "name2", "date", "sub"] as const;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function standardBase64(value: unknown, bytes?: number): value is string {
  if (typeof value !== "string" || value === "" || !BASE64.test(value)) return false;
  try {
    const decoded = atob(value);
    return bytes === undefined ? decoded.length >= 16 : decoded.length === bytes;
  } catch {
    return false;
  }
}

function nullableString(value: unknown): string | null | undefined {
  return value === undefined || value === null
    ? null
    : typeof value === "string"
      ? value
      : undefined;
}

function point(value: unknown): SpacePoint | null | undefined {
  if (value === undefined || value === null) return null;
  const record = object(value);
  if (!record || typeof record.x !== "number" || typeof record.y !== "number") return undefined;
  if (!Number.isFinite(record.x) || !Number.isFinite(record.y)) return undefined;
  return { x: record.x, y: record.y };
}

function jsonObject(value: unknown): Readonly<Record<string, unknown>> | null | undefined {
  if (value === undefined || value === null) return null;
  if (!object(value)) return undefined;
  try {
    const snapshot = JSON.parse(JSON.stringify(value)) as unknown;
    return object(snapshot) ?? undefined;
  } catch {
    return undefined;
  }
}

export function readSpaceDocument(input: unknown): SpaceReadResult<SpaceDocumentV1> {
  try {
    const doc = object(input);
    const enc = object(doc?.enc);
    const owner = object(doc?.ownerMeta);
    if (!doc || doc.schema !== SPACE_DOCUMENT_VERSION || !enc) throw new Error("invalid");
    if (!standardBase64(enc.salt, 16) || !standardBase64(enc.iv, 12) || !standardBase64(enc.ct))
      throw new Error("invalid");
    if (doc.createdAt !== undefined && typeof doc.createdAt !== "string")
      throw new Error("invalid");
    if (owner?.label !== undefined && typeof owner.label !== "string") throw new Error("invalid");
    return {
      ok: true,
      value: {
        schema: SPACE_DOCUMENT_VERSION,
        enc: { salt: enc.salt, iv: enc.iv, ct: enc.ct },
        ownerLabel: typeof owner?.label === "string" ? owner.label : "",
        createdAt: typeof doc.createdAt === "string" ? doc.createdAt : "",
      },
    };
  } catch {
    return { ok: false, code: "SPACE_INVALID_DOCUMENT" };
  }
}

export function readSpaceScene(input: unknown): SpaceReadResult<SpaceSceneV1> {
  try {
    const scene = object(input);
    const design = object(scene?.design);
    const room = object(scene?.room);
    if (scene?.schema !== "space-scene-v1" || !design || !room) throw new Error("invalid");

    const tplId = nullableString(design.tplId);
    const sizeId = nullableString(design.sizeId);
    const colorId = nullableString(design.colorId);
    if (tplId === undefined || sizeId === undefined || colorId === undefined)
      throw new Error("invalid");

    const textInput = design.texts == null ? {} : object(design.texts);
    if (!textInput) throw new Error("invalid");
    const texts = { main: "", name: "", name2: "", date: "", sub: "" };
    for (const key of TEXT_KEYS) {
      const value = textInput[key];
      if (value !== undefined && typeof value !== "string") throw new Error("invalid");
      texts[key] = typeof value === "string" ? value : "";
    }

    const transformInput = design.imgT === undefined ? null : object(design.imgT);
    let imgT: SpaceImageTransform | null = null;
    if (design.imgT !== undefined && design.imgT !== null) {
      if (!transformInput) throw new Error("invalid");
      const { scale, x, y, rot } = transformInput;
      if (![scale, x, y].every((value) => typeof value === "number" && Number.isFinite(value)))
        throw new Error("invalid");
      if (rot !== undefined && (typeof rot !== "number" || !Number.isFinite(rot)))
        throw new Error("invalid");
      imgT = {
        scale: scale as number,
        x: x as number,
        y: y as number,
        ...(rot === undefined ? {} : { rot }),
      };
    }

    if (design.photoUrl !== undefined && typeof design.photoUrl !== "string")
      throw new Error("invalid");
    if (design.clockOn !== undefined && typeof design.clockOn !== "boolean")
      throw new Error("invalid");

    const bgId = nullableString(room.bgId);
    if (bgId === undefined) throw new Error("invalid");
    const guideIndex =
      room.guideIndex === undefined || room.guideIndex === null ? null : room.guideIndex;
    if (guideIndex !== null && (!Number.isInteger(guideIndex) || (guideIndex as number) < 0))
      throw new Error("invalid");
    if (room.guideBgUrl !== undefined && typeof room.guideBgUrl !== "string")
      throw new Error("invalid");
    if (room.sunOn !== undefined && typeof room.sunOn !== "boolean") throw new Error("invalid");
    const pos = point(room.pos);
    const sunPos = point(room.sunPos);
    if (pos === undefined || sunPos === undefined) throw new Error("invalid");

    const controlsInput = room.controls == null ? {} : object(room.controls);
    if (!controlsInput) throw new Error("invalid");
    const controls: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(controlsInput)) {
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
        throw new Error("invalid");
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error("invalid");
      controls[key] = value;
    }

    const settings = jsonObject(room.settings);
    const common = jsonObject(room.common);
    if (settings === undefined || common === undefined) throw new Error("invalid");
    const galleryInput = room.gallery == null ? [] : room.gallery;
    if (!Array.isArray(galleryInput)) throw new Error("invalid");
    const gallery = galleryInput.map((entry) => {
      const item = object(entry);
      const itemSettings = jsonObject(item?.settings);
      if (
        !item ||
        typeof item.name !== "string" ||
        typeof item.bgId !== "string" ||
        typeof item.url !== "string"
      )
        throw new Error("invalid");
      if (itemSettings === undefined) throw new Error("invalid");
      return { name: item.name, bgId: item.bgId, url: item.url, settings: itemSettings };
    });

    return {
      ok: true,
      value: {
        schema: "space-scene-v1",
        design: {
          tplId,
          sizeId,
          colorId,
          texts,
          ...(typeof design.photoUrl === "string" ? { photoUrl: design.photoUrl } : {}),
          imgT,
          ...(typeof design.clockOn === "boolean" ? { clockOn: design.clockOn } : {}),
        },
        room: {
          bgId,
          guideIndex: guideIndex as number | null,
          ...(typeof room.guideBgUrl === "string" ? { guideBgUrl: room.guideBgUrl } : {}),
          pos,
          ...(typeof room.sunOn === "boolean" ? { sunOn: room.sunOn } : {}),
          sunPos,
          controls,
          settings,
          common,
          gallery,
        },
      },
    };
  } catch {
    return { ok: false, code: "SPACE_INVALID_SCENE" };
  }
}
