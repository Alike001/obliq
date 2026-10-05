# ADR 0004: Phase 1 obligation persistence and ingestion

Status: Accepted — Phase 1

## Decision

Obliq uses PostgreSQL as the only Phase 1 persistence implementation. Server-only Drizzle repositories accept an explicit organization/actor context and apply `organization_id` to every owned-resource read and mutation. The development session is accepted only in `OBLIQ_SESSION_MODE=development` and must resolve an active database membership.

The canonical lifecycle is unchanged. Human-confirmed Phase 1 obligations enter `UNDER_REVIEW`; they do not become `APPROVAL_REQUIRED` before Phase 2 control evaluation.

Uploaded invoices use a storage port implemented locally for development. The adapter validates PDF/PNG/JPEG content signatures, declared MIME agreement and size; stores bytes under an organization scope plus generated opaque name; and exposes no public retrieval route. Object storage, malware scanning and retention policy are production-hardening work.

Extraction is a strict suggestion contract. The development provider is labelled `SEEDED_FIXTURE`, does not inspect file contents, and requires human review for every field. No document leaves the application for AI processing.

Duplicate decisions are deterministic. Matching content hash or normalized vendor/reference/amount/currency blocks creation as exact. Partial business-key matches persist a possible finding.

Audit events use canonical JSON, SHA-256 linkage and an organization-scoped PostgreSQL advisory transaction lock. A monotonically increasing database sequence establishes chain order. This is application tamper detection, not blockchain evidence.

## Consequences

- Database unavailability is explicit; there is no SQLite, memory or UI-only substitute.
- Payment destinations are append-only history and remain `UNVERIFIED` in Phase 1.
- Phase 1 can operate as accounts-payable capture software without implying approval or payment.
- Production authentication, object storage, malware scanning and encryption-at-rest operations remain required before production deployment.
