import { AlertCircle, ArrowUpRight, Clock3, FileText } from "lucide-react";
import { StatusPill } from "@/components/status-pill";

const metrics = [
  ["Bills due", "$24,800", "3 example obligations"],
  ["Awaiting approval", "4", "Seeded layout state"],
  ["Settled this month", "—", "Not yet implemented"],
  ["Needs attention", "2", "Example exceptions"],
] as const;

export default function AppOverviewPage() {
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Operations overview</p>
            <h1 className="mt-3 text-3xl font-medium tracking-[-.04em]">
              Good morning, finance team.
            </h1>
            <p className="text-muted mt-2 text-sm">
              A foundation-state view of the financial operations workspace.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            <StatusPill status="SEEDED" /> All figures are layout examples
          </div>
        </div>
        <section
          className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Example metrics"
        >
          {metrics.map(([label, value, note]) => (
            <article key={label} className="card bg-panel p-5">
              <p className="text-muted text-xs">{label}</p>
              <p className="mt-4 text-3xl font-medium tracking-tight">
                {value}
              </p>
              <p className="text-muted mt-2 text-[11px]">{note}</p>
            </article>
          ))}
        </section>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
          <section className="card bg-panel overflow-hidden">
            <div className="hairline flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-semibold">Needs attention</h2>
                <p className="text-muted mt-1 text-xs">
                  Example queue for layout validation
                </p>
              </div>
              <AlertCircle size={18} className="text-amber-700" />
            </div>
            <div className="divide-ink/8 divide-y">
              <QueueRow
                title="Northstar Labs · INV-1042"
                detail="Approval requirement would appear here"
                amount="$8,400"
              />
              <QueueRow
                title="Nodal Systems · SEC-091"
                detail="Destination verification would appear here"
                amount="$12,000"
              />
            </div>
          </section>
          <section className="card bg-panel p-5">
            <h2 className="font-semibold">System readiness</h2>
            <div className="mt-5 space-y-4">
              <Readiness label="Product shell" status="IMPLEMENTED" />
              <Readiness label="Database schema" status="IMPLEMENTED" />
              <Readiness label="Zcash settlement" status="UNAVAILABLE" />
              <Readiness label="Audit chain" status="PLANNED" />
            </div>
            <a
              href="/proof"
              className="text-forest mt-6 inline-flex items-center gap-2 text-xs font-semibold"
            >
              Open proof surface <ArrowUpRight size={14} />
            </a>
          </section>
        </div>
        <section className="card bg-panel mt-5 p-5">
          <div className="flex items-start gap-3">
            <FileText size={18} className="mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold">What this screen proves</h2>
              <p className="text-muted mt-1 max-w-3xl text-xs leading-5">
                Responsive application navigation and finance-first information
                hierarchy are implemented. No example record is persisted,
                approved, paid, reconciled or presented as blockchain evidence.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function QueueRow({
  title,
  detail,
  amount,
}: {
  title: string;
  detail: string;
  amount: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-5">
      <Clock3 size={16} className="text-muted" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted mt-1 text-xs">{detail}</p>
      </div>
      <span className="font-mono text-sm">{amount}</span>
    </div>
  );
}
function Readiness({
  label,
  status,
}: {
  label: string;
  status: "IMPLEMENTED" | "PLANNED" | "UNAVAILABLE";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted text-xs">{label}</span>
      <StatusPill status={status} />
    </div>
  );
}
