// S47 internal managed plan builder. No React/DOM/network, resource acquisition or UI wiring.
import type { FramePreviewGeometry } from "@denn/shared";
import type { PreviewRenderPlan } from "@denn/render";
import { createFontBoundExecution, type FontBoundExecution } from "../canvas/font-bound-execution";
import { buildFrameProductPlan, type FrameProductPlanInput } from "../canvas/productPlan";
import type { ManagedFontMeasurementSession } from "./composer-font-proof";

type FrameTextZone = FramePreviewGeometry["textZones"][number];

type Failure = {
  readonly ok: false;
  readonly code:
    | "MANAGED_PLAN_INVALID_INPUT"
    | "MANAGED_PLAN_FONT_UNAVAILABLE"
    | "MANAGED_PLAN_BUILD_FAILED";
};
const fail = (code: Failure["code"]): Failure => ({ ok: false, code });

// Only a new builder-owned JSON tree reaches this function; never freeze caller data.
function freezeOwned(value: unknown): void {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeOwned(child);
    Object.freeze(value);
  }
}

export function buildManagedFrameProductPlan(
  input: Omit<FrameProductPlanInput, "measureText">,
  session: ManagedFontMeasurementSession,
):
  | { readonly ok: true; readonly plan: PreviewRenderPlan; readonly execution: FontBoundExecution }
  | Failure {
  try {
    if (!session.isCurrent()) return fail("MANAGED_PLAN_FONT_UNAVAILABLE");
    const bindings = session.bindings;
    const source = input.geometry;
    const aspect = source.aspect;
    const borderPercentOfWidth = source.borderPercentOfWidth;
    const matColor = source.matColor;
    const contentInsetPx = source.contentInsetPx;
    const clockPreview = source.clockPreview;
    const rawZones = source.textZones;
    const rawValues = input.textValues;
    const get = rawValues?.get;
    const frameColor = input.frameColor;
    const logicalWidth = input.logicalWidth;
    const userImage = input.userImage;
    const templateArt = input.templateArt;
    if (!Array.isArray(rawZones) || (rawValues !== undefined && typeof get !== "function"))
      return fail("MANAGED_PLAN_INVALID_INPUT");
    const count = rawZones.length;
    if (!Number.isSafeInteger(count) || count < 0 || count > 5)
      return fail("MANAGED_PLAN_INVALID_INPUT");
    const textZones: FrameTextZone[] = [];
    const values = new Map<string, string>();
    const keys = new Set<string>();
    for (let index = 0; index < count; index++) {
      const raw = rawZones[index];
      // Explicit field snapshot excludes placeholder and caller spread/iterator hooks.
      const zone: FrameTextZone = {
        key: raw.key,
        xPercent: raw.xPercent,
        yPercent: raw.yPercent,
        boxWidthPercent: raw.boxWidthPercent,
        fontSizePercent: raw.fontSizePercent,
        align: raw.align,
        fontFamily: raw.fontFamily,
        bold: raw.bold,
        italic: raw.italic,
        color: raw.color,
        lineHeight: raw.lineHeight,
        letterSpacingPercent: raw.letterSpacingPercent,
        rotationDegrees: raw.rotationDegrees,
        maxChars: raw.maxChars,
        maxLines: raw.maxLines,
      };
      if (!["main", "name", "name2", "date", "sub"].includes(zone.key) || keys.has(zone.key))
        return fail("MANAGED_PLAN_INVALID_INPUT");
      keys.add(zone.key);
      const text: unknown = get ? Reflect.apply(get, rawValues, [zone.key]) : undefined;
      if (text !== undefined && typeof text !== "string") return fail("MANAGED_PLAN_INVALID_INPUT");
      if (typeof text === "string") values.set(zone.key, text);
      if (typeof text === "string" && text !== "") {
        if (typeof zone.bold !== "boolean" || typeof zone.italic !== "boolean")
          return fail("MANAGED_PLAN_INVALID_INPUT");
        const binding = bindings.find(
          (item) =>
            item.family === zone.fontFamily &&
            item.weight === (zone.bold ? "bold" : "normal") &&
            item.italic === zone.italic,
        );
        if (!binding) return fail("MANAGED_PLAN_FONT_UNAVAILABLE");
        textZones.push({ ...zone, fontFamily: binding.alias });
      } else textZones.push(zone);
    }
    const geometry: FramePreviewGeometry = {
      aspect,
      borderPercentOfWidth,
      matColor,
      contentInsetPx,
      clockPreview,
      textZones,
    };
    if (!session.isCurrent()) return fail("MANAGED_PLAN_FONT_UNAVAILABLE");
    const result = buildFrameProductPlan({
      geometry,
      frameColor,
      logicalWidth,
      userImage,
      templateArt,
      textValues: values,
      measureText: session.measureText,
    });
    if (!session.isCurrent()) return fail("MANAGED_PLAN_FONT_UNAVAILABLE");
    if (!result.ok) return fail("MANAGED_PLAN_BUILD_FAILED");
    for (const command of result.plan.commands) {
      if (command.type !== "draw-text") continue;
      if (
        !bindings.some(
          (item) =>
            item.alias === command.font.family &&
            item.weight === command.font.weight &&
            item.italic === command.font.italic,
        ) ||
        command.font.fallback !== "sans-serif"
      )
        return fail("MANAGED_PLAN_FONT_UNAVAILABLE");
    }
    freezeOwned(result.plan);
    if (!session.isCurrent()) return fail("MANAGED_PLAN_FONT_UNAVAILABLE");
    const execution = createFontBoundExecution(
      result.plan,
      () => session.isCurrent(),
      () => session.borrowExecution(),
    );
    return Object.freeze({ ok: true as const, plan: result.plan, execution });
  } catch {
    return fail("MANAGED_PLAN_INVALID_INPUT");
  }
}
