// Static (server-rendered) contract for the surface component (spec 022 §2, §6). Uses the
// repository's existing react-dom/server pattern — no jsdom/RTL is introduced. Behaviour that needs
// a live DOM (observer, backing, pixels) is covered by surface.test.ts and the Chromium E2E.

import type { PreviewRenderPlan } from "@denn/render";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreviewCanvasSurface } from "./PreviewCanvasSurface";
import type { PreviewImageBindings } from "./types";

const BINDINGS: PreviewImageBindings = new Map<string, CanvasImageSource>();

const PLAN: PreviewRenderPlan = {
  kind: "case",
  logicalCanvas: { width: 320, height: 240 },
  commands: [
    {
      type: "fill-rect",
      layerId: "case:body",
      rect: { x: 0, y: 0, width: 320, height: 240 },
      color: "#191A1D",
    },
  ],
};

const html = (name: string, className?: string): string =>
  renderToStaticMarkup(
    <PreviewCanvasSurface
      plan={PLAN}
      imageBindings={BINDINGS}
      accessibleName={name}
      className={className}
    />,
  );

describe("PreviewCanvasSurface", () => {
  it("renders a named canvas whose CSS size is the plan logical size", () => {
    const markup = html("미리보기");
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="미리보기"');
    expect(markup).toContain("width:320px");
    expect(markup).toContain("height:240px");
  });

  it("does not set the backing attributes in markup (the engine owns them)", () => {
    const markup = html("미리보기");
    expect(markup).not.toMatch(/<canvas[^>]*\swidth="/);
    expect(markup).not.toMatch(/<canvas[^>]*\sheight="/);
  });

  it("announces a waiting state before the first draw", () => {
    expect(html("미리보기")).toContain("미리보기를 준비하는 중입니다.");
  });

  it("refuses a blank accessible name with a safe message and no canvas", () => {
    for (const name of ["", "   ", "\t\n"]) {
      const markup = html(name);
      expect(markup).not.toContain("<canvas");
      expect(markup).toContain("미리보기를 표시할 수 없습니다.");
    }
  });

  it("passes an extra className through without replacing the base class", () => {
    const markup = html("미리보기", "extra-class");
    expect(markup).toContain("denn-canvas-surface extra-class");
  });

  it("puts no plan identifier, colour value or drawable into the DOM", () => {
    const markup = html("미리보기");
    for (const forbidden of ["case:body", "#191A1D", "imageRef", "layerId", "http", "data:"]) {
      expect(markup).not.toContain(forbidden);
    }
  });
});
