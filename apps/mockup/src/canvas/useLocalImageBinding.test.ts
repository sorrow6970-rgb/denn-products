// Contract for the thin React wrapper (spec 026 §3). Rendered through react-dom/server in the node
// environment — no jsdom, no DOM, no browser image API.
//
// SCOPE (spec 026 보완 라운드 1): a static render proves ONLY the initial snapshot and that render
// touches no browser API. It proves NOTHING about mount, unmount, StrictMode remount, effect
// cleanup, disposal or object-URL bookkeeping — those are verified in a real browser by
// `tests/e2e/canvas-surface.spec.ts` ("real hook owner lifecycle"), which mounts and unmounts the
// component that owns this hook.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { UseLocalImageBindingResult } from "./useLocalImageBinding";
import { useLocalImageBinding } from "./useLocalImageBinding";

function Probe({ onRender }: { onRender: (r: UseLocalImageBindingResult) => void }) {
  const result = useLocalImageBinding();
  onRender(result);
  return createElement("p", { "data-testid": "probe" }, result.state.status);
}

describe("useLocalImageBinding", () => {
  it("starts idle and exposes the controller surface without touching a browser API", () => {
    let captured: UseLocalImageBindingResult | null = null;
    const markup = renderToStaticMarkup(
      createElement(Probe, {
        onRender: (r) => {
          captured = r;
        },
      }),
    );

    expect(markup).toContain("idle");
    const result = captured as UseLocalImageBindingResult | null;
    expect(result).not.toBeNull();
    expect(result?.state).toEqual({ status: "idle" });
    expect(typeof result?.load).toBe("function");
    expect(typeof result?.clear).toBe("function");
    expect(result?.bindings.get("user-image-1")).toBeUndefined();
  });

  it("renders no url, file name or drawable into the markup", () => {
    const markup = renderToStaticMarkup(createElement(Probe, { onRender: () => undefined }));
    for (const forbidden of ["blob:", "data:", "base64", "http"]) {
      expect(markup).not.toContain(forbidden);
    }
  });
});
