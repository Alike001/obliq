# Product architecture

Obliq is organized around a business object, the Obligation. A blockchain transaction is a possible settlement mechanism and never the primary record.

```text
Finance UI / server entry points
          ↓ organization-scoped command
Domain rules → policy + human approvals (planned)
          ↓ version-bound SettlementIntent
Zcash adapter boundary
          ↓ exact external signing handoff
User wallet / signer (never the Obliq backend)
          ↓ network evidence
Read-only reconciliation boundary (planned, sensitive)
          ↓
Ledger + controlled evidence (planned)
```

Phase 0 creates `apps/web`, `packages/domain`, `packages/database`, and `packages/zcash`. Policy, ledger, evidence, and AI boundaries are documented but will not become packages until they own executable behavior.

## Runtime surfaces

- `/` communicates the product and current build status.
- `/app` is a responsive finance application shell with clearly labelled seeded layout data.
- `/docs` renders Phase-0 documentation with desktop and mobile navigation.
- `/security` describes enforced and planned controls separately.
- `/proof` reports real build/system capability states; it contains no mocked chain evidence.

## Dependency direction

The web app may depend on domain and adapter contracts. Database and Zcash packages may depend on domain types where necessary. Domain remains independent of frameworks, databases, networks, and UI.
