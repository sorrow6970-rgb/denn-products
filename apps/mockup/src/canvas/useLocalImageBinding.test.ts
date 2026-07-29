// Contract for the thin React wrapper (spec 026 §3). Rendered through react-dom/server in the node
// environment — no jsdom, no DOM, no browser image API — so this pins that the hook itself adds no
// behaviour and reaches for nothing at render time. Real mount/unmount/StrictMode behaviour is
// covered by the Chromium E2E fixture.

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
