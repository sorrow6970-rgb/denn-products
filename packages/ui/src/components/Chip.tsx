import type { ButtonHTMLAttributes } from "react";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected (pressed) state. Reflected in `aria-pressed` and a non-color visual cue. */
  selected?: boolean;
}

/**
 * Chip — a selection toggle button (spec 011 limits Chip to this contract).
 * - `aria-pressed` always mirrors `selected` so the state is not color-only.
 * - Min touch target 44x44 CSS px; default `type="button"`.
 * - A leading indicator (aria-hidden) gives a shape/weight cue in addition to color.
 */
export function Chip({
  selected = false,
  type,
  className,
  children,
  ...rest
}: ChipProps): React.JSX.Element {
  const cls = ["denn-chip", selected ? "denn-chip--on" : "", className].filter(Boolean).join(" ");
  return (
    <button type={type ?? "button"} className={cls} aria-pressed={selected} {...rest}>
      <span className="denn-chip__mark" aria-hidden="true" />
      {children}
    </button>
  );
}
