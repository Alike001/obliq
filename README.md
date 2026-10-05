# Obliq

Obliq is private financial operations software for crypto-native organizations. It is designed to help finance teams capture vendor and contractor obligations, apply deterministic controls and human approvals, settle privately with Zcash, reconcile settlement to the original business object, and create controlled financial evidence—without surrendering treasury spending authority.

> **Phase 2 status:** the persisted control and approval engine is implemented. Versioned policies, structured control findings, role-authorized approvals, invalidation and explainable settlement readiness are real PostgreSQL records. READY_TO_SETTLE does not move money.

## The problem

Crypto-native teams often coordinate bills across inboxes, chat, spreadsheets, accounting systems, and wallets. Transparent settlement can additionally reveal counterparties, amounts, cadence, and treasury relationships. Obliq’s initial wedge is vendor and contractor accounts payable; the longer-term category is private financial operations.

The product lifecycle is **Capture → Control → Settle → Reconcile → Prove**. The primary domain object is an **Obligation**, not a blockchain transaction.

## Why Zcash

Shielded Zcash settlement is the privacy primitive that keeps the central promise meaningful. ZIP-321 is the planned canonical payment-request format. Exact viewing, scanning, wallet, and signing paths remain deliberately unimplemented until tracer-bullet phases prove them against current authoritative tooling. There is no transparent fallback presented as private.

## Repository

```text
apps/web             Next.js product, application, docs, security and proof surfaces
packages/domain      Exact money, lifecycle status, tenant and authority types
packages/database    PostgreSQL/Drizzle schema and migration ownership
packages/policy      Deterministic controls and settlement-readiness rules
packages/ai          Strict extraction suggestion contract and labelled fixture
packages/storage     Private invoice document storage abstraction
packages/zcash       Protocol-facing ports; no runtime implementation
docs/architecture    System boundaries and security model
docs/decisions       Architecture decision records
scripts              Repository quality checks
```

Ledger and evidence become packages when implementation starts. The policy package is framework-independent and has no AI or network dependency.

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

Open `http://localhost:3000`. The public landing, docs and security routes do not require a database; application routes do. `.env.example` contains development-only identifiers. The development session abstraction fails closed outside development mode and is not production authentication.

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
```

`npm run validate` runs the non-database suite. The database integration command proves migrations, repositories, tenant isolation and audit chaining against PostgreSQL. CI runs quality gates plus a production dependency audit.

## Security posture

- The server has no seed phrase, private spending key, or unrestricted signer credential.
- AI types expose suggestions requiring human review, not approval or execution authority.
- Money is represented with `bigint` minor units and zatoshis, never floating point.
- Tenant-owned financial tables carry `organization_id`; server repositories scope reads and writes and integration tests exercise cross-organization denial.
- Invoice uploads validate size, file signature and MIME agreement; storage names are generated and raw files have no public route.
- Vendor destinations are immutable history. Authorized actors can record `VERIFIED_MANUALLY` with provenance; this is not cryptographic ownership proof.
- Policies are immutable versions. Decisions bind the exact policy, obligation and destination versions.
- Approval role eligibility and creator restrictions are enforced server-side; one actor cannot count twice in one policy decision.
- Material obligation or destination changes invalidate active approvals and force fresh evaluation.
- Settlement records require an obligation and settlement intent at the database level.
- Zcash settlement and reconciliation adapters are absent and reported as `UNAVAILABLE`.
- Viewing authority is treated as sensitive secret material and is never a client-side configuration value.

The current tenant boundary is a server-validated development membership, not production authentication. Row-level security, identity-provider integration, malware scanning, object storage, encryption/secret management, rate limiting and independent audit anchoring remain planned.

See [security architecture](docs/architecture/security.md), [threat model](docs/architecture/threat-model.md), and the in-product `/security` and `/proof` surfaces.

## Phase status

| Capability                                          | Status                |
| --------------------------------------------------- | --------------------- |
| Monorepo, UI system, public routes, app shell, docs | IMPLEMENTED           |
| PostgreSQL migrations and runtime persistence       | IMPLEMENTED           |
| Vendors, obligations, invoice ingestion, duplicates | IMPLEMENTED           |
| Tenant repository isolation and audit hash chain    | IMPLEMENTED           |
| Development extraction provider                     | SEEDED                |
| Production authentication and RBAC                  | PLANNED               |
| Versioned policies, approvals and readiness         | IMPLEMENTED           |
| Zcash viewing/scanning and reconciliation           | UNAVAILABLE (Phase 3) |
| Zcash transaction construction/signing/broadcast    | UNAVAILABLE (Phase 4) |
| Evidence artifacts                                  | PLANNED (Phase 5)     |

The canonical vocabulary is `IMPLEMENTED`, `SEEDED`, `PLANNED`, `BLOCKED`, and `UNAVAILABLE`. “Verified” is reserved for evidence-backed results.

## Roadmap and limits

Phase 2 establishes the control and approval engine only. Subsequent phases prove the real read-only Zcash path, real non-custodial write path, evidence, security hardening, and launch hardening—in that order, with an explicit stop gate after each. See [implementation status](docs/architecture/implementation-status.md) for limitations and [ADRs](docs/decisions) for material decisions.

The authoritative product source is `obliq-context/Obliq_Master_Context.docx`; implementation-critical Zcash notes under `obliq-context/implementation-reference/` take precedence over the broader research archive. Context files are retained unchanged.
