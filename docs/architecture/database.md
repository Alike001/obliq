# Database foundation

PostgreSQL is the persistence authority. Drizzle owns typed schema definitions and SQL migrations.

## Decisions

- UUIDs are opaque record identifiers.
- Every tenant-owned table carries `organization_id`, except child disclosures that inherit tenancy through an evidence package.
- Fiat amounts use `bigint` minor units; ZEC amounts use integer zatoshis.
- Vendor destinations are versionable through immutable records and `superseded_at`; manual verification records actor, method, note and timestamp.
- Policies have immutable `policy_versions`; decisions bind policy, obligation and destination versions.
- Material obligation revisions append immutable `obligation_versions` snapshots before authorization is reevaluated.
- Findings, approval requirements, approval actions and readiness evaluations are append-oriented historical records.
- Settlements contain non-null obligation and intent foreign keys.
- Observations are append-oriented evidence, separate from settlement state.
- Audit events include canonical payload hashes, previous hashes and a monotonically increasing chain sequence. Organization-scoped transaction locks serialize appends, and verification recomputes the chain.

Application repositories accept a server-derived tenant actor and scope every read and write by organization. Phase 2 control mutations additionally check role capabilities and use organization-scoped advisory locks for concurrent policy, approval and audit operations. The development session resolves an active membership in PostgreSQL before access. Production identity and PostgreSQL row-level security remain hardening work.

Local PostgreSQL binds to loopback port 5433 through Docker Compose. Migrations and integration tests run against the actual server. Database absence is a fatal configuration/runtime condition; there is no hidden alternate persistence implementation.
