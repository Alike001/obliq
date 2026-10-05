import type { ImplementationStatus } from "@obliq/domain";
import { cn } from "@/lib/cn";

const tone: Record<ImplementationStatus, string> = {
  IMPLEMENTED: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
  SEEDED: "bg-blue-50 text-blue-800 ring-blue-700/15",
  PLANNED: "bg-amber-50 text-amber-900 ring-amber-700/15",
  BLOCKED: "bg-rose-50 text-rose-800 ring-rose-700/15",
  UNAVAILABLE: "bg-stone-100 text-stone-600 ring-stone-500/15",
};

export function StatusPill({
  status,
  className,
}: {
  status: ImplementationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider ring-1 ring-inset",
        tone[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
