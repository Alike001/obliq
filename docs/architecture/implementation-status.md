# Implementation status terminology

- **IMPLEMENTED**: working behavior exists and is exercised by the build or tests.
- **SEEDED**: labelled example data exists for design validation only.
- **PLANNED**: accepted future scope with no usable implementation.
- **BLOCKED**: a known dependency or unanswered technical condition prevents implementation.
- **UNAVAILABLE**: the capability cannot currently be used.

Do not use **verified** without evidence that can be inspected. A successful build verifies compilation; it does not verify Zcash settlement. A seeded dashboard is not proof of persisted financial operations.

## Phase 1 limitations

Vendors, versioned unverified destinations, manual and invoice-backed obligations, deterministic duplicate checks, activity events and audit-chain verification are implemented against PostgreSQL. The dashboard uses organization data rather than financial fixtures.

Extraction remains **SEEDED** through a labelled fixture provider that does not inspect document contents. Production authentication, object storage, malware scanning, live AI extraction, policy evaluation, approvals, signer/wallet integration, Zcash RPC/scanning, settlement, reconciliation, ledger settlement entries and evidence packages remain **PLANNED** or **UNAVAILABLE**. The public proof route performs a real database health query when configured but does not claim blockchain evidence.
