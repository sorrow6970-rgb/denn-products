// Static-markup contract for the operator print-size card (spec 035). Interaction is covered by
// tests/e2e/admin-print-size.spec.ts in a real browser; this pins what the card is ALLOWED to be.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrintSizeCmDraft } from "./PrintSizeCmDraft";

const html = (): string => renderToStaticMarkup(<PrintSizeCmDraft />);

describe("PrintSizeCmDraft", () => {
  it("starts empty — no value is ever pre-filled", () => {
    const out = html();
    expect(out).toContain('value=""');
    // the legacy admin fabricated wcm=21 for any size without centimetres
    expect(out).not.toContain('value="21"');
  });

  it("says the size is not printable yet instead of showing an error", () => {
    expect(html()).toContain("치수 미입력");
  });

  it("labels both inputs and marks them as decimal entry", () => {
    const out = html();
    expect(out).toContain("인쇄 폭 (cm)");
    expect(out).toContain("인쇄 높이 (cm)");
    // attribute casing is React's SSR output; match it case-insensitively
    expect(out.match(/inputmode="decimal"/gi)?.length).toBe(2);
    expect(out).toMatch(/autocomplete="off"/i);
  });

  it("states that nothing is saved", () => {
    expect(html()).toContain("저장되지 않으며");
  });

  it("offers NO save, order or publish affordance", () => {
    const out = html();
    for (const forbidden of ["저장하기", "주문", "발행", "업로드", "<button"]) {
      expect(out, forbidden).not.toContain(forbidden);
    }
  });

  it("announces its result region politely", () => {
    const out = html();
    expect(out).toContain('role="status"');
    expect(out).toContain('aria-live="polite"');
  });
});
