"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

/**
 * A submit button that says when its form is being sent, and cannot be
 * pressed a second time meanwhile. The server still decides what happens.
 */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  className = "button button-dark",
  disabled,
  ...props
}: ComponentProps<"button"> & { pendingLabel?: string }) {
  const { pending, data } = useFormStatus();
  // With two buttons in one form, only the pressed one changes its label.
  const mine =
    pending &&
    (props.name === undefined || data?.get(props.name) === props.value);
  return (
    <button
      {...props}
      type="submit"
      className={className}
      disabled={disabled || pending}
      aria-busy={mine || undefined}
    >
      {mine ? pendingLabel : children}
    </button>
  );
}
