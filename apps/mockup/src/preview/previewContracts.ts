// Pure contracts for the customer preview composer (spec 027). No React, DOM, Canvas, Firebase or
// IO — only values the composer needs to decide what may be shown.
//
// Nothing here auto-selects a colour, invents a default width or approximates an unsupported
// appearance: an option that the deterministic render plan cannot express is dropped, not rounded.

import type { CatalogDocumentV1 } from "@denn/shared";

export interface PreviewColorOption {
  /** customer-visible name; the control never conveys the choice by colour alone. */
  readonly name: string;
  /** canonical uppercase `#RRGGBB`. */
  readonly value: string;
}

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

/**
 * Case body colours (spec 027 §색상 계약). The catalog carries NO case body colour, so this first
 * connection uses the solid palette evidenced in the legacy customer tool
 * (`denn-mockup-tool.html:322-330`). `transparent` is deliberately absent: the render plan has no
 * pattern fill, and approximating it with a solid colour would show the customer a wrong product.
 */
export const CASE_BODY_COLORS: readonly PreviewColorOption[] = [
  { name: "블랙", value: "#1A1A1A" },
  { name: "화이트", value: "#FFFFFF" },
  { name: "베이지", value: "#D4C5B0" },
  { name: "네이비", value: "#2B3A4A" },
  { name: "버건디", value: "#7B3F3F" },
  { name: "그린", value: "#3A5C3A" },
  { name: "브라운", value: "#8B4513" },
  { name: "라벤더", value: "#C8A0D0" },
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Frame colours the deterministic plan can actually fill: an exact `#RRGGBB` solid with a usable
 * name. `grain: true` items are EXCLUDED (the legacy wood texture is a random overlay, which a
 * deterministic plan cannot reproduce and a flat fill would misrepresent). No id, no raw catalog
 * object and no diagnostic code leaves this function — only a name and a canonical colour.
 *
 * Two catalog entries may carry the SAME colour (e.g. `#1a1a1a` and `#1A1A1A`). The customer picks a
 * colour, not a catalog row, and the UI keys a swatch by that value — so the result is deduplicated
 * by canonical value, deterministically keeping the FIRST valid entry in source order and its name.
 */
export function readFrameColorOptions(document: CatalogDocumentV1): readonly PreviewColorOption[] {
  const options: PreviewColorOption[] = [];
  try {
    const data: unknown = document?.data;
    if (!isPlainObject(data)) return options;
    const raw: unknown = data.frameColors;
    if (!Array.isArray(raw)) return options;
    const seen = new Set<string>();
    for (const item of raw as readonly unknown[]) {
      if (!isPlainObject(item)) continue;
      if (item.grain === true) continue;
      const name = item.name;
      const fill = item.fill;
      if (typeof name !== "string" || name.trim().length === 0) continue;
      if (typeof fill !== "string" || !HEX6.test(fill)) continue;
      const value = fill.toUpperCase();
      if (seen.has(value)) continue; // a later duplicate never becomes a second swatch
      seen.add(value);
      options.push({ name: name.trim(), value });
    }
  } catch {
    // a hostile getter or revoked Proxy simply yields no options
    return [];
  }
  return options;
}

/** Upper bound for the frame preview's logical width, in logical px (spec 027 §UX 5). */
export const FRAME_MAX_LOGICAL_WIDTH = 500;

/**
 * Frame logical width from the measured composer content box:
 * `max(1, round(min(contentBoxWidth, 500)))`. A non-finite or non-positive measurement is NOT a
 * width — the caller waits instead of inventing one.
 */
export function resolveFrameLogicalWidth(contentBoxWidth: number): number | null {
  if (typeof contentBoxWidth !== "number" || !Number.isFinite(contentBoxWidth)) return null;
  if (contentBoxWidth <= 0) return null;
  return Math.max(1, Math.round(Math.min(contentBoxWidth, FRAME_MAX_LOGICAL_WIDTH)));
}

/** Fixed, customer-safe copy. Never a code, an id, a file name, a URL or an exception. */
export const PREVIEW_MESSAGES = {
  pickColor: "색상을 선택해 주세요.",
  pickImage: "사진을 선택해 주세요.",
  loadingImage: "사진을 준비하는 중입니다.",
  imageFailed: "사진을 불러오지 못했습니다. 다른 파일을 선택해 주세요.",
  noColors: "선택할 수 있는 색상이 없습니다.",
  unavailable: "미리보기를 만들 수 없습니다.",
  measuring: "미리보기 크기를 확인하는 중입니다.",
  /** spec 028 fail-closed: the template's own artwork could not be drawn. No code, id or url. */
  templateArtFailed: "템플릿 이미지를 불러오지 못해 미리보기를 표시할 수 없습니다.",
  templateArtLoading: "템플릿 이미지를 준비하는 중입니다.",
} as const;

/** Canvas accessible names are fixed strings — never a product name or a selection id. */
export const PREVIEW_CANVAS_NAME = {
  case: "케이스 미리보기",
  frame: "액자 미리보기",
} as const;

/** Zone slots are numbered by position; no catalog label reaches the customer here. */
export const zoneSlotLabel = (index: number): string => `사진 ${index + 1}`;
