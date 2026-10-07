# Database foundation

PostgreSQL is the persistence authority. Drizzle owns typed schema definitions and SQL migrations.

Settlement signing receipts persist the externally inspected Zcash network fee
as nullable `bigint` zatoshis. New authorized receipts require a positive exact
integer fee; the column remains nullable so migration 0011 does not invent fee
evidence for historical attempts.

## Decisions

- UUIDs are opaque record identifiers.
- Every tenant-owned table, including evidence disclosures, carries
  `organization_id`; repository reads and writes also scope by organization.
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
- Evidence previews snapshot an exact eligible source and expire after 30
  minutes. Issued packages persist immutable canonical JSON, SHA-256 hash,
  disclosed-field manifest, provenance, classification and a 256-bit public
  identifier. Status metadata can revoke or supersede an artifact without
  rewriting it. A reconciliation regression automatically revokes active
  evidence linked to that settlement.
- OIDC issuer/subject mappings reference existing users. Sessions store only a
  keyed token hash and exact user/organization membership; challenges are
  single-use and expiring. PostgreSQL rate-limit buckets update atomically
  across web instances.
- Invoice sources record local/S3 storage mode, quarantine, strict scan state
  and retention timestamp. Production application code accepts only CLEAN.
- Public evidence access records contain package/organization, action, outcome
  and a keyed request-subject fingerprint—not disclosed claims.

Application repositories accept a server-derived tenant actor and scope every read and write by organization. Control and settlement mutations check role capabilities and use organization-scoped advisory locks for concurrent policy, approval, execution and audit operations. Observation configuration and ingestion are restricted to Owner, CFO, or Treasury, and all queries remain organization scoped. Production OIDC sessions and development identity both resolve an active membership in PostgreSQL. RLS is not active; ADR 0009 records the transaction-local context prerequisite and compensating controls.

Local PostgreSQL binds to loopback port 5433 through Docker Compose. Migrations and integration tests run against the actual server. Database absence is a fatal configuration/runtime condition; there is no hidden alternate persistence implementation.
