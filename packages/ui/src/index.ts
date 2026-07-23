// @denn/ui — Modern Studio warm-taupe design tokens + shared React primitives.
// This file is the ONE public entry point (package "exports" maps "." here); apps
// must not reach into ./src/* directly. The CSS single source is ./theme.css
// (exported as "@denn/ui/theme.css"). Token values here must mirror that CSS.

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

// Public primitives (narrow, explicit API — spec 011).
export { Badge } from "./components/Badge";
export type { BadgeProps } from "./components/Badge";
export { Button } from "./components/Button";
export type { ButtonProps, ButtonVariant } from "./components/Button";
export { Card } from "./components/Card";
export type { CardProps } from "./components/Card";
export { Chip } from "./components/Chip";
export type { ChipProps } from "./components/Chip";
export { TextField } from "./components/TextField";
export type { TextFieldProps } from "./components/TextField";
export { VisuallyHidden } from "./components/VisuallyHidden";
export type { VisuallyHiddenProps } from "./components/VisuallyHidden";
