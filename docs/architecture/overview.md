# Product architecture

Obliq is organized around a business object, the Obligation. A blockchain transaction is a possible settlement mechanism and never the primary record.

```text
Finance UI / server entry points
          ↓ organization-scoped command
Domain rules → persisted obligation → deterministic policy + human approvals
          ↓ version-bound SettlementIntent
Zcash adapter boundary
          ↓ exact external signing handoff
User wallet / signer (never the Obliq backend)
          ↓ network evidence
Read-only reconciliation boundary (implemented on regtest, sensitive)
          ↓
Controlled evidence (implemented) + ledger (planned)
```

Phase 1 added executable `packages/ai` and `packages/storage` boundaries. Phase 2 added `packages/policy`; Phases 3–4 proved separate read and external-write Zcash boundaries. Phase 5 added `packages/evidence` for deterministic disclosure and hashing. Phase 6 adds `packages/security` for fail-closed runtime configuration, redaction, fingerprints and origin checks, while storage/database/web adapters implement deployable identity, quarantine and abuse boundaries. Ledger remains planned.

## Runtime surfaces

- `/` communicates the product and current build status.
- `/app` exposes real organization-scoped vendors, obligations, invoice review and database-derived metrics.
- `/app/evidence` previews, issues, supersedes and revokes organization evidence.
- `/verify/[evidenceId]` exposes only an issued package's selected fields.
- `/docs` renders current implementation documentation with desktop and mobile navigation.
- `/security` describes enforced and planned controls separately.
- `/proof` reports real build/system capability states; it contains no mocked chain evidence.
- `/health/live` reports process liveness; `/health/ready` validates sanitized
  runtime mode plus PostgreSQL connectivity.

## Dependency direction

The web app depends on domain, database repositories, extraction and storage ports. Database and Zcash packages may depend on domain types where necessary. Domain remains independent of frameworks, databases, networks, and UI.
