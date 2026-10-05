# Obliq

Obliq is private financial operations software for crypto-native organizations. It is designed to help finance teams capture vendor and contractor obligations, apply deterministic controls and human approvals, settle privately with Zcash, reconcile settlement to the original business object, and create controlled financial evidence—without surrendering treasury spending authority.

> **Phase 0 status:** the production-quality foundation is implemented. Money-moving workflows are not. No page in this repository claims a live Zcash payment, scan, reconciliation result, or audit proof.

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
packages/zcash       Protocol-facing ports; no runtime implementation in Phase 0
docs/architecture    System boundaries and security model
docs/decisions       Architecture decision records
scripts              Repository quality checks
```

Policy, ledger, evidence, and AI become packages when implementation starts; Phase 0 documents their boundaries without creating empty workspaces.

## Local setup

Requirements: Node.js 20.9+ (Node 24 recommended), npm 11+, and PostgreSQL 16+ when exercising migrations.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The public routes do not require a database. `.env.example` contains development-only identifiers; the development session abstraction fails closed outside development mode and is not production authentication.

To run PostgreSQL locally:

```bash
docker compose up -d postgres
npm run db:migrate
```

## Quality gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run security:secrets
```

`npm run validate` runs the complete Phase 0 suite. CI runs the same gates plus a production dependency audit.

## Security posture

- The server has no seed phrase, private spending key, or unrestricted signer credential.
- AI types expose suggestions requiring human review, not approval or execution authority.
- Money is represented with `bigint` minor units and zatoshis, never floating point.
- Tenant-owned financial tables carry `organization_id`; domain guards reject cross-organization resource access.
- Settlement records require an obligation and settlement intent at the database level.
- Zcash settlement and reconciliation adapters are absent and reported as `UNAVAILABLE`.
- Viewing authority is treated as sensitive secret material and is never a client-side configuration value.

The current tenant boundary is a documented development abstraction, not production authentication. Row-level security, identity-provider integration, full RBAC, audit-event generation, encryption/secret management, and rate limiting are planned for their respective phases.

See [security architecture](docs/architecture/security.md), [threat model](docs/architecture/threat-model.md), and the in-product `/security` and `/proof` surfaces.

## Phase status

| Capability                                          | Status                |
| --------------------------------------------------- | --------------------- |
| Monorepo, UI system, public routes, app shell, docs | IMPLEMENTED           |
| PostgreSQL schema and initial migration             | IMPLEMENTED           |
| Example application dashboard records               | SEEDED                |
| Production authentication and RBAC                  | PLANNED               |
| Obligation CRUD and invoice processing              | PLANNED (Phase 1)     |
| Policies and approvals                              | PLANNED (Phase 2)     |
| Zcash viewing/scanning and reconciliation           | UNAVAILABLE (Phase 3) |
| Zcash transaction construction/signing/broadcast    | UNAVAILABLE (Phase 4) |
| Evidence artifacts and audit-chain verification     | PLANNED (Phase 5)     |

The canonical vocabulary is `IMPLEMENTED`, `SEEDED`, `PLANNED`, `BLOCKED`, and `UNAVAILABLE`. “Verified” is reserved for evidence-backed results.

## Roadmap and limits

Phase 0 establishes the foundation only. Subsequent phases implement the obligation engine, control engine, real read-only Zcash path, real non-custodial write path, evidence, security hardening, and launch hardening—in that order, with an explicit stop gate after each. See [implementation status](docs/architecture/implementation-status.md) for limitations and [ADRs](docs/decisions) for material decisions.

The authoritative product source is `obliq-context/Obliq_Master_Context.docx`; implementation-critical Zcash notes under `obliq-context/implementation-reference/` take precedence over the broader research archive. Context files are retained unchanged.
