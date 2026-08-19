import { projectFramePreviewGeometry, type CatalogDocumentV1 } from "@denn/shared";
import { readSpaceScene } from "@denn/spaces";
import { useEffect, useState } from "react";
import type { TextMeasurePort } from "../canvas/productPlan";

type PlanFont = Parameters<TextMeasurePort>[0]["font"];

export type SpaceFrameFontRequest =
  | { readonly status: "none" }
  | {
      readonly status: "required";
      readonly requirements: readonly {
        readonly shorthand: string;
        readonly font: PlanFont;
      }[];
    }
  | { readonly status: "invalid" };

export type SpaceFrameFontState =
  | { readonly status: "dormant" }
  | { readonly status: "waiting" }
  | { readonly status: "not-required" }
  | { readonly status: "ready"; readonly measureText: TextMeasurePort }
  | { readonly status: "failed" };

export interface SpaceFrameFontEnvironment {
  waitUntilReady(): Promise<void>;
  check(shorthand: string): boolean;
  createMeasureText(): TextMeasurePort | null;
}

export type SpaceFrameFontEnvironmentFactory = () => SpaceFrameFontEnvironment;

const shorthand = (font: PlanFont): string => {
  const style = font.italic ? "italic " : "";
  const weight = font.weight === "bold" ? "bold " : "";
  return `${style}${weight}${font.sizePx}px "${font.family}", ${font.fallback}`;
};

const requirement = (
  zone: {
    readonly fontFamily: string;
    readonly fontSizePercent: number;
    readonly bold: boolean;
    readonly italic: boolean;
  },
  logicalWidth: number,
) => {
  const font: PlanFont = {
    family: zone.fontFamily,
    sizePx: (zone.fontSizePercent / 100) * logicalWidth,
    weight: zone.bold ? "bold" : "normal",
    italic: zone.italic,
    fallback: "sans-serif",
  };
  return { shorthand: shorthand(font), font } as const;
};

/** Derive exact font checks only for authored zones whose current scene value is nonempty. */
export function resolveSpaceFrameFontRequest(
  document: unknown,
  sceneInput: unknown,
  logicalWidth: unknown,
): SpaceFrameFontRequest {
  try {
    if (
      typeof logicalWidth !== "number" ||
      !Number.isFinite(logicalWidth) ||
      logicalWidth <= 0 ||
      !Number.isInteger(logicalWidth)
    ) {
      return { status: "invalid" };
    }
    const sceneRead = readSpaceScene(sceneInput);
    if (!sceneRead.ok) return { status: "invalid" };
    const { tplId, sizeId, texts } = sceneRead.value.design;
    if (tplId === null || sizeId === null) return { status: "invalid" };
    const geometry = projectFramePreviewGeometry(document as CatalogDocumentV1, {
      frameSizeId: sizeId,
      templateId: tplId,
    });
    if (!geometry.ok) return { status: "invalid" };

    const unique = new Map<string, ReturnType<typeof requirement>>();
    for (const zone of geometry.value.textZones) {
      if ((texts[zone.key] ?? "") === "") continue;
      const item = requirement(zone, logicalWidth);
      unique.set(item.shorthand, item);
    }
    return unique.size === 0
      ? { status: "none" }
      : { status: "required", requirements: [...unique.values()] };
  } catch {
    return { status: "invalid" };
  }
}

export function createBrowserSpaceFrameFontEnvironment(): SpaceFrameFontEnvironment {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  return {
    waitUntilReady: () =>
      fonts === undefined
        ? Promise.reject(new Error("unavailable"))
        : Promise.resolve(fonts.ready).then(() => undefined),
    check: (value) =>
      fonts !== undefined && typeof fonts.check === "function" && fonts.check(value),
    createMeasureText: () => {
      let context: CanvasRenderingContext2D | null = null;
      try {
        context = document.createElement("canvas").getContext("2d");
      } catch {
        return null;
      }
      if (context === null) return null;
      return ({ text, font }) => {
        context.font = shorthand(font);
        return context.measureText(text).width;
      };
    },
  };
}

export function useSpaceFrameFonts(
  request: SpaceFrameFontRequest | null,
  createEnvironment: SpaceFrameFontEnvironmentFactory = createBrowserSpaceFrameFontEnvironment,
): SpaceFrameFontState {
  const [owned, setOwned] = useState<{
    readonly request: SpaceFrameFontRequest | null;
    readonly value: SpaceFrameFontState;
  }>(() => ({ request, value: request === null ? { status: "dormant" } : { status: "waiting" } }));

  useEffect(() => {
    let cancelled = false;
    const publish = (value: SpaceFrameFontState): void => setOwned({ request, value });
    if (request === null) {
      publish({ status: "dormant" });
      return;
    }
    if (request.status === "invalid") {
      publish({ status: "failed" });
      return;
    }
    if (request.status === "none") {
      publish({ status: "not-required" });
      return;
    }

    publish({ status: "waiting" });
    let environment: SpaceFrameFontEnvironment;
    try {
      environment = createEnvironment();
    } catch {
      publish({ status: "failed" });
      return;
    }
    void environment
      .waitUntilReady()
      .then(() => {
        if (cancelled) return;
        try {
          if (!request.requirements.every((item) => environment.check(item.shorthand))) {
            publish({ status: "failed" });
            return;
          }
          const measureText = environment.createMeasureText();
          if (measureText === null) {
            publish({ status: "failed" });
            return;
          }
          const probe = measureText({ text: "M", font: request.requirements[0].font });
          publish(Number.isFinite(probe) ? { status: "ready", measureText } : { status: "failed" });
        } catch {
          publish({ status: "failed" });
        }
      })
      .catch(() => {
        if (!cancelled) publish({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [createEnvironment, request]);

  if (owned.request === request) return owned.value;
  if (request === null) return { status: "dormant" };
  if (request.status === "invalid") return { status: "failed" };
  if (request.status === "none") return { status: "not-required" };
  return { status: "waiting" };
}
