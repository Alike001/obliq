import type { ImplementationStatus } from "@obliq/domain";
import { cn } from "@/lib/cn";

// Solid means live. Hatched means seeded, planned or unavailable.
const stamp: Record<ImplementationStatus, string> = {
  IMPLEMENTED: "cap",
  SEEDED: "cap cap-hatched",
  PLANNED: "cap cap-hatched",
  BLOCKED: "cap cap-blocked",
  UNAVAILABLE: "cap cap-hatched",
};

const label: Record<ImplementationStatus, string> = {
  IMPLEMENTED: "Implemented",
  SEEDED: "Seeded",
  PLANNED: "Planned",
  BLOCKED: "Blocked",
  UNAVAILABLE: "Unavailable",
};

/** Capability stamp: what the product can do. The five terms are fixed. */
export function StatusPill({
  status,
  className,
}: {
  status: ImplementationStatus;
  className?: string;
}) {
  return <span className={cn(stamp[status], className)}>{label[status]}</span>;
}

/**
 * Scope tag: marks a fact that holds on the isolated regtest network only. It
 * sits beside other status and never stands in for public-network readiness.
 */
export function ScopeTag({ className }: { className?: string }) {
  return <span className={cn("scope", className)}>Regtest</span>;
}

const networkStamp = {
  verified: "cap",
  ready: "cap cap-hatched",
  pending: "cap cap-hatched",
  blocked: "cap cap-blocked",
} as const;

/** A network claim produced by `networkClaims`; the label is the claim. */
export function NetworkStamp({
  label: text,
  tone,
  scope,
}: {
  label: string;
  tone: keyof typeof networkStamp;
  scope?: "Regtest";
}) {
  return (
    <span className="stamps">
      <span className={networkStamp[tone]}>{text}</span>
      {scope && <ScopeTag />}
    </span>
  );
}
