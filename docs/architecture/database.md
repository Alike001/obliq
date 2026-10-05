# Database foundation

PostgreSQL is the persistence authority. Drizzle owns typed schema definitions and SQL migrations.

## Decisions

- UUIDs are opaque record identifiers.
- Every tenant-owned table carries `organization_id`, except child disclosures that inherit tenancy through an evidence package.
- Fiat amounts use `bigint` minor units; ZEC amounts use integer zatoshis.
- Vendor destinations are versionable through immutable records and `superseded_at`.
- Settlements contain non-null obligation and intent foreign keys.
- Observations are append-oriented evidence, separate from settlement state.
- Audit events include canonical payload hashes, previous hashes and a monotonically increasing chain sequence. Organization-scoped transaction locks serialize appends, and verification recomputes the chain.

Application repositories accept a server-derived tenant actor and scope every Phase 1 read and write by organization. The development session resolves an active membership in PostgreSQL before access. Production identity and PostgreSQL row-level security remain hardening work.

Local PostgreSQL binds to loopback port 5433 through Docker Compose. Migrations and integration tests run against the actual server. Database absence is a fatal configuration/runtime condition; there is no hidden alternate persistence implementation.
