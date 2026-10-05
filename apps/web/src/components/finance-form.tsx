import type { ComponentProps } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
      {hint && (
        <span className="text-muted mt-1 block text-xs font-normal">
          {hint}
        </span>
      )}
    </label>
  );
}
export function Input(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className="hairline bg-panel mt-2 min-h-11 w-full rounded-lg border px-3 text-sm disabled:opacity-60"
    />
  );
}
export function Select(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className="hairline bg-panel mt-2 min-h-11 w-full rounded-lg border px-3 text-sm"
    />
  );
}
export function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className="hairline bg-panel mt-2 min-h-24 w-full rounded-lg border p-3 text-sm"
    />
  );
}
