import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalImageProofController } from "./localImageBinding";
import type { TemplateArtProofController } from "./templateArtBinding";
import { type UseLocalImageBindingResult, useLocalImageBinding } from "./useLocalImageBinding";
import { type UseTemplateArtBindingResult, useTemplateArtBinding } from "./useTemplateArtBinding";

const harness = vi.hoisted(() => ({
  prepared: false,
  local: null as LocalImageProofController | null,
  art: null as TemplateArtProofController | null,
  calls: 0,
}));
vi.mock("./localImageBinding", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./localImageBinding")>();
  return {
    ...actual,
    createLocalImageBindingController: () => {
      const c = actual.createLocalImageBindingController({
        ports: {
          createObjectUrl: () => {
            harness.calls++;
            return "blob:synthetic";
          },
          revokeObjectUrl: () => {
            harness.calls++;
          },
          createImage: () => {
            harness.calls++;
            const e = {
              onload: null as (() => unknown) | null,
              onerror: null,
              naturalWidth: 40,
              naturalHeight: 20,
              set src(_value: string) {
                e.onload?.();
              },
            };
            return e;
          },
        },
      });
      harness.local = c;
      if (harness.prepared) c.load(new Blob(["synthetic"]));
      return c;
    },
  };
});
vi.mock("./templateArtBinding", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./templateArtBinding")>();
  return {
    ...actual,
    createTemplateArtBindingController: () => {
      const c = actual.createTemplateArtBindingController({
        ports: {
          createImage: () => {
            harness.calls++;
            const e = {
              onload: null as (() => unknown) | null,
              onerror: null,
              crossOrigin: null,
              naturalWidth: 40,
              naturalHeight: 20,
              set src(_value: string) {
                e.onload?.();
              },
            };
            return e;
          },
        },
      });
      harness.art = c;
      if (harness.prepared) c.load({ kind: "data-image", src: "synthetic" });
      return c;
    },
  };
});
type Result = UseLocalImageBindingResult | UseTemplateArtBindingResult;
function LocalProbe({ onRender }: { onRender: (r: Result) => void }) {
  const result = useLocalImageBinding();
  onRender(result);
  return createElement("p", null, result.state.status);
}
function ArtProbe({ onRender }: { onRender: (r: Result) => void }) {
  const result = useTemplateArtBinding();
  onRender(result);
  return createElement("p", null, result.state.status);
}
function render(kind: "local" | "art") {
  let captured: Result | undefined;
  const markup = renderToStaticMarkup(
    createElement(kind === "local" ? LocalProbe : ArtProbe, {
      onRender: (result) => {
        captured = result;
      },
    }),
  );
  const result = captured as Result | undefined;
  const controller = kind === "local" ? harness.local : harness.art;
  if (!result || !controller) throw new Error("setup");
  return { markup, result, controller };
}
// SSR proves the render snapshot forwarding only. Effects/StrictMode are separate native gates.
describe.each(["local", "art"] as const)("%s hook ready proof forwarding", (kind) => {
  beforeEach(() => {
    harness.prepared = false;
    harness.calls = 0;
    harness.local = null;
    harness.art = null;
  });
  it("initial render and proof read perform zero browser calls", () => {
    const r = render(kind);
    expect(r.markup).toBe("<p>idle</p>");
    expect(r.result.readReadyProof()).toBeNull();
    expect(harness.calls).toBe(0);
    r.controller.dispose();
  });
  it("forwards an exact ready snapshot without IO and denies after disposal", () => {
    harness.prepared = true;
    const r = render(kind),
      calls = harness.calls;
    const proof = r.result.readReadyProof();
    expect(proof?.isCurrent()).toBe(true);
    expect(harness.calls).toBe(calls);
    r.controller.dispose();
    expect(r.result.state.status).toBe("ready");
    expect(proof?.isCurrent()).toBe(false);
    expect(r.result.readReadyProof()).toBeNull();
  });
  it("an old render cannot silently adopt a later ready snapshot", () => {
    harness.prepared = true;
    const r = render(kind),
      proof = r.result.readReadyProof();
    r.controller.clear();
    if (kind === "local") harness.local?.load(new Blob(["synthetic-next"]));
    else harness.art?.load({ kind: "data-image", src: "synthetic-next" });
    const current = r.controller.getSnapshot();
    expect(current.status).toBe("ready");
    expect(r.controller.readReadyProof(current)?.isCurrent()).toBe(true);
    expect(proof?.isCurrent()).toBe(false);
    expect(r.result.readReadyProof()).toBeNull();
    r.controller.dispose();
  });
});
