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
- Quotes bind the obligation version, exact business amount, exact zatoshis,
  controlled source, expiry and idempotency key. Immutable intents bind that
  quote to the current policy decision, approvals, vendor and destination.
- Settlement attempts preserve signer/broadcast request identifiers, sanitized
  receipt metadata and uncertainty/failure states. Database uniqueness plus
  organization-scoped advisory locks prevent duplicate execution.
- Settlements contain non-null obligation and intent foreign keys. Migration
  0007 deliberately stops with an explicit remediation message if legacy
  planning-only settlement rows exist; Phase 3 exposed no executable write
  path, and fabricating missing authorization data during migration would be
  unsafe.
- Observation targets bind one obligation to a network, receiver fingerprint,
  opaque memo-reference hash, exact zatoshi amount and confirmation threshold.
- Shielded observations are idempotent on organization, network, transaction
  and output index. Confirmation and exception state may progress without
  deleting first-observed evidence. Externally initiated Phase-3 observations
  can exist before a future Obliq settlement record, but never without an
  obligation.
- Observer status is separate from financial state. Node/scanner unavailability
  cannot produce a paid or unpaid conclusion.
- Viewing authority and decrypted memo plaintext are excluded from PostgreSQL.
- Audit events include canonical payload hashes, previous hashes and a monotonically increasing chain sequence. Organization-scoped transaction locks serialize appends, and verification recomputes the chain.

Application repositories accept a server-derived tenant actor and scope every read and write by organization. Control and settlement mutations check role capabilities and use organization-scoped advisory locks for concurrent policy, approval, execution and audit operations. Observation configuration and ingestion are restricted to Owner, CFO, or Treasury, and all queries remain organization scoped. The development session resolves an active membership in PostgreSQL before access. Production identity and PostgreSQL row-level security remain hardening work.

Local PostgreSQL binds to loopback port 5433 through Docker Compose. Migrations and integration tests run against the actual server. Database absence is a fatal configuration/runtime condition; there is no hidden alternate persistence implementation.
