import type { HTMLAttributes } from "react";

export type VisuallyHiddenProps = HTMLAttributes<HTMLSpanElement>;

/**
 * VisuallyHidden — content that stays in the accessibility tree but is hidden on screen.
 * Uses the clip/1px pattern (see `.denn-visually-hidden` in theme.css); never
 * `display:none` or `visibility:hidden`, which would drop it from screen readers.
 */
export function VisuallyHidden({
  className,
  children,
  ...rest
}: VisuallyHiddenProps): React.JSX.Element {
  const cls = ["denn-visually-hidden", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}
