import { listPolicies, listPolicyVersions } from "@obliq/database";
import type { PolicyConfig } from "@obliq/policy";
import { StatusPill } from "@/components/status-pill";
import { Field, Input } from "@/components/finance-form";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import {
  createDefaultPolicyAction,
  createPolicyVersionAction,
} from "../actions";
export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const tenant = await getTenantContext();
  const db = getDatabase();
  const canAdmin = ["OWNER", "CFO", "POLICY_ADMIN"].includes(tenant.role);
  const entries = await listPolicies(db, tenant.organizationId);
  const versions = entries[0]
    ? await listPolicyVersions(db, tenant.organizationId, entries[0].policy.id)
    : [];
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Deterministic controls</p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight">
              Payment policy
            </h1>
            <p className="text-muted mt-2 text-sm">
              Readable rules, immutable versions, reproducible decisions.
            </p>
          </div>
          <StatusPill status="IMPLEMENTED" />
        </div>
        {!entries.length && canAdmin ? (
          <form action={createDefaultPolicyAction} className="card mt-8 p-8">
            <h2 className="font-semibold">No active policy</h2>
            <p className="text-muted mt-2 text-sm">
              Install the focused accounts-payable defaults to begin control
              evaluation.
            </p>
            <button className="button button-dark mt-5">
              Create default policy
            </button>
          </form>
        ) : !entries.length ? (
          <section className="card mt-8 p-8">
            <h2 className="font-semibold">No active policy</h2>
            <p className="text-muted mt-2 text-sm">
              An Owner, CFO or Policy Administrator must configure controls.
            </p>
          </section>
        ) : (
          entries.map(({ policy, version }) => {
            const config = version?.configJson as PolicyConfig | undefined;
            return (
              <section key={policy.id} className="card mt-8 overflow-hidden">
                <div className="hairline flex items-center justify-between border-b p-6">
                  <div>
                    <h2 className="font-semibold">{policy.name}</h2>
                    <p className="text-muted mt-1 text-xs">
                      Active version {policy.activeVersion} · {config?.currency}
                    </p>
                  </div>
                  <StatusPill status="IMPLEMENTED" />
                </div>
                <div className="grid gap-0 md:grid-cols-3">
                  <Tier
                    title={config?.tiers[0]?.label ?? "Lower tier"}
                    text="One Finance approval"
                  />
                  <Tier
                    title={config?.tiers[1]?.label ?? "Middle tier"}
                    text="Finance + Treasury"
                  />
                  <Tier
                    title={config?.tiers[2]?.label ?? "Upper tier"}
                    text="Two distinct Treasury approvals"
                  />
                </div>
                <div className="hairline border-t p-6">
                  <h3 className="font-semibold">Publish a new version</h3>
                  <p className="text-muted mt-1 text-xs">
                    Historical decisions keep their original policy version.
                    Changing the active version makes old readiness stale.
                  </p>
                  {canAdmin ? (
                    <form
                      action={createPolicyVersionAction.bind(null, policy.id)}
                      className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-4 sm:items-end"
                    >
                      <Field label="Threshold currency">
                        <Input
                          name="currency"
                          defaultValue={config?.currency ?? "USD"}
                          pattern="[A-Z]{3}"
                          required
                        />
                      </Field>
                      <Field label="Finance-only below">
                        <Input
                          name="lowerThreshold"
                          inputMode="decimal"
                          defaultValue={minorToDecimal(
                            config?.tiers[0]?.upperBoundMinor ?? "100000",
                          )}
                          required
                        />
                      </Field>
                      <Field label="Two Treasury above">
                        <Input
                          name="upperThreshold"
                          inputMode="decimal"
                          defaultValue={minorToDecimal(
                            config?.tiers[1]?.upperBoundMinor ?? "1000000",
                          )}
                          required
                        />
                      </Field>
                      <button className="button button-dark">
                        Create version
                      </button>
                    </form>
                  ) : (
                    <p className="text-muted mt-4 text-sm">
                      Read only in your current capacity.
                    </p>
                  )}
                </div>
              </section>
            );
          })
        )}
        {versions.length > 0 && (
          <section className="mt-8">
            <h2 className="font-semibold">Version history</h2>
            <div className="card mt-3 divide-y">
              {versions.map((v) => (
                <div className="flex justify-between p-4 text-sm" key={v.id}>
                  <span>Version {v.version}</span>
                  <span className="text-muted">
                    {v.createdAt.toLocaleString()} · immutable
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
function Tier({ title, text }: { title: string; text: string }) {
  return (
    <div className="hairline border-b p-6 md:border-r md:border-b-0">
      <p className="eyebrow">{title}</p>
      <p className="mt-3 text-sm font-semibold">{text}</p>
    </div>
  );
}
function minorToDecimal(value: string) {
  const amount = BigInt(value);
  return `${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`;
}
