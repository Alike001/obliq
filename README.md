# Obliq

Obliq is private financial operations software for crypto-native organizations. It is designed to help finance teams capture vendor and contractor obligations, apply deterministic controls and human approvals, settle privately with Zcash, reconcile settlement to the original business object, and create controlled financial evidence—without surrendering treasury spending authority.

> **Current status:** the full lifecycle remains verified on isolated regtest.
> The UFVK-only observer has now completed a real public-testnet TLS sync with
> current Ironwood subtree data and is `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`.
> No public payment has been observed, and mainnet remains blocked.

## The problem

Crypto-native teams often coordinate bills across inboxes, chat, spreadsheets, accounting systems, and wallets. Transparent settlement can additionally reveal counterparties, amounts, cadence, and treasury relationships. Obliq’s initial wedge is vendor and contractor accounts payable; the longer-term category is private financial operations.

The product lifecycle is **Capture → Control → Settle → Reconcile → Prove**. The primary domain object is an **Obligation**, not a blockchain transaction.

## Why Zcash

Shielded Zcash settlement is the privacy primitive that keeps the central promise meaningful. ZIP-321 is the canonical payment-request format. Phase 4 proved an external Zallet PCZT signing path and the Phase-3 read-only observer reconciled it end to end on isolated regtest. Public testnet synchronization is now ready for an externally funded observation test; it is not yet public-network verification. There is no transparent fallback presented as private.

## Repository

```text
apps/web             Next.js product, application, docs, security and proof surfaces
packages/domain      Exact money, lifecycle status, tenant and authority types
packages/database    PostgreSQL/Drizzle schema and migration ownership
packages/policy      Deterministic controls and settlement-readiness rules
packages/ai          Strict extraction suggestion contract and labelled fixture
packages/storage     Private invoice document storage abstraction
packages/zcash       ZIP-321/intent types plus signer-free observer and redaction
packages/evidence    Canonical artifacts, disclosure policy and integrity checks
tools/zcash-observer Pinned UFVK-only librustzcash scanner
docs/architecture    System boundaries and security model
docs/decisions       Architecture decision records
scripts              Repository quality checks
```

Ledger remains planned. Policy and evidence are framework-independent packages with no AI or network dependency.

## Local setup

Requirements: Node.js 20.9+ (Node 24 recommended), npm 11+, Docker Compose or PostgreSQL 16+.

```bash
cp .env.example .env
npm install
docker compose up -d postgres
npm run db:migrate
DATABASE_URL=postgresql://obliq:obliq@127.0.0.1:5433/obliq npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Public presentation routes tolerate unavailable infrastructure; application routes require PostgreSQL. `.env.example` contains names and development placeholders only. Production mode requires OIDC, a strong session pepper, private object storage and an HTTPS scanner and fails closed without them.

The provided PostgreSQL service binds only to `127.0.0.1:5433`. Export `DATABASE_URL` when running the seed command (the migration command also defaults to the documented loopback development URL), and copy `.env.example` to `.env` for the application. Uploaded development documents are written beneath `.data/uploads` and ignored by Git. Missing or unavailable PostgreSQL fails explicitly—Obliq never substitutes fake persistence.

## Quality gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
DATABASE_URL=postgresql://obliq:obliq@127.0.0.1:5433/obliq npm run test:integration
npm run build
npm run security:secrets
npm audit --omit=dev
cargo fmt --check --manifest-path tools/zcash-observer/Cargo.toml
cargo check --locked --manifest-path tools/zcash-observer/Cargo.toml
cargo audit --file tools/zcash-observer/Cargo.lock
```

`npm run validate` runs the non-database suite. The database integration command proves migrations, repositories, tenant isolation and audit chaining against PostgreSQL. CI runs quality gates plus a production dependency audit.

## Security posture

- The server has no seed phrase, private spending key, or unrestricted signer credential.
- AI types expose suggestions requiring human review, not approval or execution authority.
- Money is represented with `bigint` minor units and zatoshis, never floating point.
- Tenant-owned financial tables carry `organization_id`; server repositories scope reads and writes and integration tests exercise cross-organization denial.
- Production OIDC uses PKCE/state/nonce, pre-provisioned identities and revocable hashed database sessions; development identity is a distinct rejected production mode.
- PostgreSQL-coordinated rate limits protect authentication, mutations, uploads and public evidence access.
- Invoice uploads validate size, file signature and MIME agreement; production objects are private/quarantined and require a real scanner CLEAN result.
- Vendor destinations are immutable history. Authorized actors can record `VERIFIED_MANUALLY` with provenance; this is not cryptographic ownership proof.
- Policies are immutable versions. Decisions bind the exact policy, obligation and destination versions.
- Approval role eligibility and creator restrictions are enforced server-side; one actor cannot count twice in one policy decision.
- Material obligation or destination changes invalidate active approvals and force fresh evaluation.
- Settlement records require an obligation and settlement intent at the database level.
- The observer imports a UFVK as `ViewOnly` and exposes no proposal, signing or broadcast method.
- Viewing authority is never stored in PostgreSQL, logged, rendered, or sent client-side; its scan cache remains privacy-sensitive.
- Node/scanner failure records infrastructure `UNAVAILABLE` without changing paid/unpaid state.
- Controlled-regtest quotes and intent preparation are implemented. Signing remains external to Obliq; the application stores sanitized receipts only.
- Broadcast is not settlement. The UFVK-only observer alone advances matching evidence through confirmation to `SETTLED`.
- Evidence can only derive from a canonically `SETTLED` obligation and matching observation. Disclosure keys and sensitive-role capabilities are server enforced.
- Issued evidence is immutable. Corrections supersede it; revocation preserves history. Public identifiers contain 256 bits of random entropy.
- Evidence links are non-enumerable, no-store/no-referrer/noindex, rate-limited and access-recorded without claims. JSON remains canonical; native PDF remains planned.

PostgreSQL RLS is not active; ADR 0009 records the transaction-context prerequisite and compensating server enforcement. Provider credentials, secret-manager injection, scanner/object-store operations, encrypted observer volumes and independent audit anchoring are deployment responsibilities and are not claimed as configured.

See [security architecture](docs/architecture/security.md), [threat model](docs/architecture/threat-model.md), and the in-product `/security` and `/proof` surfaces.

## Phase status

| Capability                                          | Status                |
| --------------------------------------------------- | --------------------- |
| Monorepo, UI system, public routes, app shell, docs | IMPLEMENTED           |
| PostgreSQL migrations and runtime persistence       | IMPLEMENTED           |
| Vendors, obligations, invoice ingestion, duplicates | IMPLEMENTED           |
| Tenant repository isolation and audit hash chain    | IMPLEMENTED           |
| Development extraction provider                     | SEEDED                |
| Production OIDC/session architecture                | IMPLEMENTED           |
| PostgreSQL rate limiting / private storage boundary | IMPLEMENTED           |
| Provider credentials and production infrastructure  | UNAVAILABLE           |
| Versioned policies, approvals and readiness         | IMPLEMENTED           |
| UFVK-only shielded observation and reconciliation   | IMPLEMENTED (regtest) |
| External Zallet PCZT signing/broadcast              | IMPLEMENTED (regtest) |
| Public-network observer synchronization             | READY FOR FUNDED TEST |
| Public-network settlement/execution                 | BLOCKED               |
| Controlled evidence, JSON and external verification | IMPLEMENTED           |
| Native PDF evidence generation                      | PLANNED               |

The canonical vocabulary is `IMPLEMENTED`, `SEEDED`, `PLANNED`, `BLOCKED`, and `UNAVAILABLE`. “Verified” is reserved for evidence-backed results.

## Roadmap and limits

Phase 6 hardens Capture → Control → Settle → Reconcile → Prove without adding a domain. Issue #5 has qualified public testnet synchronization for a funded test, but public observation and settlement remain unverified and no Phase-7 polish is included. See [implementation status](docs/architecture/implementation-status.md), [deployment](docs/operations/deployment.md), [observer operations](docs/operations/zcash-observer.md), and [ADRs](docs/decisions) for material decisions.

The authoritative product source is `obliq-context/Obliq_Master_Context.docx`; implementation-critical Zcash notes under `obliq-context/implementation-reference/` take precedence over the broader research archive. Context files are retained unchanged.
