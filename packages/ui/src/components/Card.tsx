import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

/**
 * Card — a plain surface container (surface bg, 1px line, radius-lg).
 * Not interactive by default and forces no inner wrapper div.
 */
export function Card({ className, children, ...rest }: CardProps): React.JSX.Element {
  const cls = ["denn-card", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
