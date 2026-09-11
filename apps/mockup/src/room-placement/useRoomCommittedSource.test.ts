import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  useRoomCommittedSource,
  type UseRoomCommittedSourceResult,
} from "./useRoomCommittedSource";

describe("spec131 source bridge server render", () => {
  it.each([null, {}, undefined])(
    "does not create or publish a source on render %#",
    (candidate) => {
      const notify = vi.fn();
      let result: UseRoomCommittedSourceResult | undefined;
      function Probe() {
        result = useRoomCommittedSource(candidate, notify);
        return createElement("p", null, "synthetic");
      }
      expect(renderToStaticMarkup(createElement(Probe))).toBe("<p>synthetic</p>");
      const captured = result as UseRoomCommittedSourceResult | undefined;
      expect(captured?.readSource()).toBeNull();
      captured?.invalidate();
      expect(captured?.readSource()).toBeNull();
      expect(notify).not.toHaveBeenCalled();
    },
  );
  it("never reads a hostile candidate while rendering", () => {
    const get = vi.fn(() => {
      throw new Error("private");
    });
    function Probe() {
      useRoomCommittedSource(new Proxy({}, { get }), () => {
        throw new Error("private");
      });
      return null;
    }
    expect(renderToStaticMarkup(createElement(Probe))).toBe("");
    expect(get).not.toHaveBeenCalled();
  });
});
