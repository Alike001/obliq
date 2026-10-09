# Implementation status terminology

- **IMPLEMENTED**: working behavior exists and is exercised by the build or tests.
- **SEEDED**: labelled example data exists for design validation only.
- **PLANNED**: accepted future scope with no usable implementation.
- **BLOCKED**: a known dependency or unanswered technical condition prevents implementation.
- **UNAVAILABLE**: the capability cannot currently be used.

Do not use **verified** without evidence that can be inspected. A successful build verifies compilation; it does not verify Zcash settlement. A seeded dashboard is not proof of persisted financial operations.

## Phase 6 status and limitations

Vendors, immutable destination history and manual verification provenance, obligations, duplicate resolution, immutable policy versions, structured control findings, persisted role-authorized approvals, approval invalidation, explainable readiness and audit-chain verification are implemented against PostgreSQL. The dashboard and approval inbox use organization data rather than financial fixtures.

The UFVK-only librustzcash observer, receiver/memo/amount correlation,
idempotent observation persistence and confirmation-state progression are
**IMPLEMENTED**. The inspected evidence is a real isolated-regtest tracer, not
mainnet evidence. The proof route reports that exact scope.

Exact controlled-regtest quotes, immutable version-bound settlement intents,
canonical ZIP-321 requests, external Zallet PCZT review/signing, sanitized
signing receipts, broadcast receipts and observer-authoritative settlement are
**IMPLEMENTED** and exercised end to end on isolated regtest. Obliq has no
Zallet RPC credential and accepts no PCZT, raw transaction, mnemonic,
passphrase or spending key. Live market pricing and public-network execution
are not implemented.

Production-capable OIDC identity/session architecture, PostgreSQL distributed
rate limiting, private S3-compatible quarantine storage, strict external scanner
boundary, runtime network validation, evidence-link HTTP protections and
redacted structured logging are **IMPLEMENTED**. Actual provider credentials,
object storage, scanner, secret manager and hardened observer/signer hosts are
deployment configuration—not seeded success. Development identity/local storage
remain explicitly development-only.

Extraction remains **SEEDED** through a labelled fixture provider. Manual
destination verification is operational evidence, not cryptographic ownership
proof. RLS, native PDF, live pricing, automated object retention, production
observer HA and independent audit anchoring remain **PLANNED**. Public testnet
TLS synchronization, network identity validation, current
Sapling/Orchard/Ironwood subtree import and the librustzcash continuity/reorg
recovery path are **IMPLEMENTED**. Public network status is
`PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`: no funded public shielded output has
yet been observed, so `/proof` correctly remains regtest-verified and mainnet
execution remains **BLOCKED**. Embedded wallet custody and ledger settlement
entries remain **UNAVAILABLE** or **PLANNED**.

Canonical application evidence, explicit server-enforced field disclosure,
mandatory preview, immutable issuance, SHA-256 verification, high-entropy
external identifiers, JSON download, revocation and supersession are
**IMPLEMENTED**. Printable receipts use the exact canonical evidence model.
Native PDF generation, independent attestation and zero-knowledge business
proofs are **PLANNED** or **UNAVAILABLE** and are not claimed.
