# Database foundation

PostgreSQL is the persistence authority. Drizzle owns typed schema definitions and SQL migrations.

## Decisions

- UUIDs are opaque record identifiers.
- Every tenant-owned table carries `organization_id`, except child disclosures that inherit tenancy through an evidence package.
- Fiat amounts use `bigint` minor units; ZEC amounts use integer zatoshis.
- Vendor destinations are versionable through immutable records and `superseded_at`.
- Settlements contain non-null obligation and intent foreign keys.
- Observations are append-oriented evidence, separate from settlement state.
- Audit events include `payload_hash` and `previous_hash`, though chain generation is not implemented in Phase 0.

Application queries must accept a server-derived `TenantContext` and scope every operation by organization. The schema supports this invariant but production authorization and PostgreSQL row-level security are planned hardening work.
