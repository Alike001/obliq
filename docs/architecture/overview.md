# Product architecture

Obliq is organized around a business object, the Obligation. A blockchain transaction is a possible settlement mechanism and never the primary record.

```text
Finance UI / server entry points
          ↓ organization-scoped command
Domain rules → persisted obligation → policy + human approvals (planned)
          ↓ version-bound SettlementIntent
Zcash adapter boundary
          ↓ exact external signing handoff
User wallet / signer (never the Obliq backend)
          ↓ network evidence
Read-only reconciliation boundary (planned, sensitive)
          ↓
Ledger + controlled evidence (planned)
```

Phase 1 adds executable `packages/ai` and `packages/storage` boundaries to the Phase 0 workspaces. The AI package owns suggestion schemas and the labelled development fixture; storage owns validated private invoice bytes. Policy, ledger and evidence remain documented boundaries until their phases begin.

## Runtime surfaces

- `/` communicates the product and current build status.
- `/app` exposes real organization-scoped vendors, obligations, invoice review and database-derived metrics.
- `/docs` renders Phase-1 documentation with desktop and mobile navigation.
- `/security` describes enforced and planned controls separately.
- `/proof` reports real build/system capability states; it contains no mocked chain evidence.

## Dependency direction

The web app depends on domain, database repositories, extraction and storage ports. Database and Zcash packages may depend on domain types where necessary. Domain remains independent of frameworks, databases, networks, and UI.
