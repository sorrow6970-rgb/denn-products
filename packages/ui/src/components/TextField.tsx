import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "aria-invalid"> {
  /** Visible label (required — no placeholder-only fields). */
  label: ReactNode;
  /** Optional helper text, linked via aria-describedby. */
  description?: ReactNode;
  /** Error message. When set, aria-invalid is on and the text is rendered (not color-only). */
  error?: ReactNode;
}

/**
 * TextField — labelled text input with described-by helper/error wiring.
 * - Visible <label> is the base contract; ids are stable across renders (useId).
 * - description/error connect through aria-describedby; error sets aria-invalid and renders text.
 * - Standard controlled/uncontrolled input usage is preserved via passthrough props.
 */
export function TextField({
  label,
  description,
  error,
  id,
  className,
  "aria-describedby": describedByProp,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = `${inputId}-desc`;
  const errId = `${inputId}-err`;

  const describedBy = [describedByProp, description ? descId : null, error ? errId : null]
    .filter(Boolean)
    .join(" ");

  const cls = ["denn-field", error ? "denn-field--error" : "", className].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      <label className="denn-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="denn-field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />
      {description ? (
        <p id={descId} className="denn-field__desc">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="denn-field__err">
          {error}
        </p>
      ) : null}
    </div>
  );
}
