# Spec: Obliq persistent public pilot

Status: **PLANNED — owner approval required after submission**  
Pricing checked: **2026-10-12**

## Objective

Provide invited evaluators with a persistent, tenant-isolated Obliq workspace
for fictional vendor and obligation data. The pilot must exercise the real
PostgreSQL repositories, deterministic controls, approvals, versioning and
audit chain while making payment execution technically unavailable.

This is a separate deployment. It does not replace or relax the database-free
public preview.

## Background and current reality

- `/demo` is a browser-memory policy sandbox. It has no identity, database or
  financial authorization.
- The full local application already persists vendors, obligations, policies,
  approvals and audit events through organization-scoped repositories.
- The current `preview` runtime correctly requires database, authentication,
  storage and Zcash services to be disabled.
- The current `production` runtime expects the complete production boundary,
  including private object storage and a configured Zcash network. It must not
  be repurposed for a deliberately constrained pilot.
- Therefore the pilot needs a distinct fail-closed runtime mode and deployment,
  not a set of permissive preview exceptions.

## Users

- An invited crypto-native finance operator evaluating payable capture and
  controls.
- An invited second user evaluating role-scoped approval and separation of
  duties.
- An Obliq operator administering expiry, reset, abuse response and support.

## Goals

- Real authentication and organization membership lookup.
- Persistent, reload-safe fictional vendor and obligation records.
- Real server-side policy decisions, approval requirements and audit history.
- Demonstrable tenant isolation and stale-approval invalidation.
- Bounded cost and abuse through quotas, expiry and rate limits.
- Honest status: `PILOT`, fictional data only, and payments disabled.

## Non-goals

- Invoice upload or extraction.
- Recipient email delivery or Private Payables invitations.
- Zcash quotes, settlement intents, signing, broadcast, observation or
  reconciliation.
- Evidence claiming payment or settlement.
- Production data, customer money, treasury credentials or wallet material.
- Mainnet, public-testnet or isolated-regtest execution.

## Deployment boundary

```text
browser
  -> pilot web application (OIDC session + CSRF/origin checks)
       -> managed PostgreSQL (organization-scoped repositories + audit chain)
       -> OIDC provider (server-side identity only)

absent by construction:
  object storage | email adapter | Zcash observer | signer | wallet RPC
  quote provider | settlement execution | evidence issuance
```

The pilot gets a separate hostname, service, database credentials, OIDC client
and cookie namespace. It must not share the preview hostname, database, OIDC
client, session pepper or environment group.

## Requirements

### Runtime mode

Add an explicit `pilot` deployment mode only in the post-submission
implementation. Startup validation must require:

- OIDC authentication and HTTPS application origin;
- a PostgreSQL connection and migration compatibility;
- a distinct 32-byte-or-longer session pepper;
- `PUBLIC_NETWORK_BLOCKED`;
- Zcash application and observer networks disabled;
- storage, document scanner, recipient email and external signer absent;
- no development identity variables.

Any contradictory configuration must stop startup. Pilot pages must show a
persistent `FICTIONAL PILOT DATA — NO PAYMENT EXECUTION` label.

### Authentication and tenant boundary

- OIDC subject is mapped server-side to a pre-provisioned pilot membership.
- No organization ID, role or capability is accepted from browser input.
- Every read and write uses the authenticated organization ID.
- Invite issuance is operator-controlled; public self-signup is out of scope.
- Logout invalidates the local session. Cookies remain secure, HttpOnly,
  same-site and protected against fixation.

### Persistent product slice

- Users can create and edit vendors and manual obligations.
- All amounts use integer minor units and existing domain validation.
- Server-side control evaluation emits the existing structured findings.
- Eligible authenticated roles can approve through existing commands.
- Creator restrictions and multi-person requirements remain active.
- Material vendor, destination, amount, currency, type or reference changes
  invalidate stale decisions/approvals exactly as in the full application.
- `READY_TO_SETTLE` may be displayed as a business-control result, but the
  settlement preparation and execution surfaces are disabled and explain why.
- Example records are inserted per organization, labelled `EXAMPLE`, and never
  included in user-created totals without an explicit visible distinction.

### Quotas, expiry and reset

Initial hard limits per pilot organization:

| Resource                    | Limit |
| --------------------------- | ----: |
| Active members              |     3 |
| Vendors                     |    50 |
| Obligations                 |   200 |
| Policy evaluations per hour |   300 |
| Approval mutations per hour |   120 |
| Total mutations per minute  |    60 |

The repository transaction checks the applicable durable quota before writing;
the UI is only explanatory. A pilot organization expires after 14 days unless
an operator extends it. At expiry, sessions are invalidated and access becomes
read-only for 24 hours before operator-controlled reset. Reset is an explicit,
audited command and must never affect another organization. Destructive
retention behavior requires a separate owner-approved policy before launch.

### Abuse and recovery

- Durable PostgreSQL rate limits are sufficient for the first bounded pilot;
  process-local counters are forbidden.
- Mutation idempotency keys and optimistic versions protect retries.
- Database uncertainty returns unavailable/unknown, never financial success.
- Generic public/auth errors do not enumerate users or organizations.
- Health/readiness checks distinguish web health, database health and OIDC
  configuration without exposing credentials.
- Operator support can disable a pilot organization and invalidate sessions
  without rewriting audit history.

### Audit and observability

- Authentication failures, quota denials, control evaluation, approvals,
  invalidations, resets and operator actions use structured redacted logs.
- Canonical financial actions continue through the organization audit chain.
- Logs exclude document content, destinations, session material, OIDC tokens,
  memos and all Zcash authority.
- Alerts cover repeated auth failure, tenant-boundary denial, migration error,
  audit verification failure and elevated 5xx rates.

## Acceptance criteria

1. Two OIDC users in different organizations cannot list, address, mutate or
   infer each other's vendors, obligations, approvals or audit events.
2. A fictional vendor and obligation survive reload and service restart.
3. The server—not browser state—produces policy findings and approval needs.
4. An eligible second role can approve; an unauthorized or creator-restricted
   actor cannot.
5. A material edit invalidates approval and readiness.
6. Duplicate and incomplete obligations remain blocked.
7. Quota checks remain correct under concurrent requests.
8. Expiry invalidates sessions and blocks mutations; reset is tenant-scoped,
   explicit and audited.
9. No route can prepare a quote or intent, call a signer/observer, send email,
   upload a document, issue settlement evidence or claim payment.
10. Startup fails for development identity, enabled Zcash, email, signer or
    missing OIDC/database configuration.
11. Browser tests cover desktop/mobile loading, empty, validation, permission,
    unavailable, retry and success states.
12. Migration from an empty database, backup restore, secret scan, dependency
    audit and complete validation suite pass before provisioning approval.

## Cost estimate before provisioning

The smallest credible persistent pilot should be budgeted at approximately
**USD 13/month before bandwidth and storage growth**: Render's July 2026 cost
snapshot describes an always-on Starter web service plus Basic-256mb Postgres
at that amount. Render's free Postgres expires after 30 days and is capped at
1 GB, so it is not suitable for a continuing customer pilot. Paid Postgres
also receives managed backups; exact retention and restore behavior must be
verified on the selected plan before purchase.

OIDC can initially use Auth0's free tier (currently up to 25,000 monthly active
users and five organizations), but Obliq should cap invited pilot accounts far
below that. The first pilot can use the existing PostgreSQL rate limiter, so no
Redis service is required. Invoice/object storage and mail remain disabled and
cost zero. Budget **USD 20–30/month** as the owner approval ceiling to absorb
bandwidth, storage or plan-price changes; provisioning must stop if the current
checkout exceeds it.

Free Render compute can be used for an ephemeral engineering rehearsal, not
the persistent pilot: it sleeps, and its free Postgres expires. No service is
provisioned by this specification.

## Stories needed

- Operator provisions and expires a pilot tenant.
- Finance operator creates and evaluates a fictional obligation.
- Independent eligible user approves it.
- Material edit invalidates authorization.
- Attacker attempts cross-tenant reads/writes and exhausts quotas.
- Operator restores a database backup and verifies the audit chain.

## Open questions

- Exact owner-approved pilot retention and deletion policy.
- Selected OIDC provider and whether organization mapping remains entirely in
  Obliq or uses provider organizations.
- Whether pilot memberships are two-person by default for meaningful approval
  testing.
- Exact paid Render database plan and verified restore drill duration.
- Whether a future pilot iteration enables invoice uploads after private object
  storage and malware scanning are independently qualified.

## Source references

- [Render small-business cost snapshot](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses)
- [Render pricing](https://render.com/pricing)
- [Render service and managed-datastore behavior](https://render.com/docs/service-types)
- [Auth0 pricing](https://auth0.com/pricing)
- Existing Obliq security architecture: [security.md](./security.md)
- Existing deployment architecture: [deployment.md](../operations/deployment.md)
