import { listPolicies, listPolicyVersions } from "@obliq/database";
import type { PolicyConfig } from "@obliq/policy";
import { StatusPill } from "@/components/status-pill";
import { Field, Input } from "@/components/finance-form";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import {
  createDefaultPolicyAction,
  createPolicyVersionAction,
} from "../actions";
export const dynamic = "force-dynamic";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; version?: string }>;
}) {
  const notice = await searchParams;
  const tenant = await getTenantContext();
  const db = getDatabase();
  // Chooses what to show. The server action checks the role again.
  const canAdmin = ["OWNER", "CFO", "POLICY_ADMIN"].includes(tenant.role);
  const entries = await listPolicies(db, tenant.organizationId);
  const versions = entries[0]
    ? await listPolicyVersions(db, tenant.organizationId, entries[0].policy.id)
    : [];
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
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
        {notice.created && entries.length > 0 && (
          <Notice
            tone="done"
            title="Default policy created"
            live
            className="mt-6"
          >
            Controls can now be evaluated on obligations. Nothing already
            recorded was changed.
          </Notice>
        )}
        {notice.version === "created" && (
          <Notice
            tone="hold"
            title="New policy version published"
            live
            className="mt-6"
          >
            Earlier decisions keep the version they were made under. Readiness
            evaluated under the old version is now stale and must be evaluated
            again.
          </Notice>
        )}
        {!entries.length && canAdmin ? (
          <form action={createDefaultPolicyAction} className="card empty mt-8">
            <h2 className="font-semibold">No active policy</h2>
            <p className="text-muted max-w-sm text-sm">
              Without a policy, controls cannot be evaluated on obligations.
              Install the accounts-payable defaults to begin.
            </p>
            <SubmitButton
              className="button button-dark mt-3"
              pendingLabel="Creating…"
            >
              Create default policy
            </SubmitButton>
          </form>
        ) : !entries.length ? (
          <section className="card empty mt-8">
            <h2 className="font-semibold">No active policy</h2>
            <p className="text-muted max-w-sm text-sm">
              Without a policy, controls cannot be evaluated on obligations. An
              Owner, CFO or Policy Administrator must configure them; your role
              cannot.
            </p>
          </section>
        ) : (
          entries.map(({ policy, version }) => {
            const config = version?.configJson as PolicyConfig | undefined;
            return (
              <section key={policy.id} className="card mt-8 overflow-hidden">
                <div className="hairline flex flex-wrap items-center justify-between gap-3 border-b p-6">
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
                          maxLength={3}
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
                      <SubmitButton pendingLabel="Publishing…">
                        Create version
                      </SubmitButton>
                    </form>
                  ) : (
                    <p className="text-muted mt-4 text-sm">
                      Read only for your role. An Owner, CFO or Policy
                      Administrator can publish a version.
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
            <ol className="card mt-3 divide-y">
              {versions.map((v) => (
                <li
                  className="flex flex-wrap justify-between gap-x-4 gap-y-1 p-4 text-sm"
                  key={v.id}
                >
                  <span className="font-semibold">
                    Version {v.version}
                    {v.version === entries[0]?.policy.activeVersion && (
                      <span className="text-muted font-normal"> · active</span>
                    )}
                  </span>
                  <span className="text-muted">
                    {v.createdAt.toLocaleString()} · immutable
                  </span>
                </li>
              ))}
            </ol>
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
