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
Read-only reconciliation boundary (planned, sensitive)
          ↓
Ledger + controlled evidence (planned)
```

Phase 1 added executable `packages/ai` and `packages/storage` boundaries. Phase 2 adds `packages/policy` for deterministic evaluation and explainable readiness. The database application layer persists immutable policy meaning and authorized actions. Ledger and evidence remain documented boundaries until their phases begin.

## Runtime surfaces

- `/` communicates the product and current build status.
- `/app` exposes real organization-scoped vendors, obligations, invoice review and database-derived metrics.
- `/docs` renders Phase-2 documentation with desktop and mobile navigation.
- `/security` describes enforced and planned controls separately.
- `/proof` reports real build/system capability states; it contains no mocked chain evidence.

## Dependency direction

The web app depends on domain, database repositories, extraction and storage ports. Database and Zcash packages may depend on domain types where necessary. Domain remains independent of frameworks, databases, networks, and UI.
