import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { CatalogDocumentV1 } from "@denn/shared";
import { PrintSizeComparison } from "./PrintSizeComparison";

const size = (id: string) => ({ id, name: "비교 크기", printWidthCm: 20, printHeightCm: 30 });
const document = (frameSizes: unknown): CatalogDocumentV1 =>
  ({ schemaVersion: 1, migratedFrom: "legacy-v0", data: { frameSizes } }) as CatalogDocumentV1;
it("renders a closed comparison with no chosen defaults, svg or canvas", () => {
  const html = renderToStaticMarkup(
    <PrintSizeComparison document={document([size("SECRET_A"), size("SECRET_B")])} />,
  );
  expect(html).toContain("인쇄 크기 비교");
  expect(html).toContain("액자 외곽이나 화면의 실제 크기를 뜻하지 않습니다.");
  expect(html).not.toMatch(/<svg|<canvas|<img|<details[^>]* open|SECRET_A|SECRET_B/);
  expect(html.match(/value="" selected=""/g)).toHaveLength(2);
});
it.each([[], [size("one")], [size("one"), { id: "two", name: "100x200" }], "invalid"])(
  "does not offer an unusable comparison %j",
  (sizes) => {
    expect(renderToStaticMarkup(<PrintSizeComparison document={document(sizes)} />)).toBe("");
  },
);
