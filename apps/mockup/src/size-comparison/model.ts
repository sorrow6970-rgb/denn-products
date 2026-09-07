import {
  buildCatalogBrowseIndex,
  projectFramePrintPhysicalSize,
  readLegacyCatalog,
  selectFrameSizes,
} from "@denn/shared";

export interface ComparisonSize {
  readonly key: string;
  readonly label: string;
  readonly widthCm: number;
  readonly heightCm: number;
}

export type ComparisonModel =
  | { readonly status: "invalid" }
  | {
      readonly status: "ready";
      readonly sizes: readonly ComparisonSize[];
      readonly omitted: boolean;
    };

/** Detached, validated print dimensions only. Never guesses from a label or aspect. */
export function buildComparisonModel(input: unknown): ComparisonModel {
  try {
    const read = readLegacyCatalog(input);
    if (!read.ok) return { status: "invalid" };
    const options = selectFrameSizes(buildCatalogBrowseIndex(read.document));
    const sizes: ComparisonSize[] = [];
    for (const [index, option] of options.entries()) {
      const projected = projectFramePrintPhysicalSize(read.document, option.id);
      if (!projected.ok || projected.value === null) continue;
      sizes.push({ key: `size-${index}`, label: option.label, ...projected.value });
    }
    return { status: "ready", sizes, omitted: sizes.length !== options.length };
  } catch {
    return { status: "invalid" };
  }
}

/** App-private diagram coordinates: one scale, fixed axes, no rotation or image plan. */
export function comparePrintSizes(sizes: readonly ComparisonSize[], a: string, b: string) {
  if (!a || !b || a === b) return null;
  const left = sizes.find((size) => size.key === a);
  const right = sizes.find((size) => size.key === b);
  if (!left || !right) return null;
  const dimensions = [left.widthCm, left.heightCm, right.widthCm, right.heightCm];
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0 || value > 500)) return null;
  const scale = 80 / Math.max(...dimensions);
  return [left, right].map((size) => ({
    ...size,
    x: 10,
    y: 90 - size.heightCm * scale,
    width: size.widthCm * scale,
    height: size.heightCm * scale,
  }));
}
