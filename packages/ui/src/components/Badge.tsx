import type { HTMLAttributes } from "react";

export type BadgeProps = HTMLAttributes<HTMLSpanElement>;

/**
 * Badge — informational/status text only (accent-soft bg + ink text).
 * Not a click control; use Button/Chip for interaction.
 */
export function Badge({ className, children, ...rest }: BadgeProps): React.JSX.Element {
  const cls = ["denn-badge", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}
