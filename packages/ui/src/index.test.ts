import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WARM_TAUPE } from "./index";

// Strip CSS block comments first so header lookups (":root", "@theme") match real
// rules, not the doc comment that names those layers.
const css = readFileSync(new URL("./theme.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Grab the `{ ... }` body of the first `<header> {` block (e.g. "@theme", ":root"). */
function block(header: string): string {
  const start = css.indexOf(header);
  if (start === -1) throw new Error(`block not found: ${header}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

/** Parse `--name: value;` declarations from a CSS block body into a lowercased map. */
function tokens(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1].toLowerCase()] = m[2].trim().toLowerCase();
  }
  return out;
}

const theme = tokens(block("@theme"));
const root = tokens(block(":root"));

describe("@denn/ui warm taupe tokens (TS constants)", () => {
  it("uses the confirmed warm taupe values", () => {
    expect(WARM_TAUPE.accent).toBe("#9F887A");
    expect(WARM_TAUPE.accent2).toBe("#BAA598");
    expect(WARM_TAUPE.accentSoft).toBe("#EEE8E1");
    expect(WARM_TAUPE.kakao).toBe("#FEE500");
  });

  it("uses ink (#191A1D) as accent-ink, not white", () => {
    expect(WARM_TAUPE.accentInk).toBe("#191A1D");
    expect(WARM_TAUPE.accentInk).not.toBe("#FFFFFF");
    expect(WARM_TAUPE.accentInk).not.toBe("#ffffff");
  });
});

describe("theme.css ↔ WARM_TAUPE drift guard", () => {
  // Each accent token appears in BOTH the @theme layer (--color-*) and the :root
  // fallback (--*); both must equal the TypeScript constant (case-insensitive hex).
  const cases: Array<[keyof typeof WARM_TAUPE, string]> = [
    ["accent", "accent"],
    ["accent2", "accent-2"],
    ["accentSoft", "accent-soft"],
    ["accentInk", "accent-ink"],
    ["kakao", "kakao"],
  ];

  for (const [tsKey, cssName] of cases) {
    it(`${tsKey}: @theme --color-${cssName} == :root --${cssName} == WARM_TAUPE`, () => {
      const expected = WARM_TAUPE[tsKey].toLowerCase();
      expect(theme[`color-${cssName}`]).toBe(expected);
      expect(root[cssName]).toBe(expected);
    });
  }

  it("required design tokens exist in the :root fallback", () => {
    for (const name of [
      "panel",
      "radius",
      "radius-lg",
      "shadow-soft",
      "shadow",
      "success",
      "success-soft",
    ]) {
      expect(root[name], `missing --${name}`).toBeTruthy();
    }
  });

  it("radius/shadow tokens match between @theme and :root", () => {
    for (const name of ["radius", "radius-lg", "shadow-soft", "shadow"]) {
      expect(theme[name]).toBe(root[name]);
    }
  });
});

describe("no white-on-warm-taupe text in component CSS", () => {
  it("primary button text is accent-ink, kakao text is #191600", () => {
    const primary = block(".denn-btn--primary");
    expect(primary).toContain("color: var(--accent-ink)");
    expect(primary.toLowerCase()).not.toMatch(/color:\s*#fff/);
    expect(root["kakao-ink"]).toBe("#191600");
  });
});
