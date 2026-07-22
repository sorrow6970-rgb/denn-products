// @denn/ui — single source of the Modern Studio warm-taupe tokens + minimal layout
// primitive constants/types. React component expansion is left to a later spec.
// The CSS single source is ./theme.css (exported as "@denn/ui/theme.css").

/** Warm taupe token values (design decision 2026-07-22). Must mirror ./theme.css. */
export const WARM_TAUPE = {
  accent: "#9F887A",
  accent2: "#BAA598",
  accentSoft: "#EEE8E1",
  /** accent 위 일반 크기 텍스트는 흰색이 아니라 ink(#191A1D)를 사용한다. */
  accentInk: "#191A1D",
  kakao: "#FEE500",
} as const;

export type WarmTaupeToken = keyof typeof WARM_TAUPE;

/** Minimal layout primitive class names owned by @denn/ui (no React components yet). */
export const UI_CLASS = {
  shell: "scaffold-shell",
  card: "scaffold-card",
  badge: "scaffold-badge",
} as const;
