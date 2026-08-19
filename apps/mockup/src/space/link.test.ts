import { describe, expect, it } from "vitest";
import { readSpaceLink } from "./link";

describe("space link query", () => {
  it.each(["", "?x=1", "?spaceCreate=1"])("is inactive without a space parameter", (search) => {
    expect(readSpaceLink(search)).toEqual({ kind: "inactive" });
  });

  it("decodes one compatible legacy token", () => {
    expect(readSpaceLink("?x=1&space=legacy%20token&y=2")).toEqual({
      kind: "valid",
      token: "legacy token",
    });
  });

  it.each([
    null,
    "?space=",
    "?space=one&space=two",
    "?space=a%2Fb",
    "?space=..",
    "?space=__reserved__",
  ])("fails closed for malformed, duplicate or invalid links", (search) => {
    expect(readSpaceLink(search)).toEqual({ kind: "invalid" });
  });
});
