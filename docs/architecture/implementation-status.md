# Implementation status terminology

- **IMPLEMENTED**: working behavior exists and is exercised by the build or tests.
- **SEEDED**: labelled example data exists for design validation only.
- **PLANNED**: accepted future scope with no usable implementation.
- **BLOCKED**: a known dependency or unanswered technical condition prevents implementation.
- **UNAVAILABLE**: the capability cannot currently be used.

Do not use **verified** without evidence that can be inspected. A successful build verifies compilation; it does not verify Zcash settlement. A seeded dashboard is not proof of persisted financial operations.

## Phase 2 status and limitations

Vendors, immutable destination history and manual verification provenance, obligations, duplicate resolution, immutable policy versions, structured control findings, persisted role-authorized approvals, approval invalidation, explainable readiness and audit-chain verification are implemented against PostgreSQL. The dashboard and approval inbox use organization data rather than financial fixtures.

Extraction remains **SEEDED** through a labelled fixture provider that does not inspect document contents. Manual destination verification is operational evidence, not cryptographic wallet-control proof. Production authentication, RLS, object storage, malware scanning, live AI extraction and independent audit anchoring remain **PLANNED**. Signer/wallet integration, Zcash RPC/scanning, settlement, reconciliation, ledger settlement entries and evidence packages remain **UNAVAILABLE** or **PLANNED**. The public proof route performs a real database health query and, when a development organization is configured, recomputes its audit chain; it does not claim blockchain evidence.
