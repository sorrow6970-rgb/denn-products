import type { ButtonHTMLAttributes } from "react";

/** Design variants (design/README.md §컴포넌트 규격). Narrow union — no arbitrary class API. */
export type ButtonVariant = "primary" | "ghost" | "kakao";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Button — primary / ghost / kakao.
 * - Default `type="button"` so it never submits a form by accident; a caller-specified type wins.
 * - Min touch target 44x44 CSS px and focus-visible ring come from `.denn-btn` in theme.css.
 * - `disabled` uses the native attribute, never a visual-only dim.
 */
export function Button({
  variant = "primary",
  type,
  className,
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  const cls = ["denn-btn", `denn-btn--${variant}`, className].filter(Boolean).join(" ");
  return (
    <button type={type ?? "button"} className={cls} {...rest}>
      {children}
    </button>
  );
}
