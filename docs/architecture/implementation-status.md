# Implementation status terminology

- **IMPLEMENTED**: working behavior exists and is exercised by the build or tests.
- **SEEDED**: labelled example data exists for design validation only.
- **PLANNED**: accepted future scope with no usable implementation.
- **BLOCKED**: a known dependency or unanswered technical condition prevents implementation.
- **UNAVAILABLE**: the capability cannot currently be used.

Do not use **verified** without evidence that can be inspected. A successful build verifies compilation; it does not verify Zcash settlement. A seeded dashboard is not proof of persisted financial operations.

## Phase 3 status and limitations

Vendors, immutable destination history and manual verification provenance, obligations, duplicate resolution, immutable policy versions, structured control findings, persisted role-authorized approvals, approval invalidation, explainable readiness and audit-chain verification are implemented against PostgreSQL. The dashboard and approval inbox use organization data rather than financial fixtures.

The UFVK-only librustzcash observer, receiver/memo/amount correlation,
idempotent observation persistence and confirmation-state progression are
**IMPLEMENTED**. The inspected evidence is a real isolated-regtest tracer, not
mainnet evidence. The proof route reports that exact scope.

Extraction remains **SEEDED** through a labelled fixture provider. Manual
destination verification is operational evidence, not cryptographic ownership
proof. Production authentication, RLS, object storage, malware scanning,
production observer secret custody/TLS/HA and independent audit anchoring remain
**PLANNED**. Signer/wallet integration, transaction construction, broadcast,
settlement execution, ledger settlement entries and evidence packages remain
**UNAVAILABLE** or **PLANNED**.
