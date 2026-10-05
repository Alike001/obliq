# Implementation status terminology

- **IMPLEMENTED**: working behavior exists and is exercised by the build or tests.
- **SEEDED**: labelled example data exists for design validation only.
- **PLANNED**: accepted future scope with no usable implementation.
- **BLOCKED**: a known dependency or unanswered technical condition prevents implementation.
- **UNAVAILABLE**: the capability cannot currently be used.

Do not use **verified** without evidence that can be inspected. A successful build verifies compilation; it does not verify Zcash settlement. A seeded dashboard is not proof of persisted financial operations.

## Phase 0 limitations

There is no production authentication, obligation CRUD, invoice storage, AI provider, policy engine, approval engine, signer, wallet, Zcash RPC, scanner, settlement execution, reconciliation, ledger workflow, evidence artifact, audit-chain generation, or public verification route. Database connectivity depends on deployment configuration and is not inferred merely from `DATABASE_URL` presence.
