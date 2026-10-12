# Obliq

**Private accounts payable for crypto-native teams.**

Obliq helps organizations capture vendor and contractor bills, apply deterministic controls and human approvals, settle with shielded Zcash, reconcile the payment to the original obligation, and share only the financial evidence a recipient or accountant needs. The organization keeps control of its treasury throughout.

> **Evidence boundary:** Capture, Control, Settle, Reconcile, and Prove have been demonstrated end to end on an isolated Z3 regtest network. A UFVK-only observer has synchronized against public Zcash testnet with current Ironwood subtree data, but no funded public-testnet payment has been signed, observed, or reconciled. Mainnet and production operation are not verified.

## The problem

A crypto-native finance team may receive an invoice by email, copy vendor details into a spreadsheet, request approval in chat, prepare a wallet transaction, and later assemble an accounting record by hand. On a transparent chain, that operational fragmentation comes with another cost: competitors and counterparties can infer who the company pays, how much, and how often.

Wallets can send Zcash. Payment requests can describe a payment. Neither is an accounts-payable control system.

Obliq makes the **Obligation**—the bill and its business context—the primary record. The chain transaction remains subordinate to it.

## The product

```text
CAPTURE → CONTROL → SETTLE → RECONCILE → PROVE
```

| Stage         | What Obliq does                                                                                                                                           | Authority boundary                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Capture**   | Persists a vendor, source document, exact amount, due date, category, and immutable destination history.                                                  | Extraction can suggest fields; a human confirms the financial record.                                            |
| **Control**   | Runs versioned deterministic policy, duplicate checks, destination controls, separation of duties, and human approvals.                                   | Business approval answers “should we pay?” It is never a wallet signature.                                       |
| **Settle**    | Binds the approved obligation, destination version, quote, zatoshis, network, privacy mode, and opaque memo into an immutable intent and ZIP-321 request. | A separate human-operated Zallet signer reviews and authorizes the exact transaction. Obliq has no spending key. |
| **Reconcile** | Uses an isolated UFVK-only observer to detect the shielded output, correlate amount and opaque reference, and track confirmations idempotently.           | Viewing authority can read relevant activity but cannot spend. Failure means `UNAVAILABLE`, never “unpaid.”      |
| **Prove**     | Issues immutable, selectively disclosed JSON evidence from the settled canonical record.                                                                  | An authorized issuer chooses fields; recipients never receive treasury-wide viewing access.                      |

### Private Payables Link

The first product workflow lets an authorized finance operator invite a vendor or contractor to confirm one Orchard-capable Zcash Unified Address for one obligation.

- The link token is high entropy, hashed at rest, expires after 24 hours, and is removed from the browser URL fragment immediately.
- Email-code verification creates a 30-minute session scoped to the invited obligation. It proves mailbox access—not legal identity or wallet ownership.
- Confirmation creates a new immutable destination version marked `UNVERIFIED`.
- A different eligible finance reviewer must verify the destination before fresh controls and approvals can make the obligation ready.
- The recipient cannot approve, sign, broadcast, settle, or issue evidence.

This is not a bearer claim, checkout link, escrow, wallet, or payment button. Its job is to connect the counterparty safely to the controlled payable.

## Why Zcash

Obliq needs a payment rail where vendor, amount, and payment cadence are not automatically published to the world. Zcash shielded transactions provide that on-chain privacy primitive.

Obliq adds the business controls around it:

- [ZIP-321](https://zips.z.cash/zip-0321) for canonical payment requests;
- Unified Addresses with a required shielded receiver and no transparent fallback;
- external `FullPrivacy` PCZT inspection and signing;
- UFVK-only observation with no spending authority; and
- controlled evidence that does not disclose the wider treasury history.

Privacy is not invisibility. Obliq, the recipient, the email provider, and the UFVK observer each learn information appropriate to their role. The threat model treats those metadata and viewing-authority risks explicitly.

## Why Obliq is different

| Alternative                     | What it does well                            | What Obliq adds                                                                                                                |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Zcash wallet or ZIP-321 request | Constructs and authorizes a private payment. | Obligation provenance, duplicate protection, policy, approvals, destination history, reconciliation, and evidence.             |
| Spreadsheet + chat              | Flexible coordination.                       | Server-enforced tenancy, immutable versions, separation of duties, idempotency, and an audit hash chain.                       |
| Generic crypto AP platform      | Broad invoice and payout workflows.          | A Zcash-native privacy model, external signing, and read-only shielded reconciliation without surrendering treasury authority. |
| Block explorer                  | Public transaction inspection.               | Business-object reconciliation for shielded payments and deliberately scoped disclosure.                                       |

Obliq does not claim customer adoption yet. The commercial thesis still requires structured customer interviews and supervised pilots.

## Architecture and trust boundaries

```text
Finance operator                     Treasury signer
      │                                    │
      │ capture, policy, approvals         │ deliberate cryptographic authorization
      ▼                                    ▼
┌──────────────────────── Obliq application ────────────────────────┐
│ PostgreSQL obligation record → version-bound settlement intent     │
│ No seed phrase · no spending key · no unrestricted signer RPC      │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ sanitized handoff / receipt
                               ▼
                    External Zallet + Zcash network
                               │ shielded chain data
                               ▼
┌──────────────────── isolated read-only observer ───────────────────┐
│ UFVK + private scan cache · no proposal/sign/broadcast capability   │
└──────────────────────────────┬─────────────────────────────────────┘
                               ▼
                   reconciliation → controlled evidence
```

The signer and observer are deliberately different authorities. Compromising viewing authority is a serious privacy incident, but it must not permit expenditure. Compromising the web application must not yield an unrestricted treasury signer.

See the [judge-facing technical summary](docs/submission/TECHNICAL_SUMMARY.md), [architecture](docs/architecture/overview.md), [security model](docs/architecture/security.md), and [threat model](docs/architecture/threat-model.md).

## What has actually been demonstrated

| Capability                                                                 | Status                    | Evidence                                                                                                        |
| -------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Persisted vendors, obligations, policies, approvals, and audit history     | **IMPLEMENTED**           | PostgreSQL integration tests and application surfaces                                                           |
| Private Payables Link through independent destination review               | **IMPLEMENTED**           | Isolated local browser ceremony using migrated PostgreSQL and a memory-only development mail sink               |
| AI extraction boundary                                                     | **SEEDED**                | Strict suggestion schema and clearly labelled fixture; no production model provider                             |
| External Zallet shielded signing and UFVK reconciliation                   | **REGTEST VERIFIED**      | Real isolated Z3 transaction, 25,000,000 zatoshis, mined at height 119 and observed through three confirmations |
| Public-testnet read-only synchronization                                   | **READY FOR FUNDED TEST** | Real TLS sync and UFVK-only scan; no payment observed                                                           |
| Funded public-testnet or mainnet settlement                                | **BLOCKED**               | Current Zallet/NU7 signer qualification and funded ceremony remain incomplete                                   |
| Controlled disclosure and canonical JSON evidence                          | **IMPLEMENTED**           | Eligibility, disclosure, tamper, revocation, and verification tests                                             |
| Production email delivery and infrastructure                               | **UNAVAILABLE**           | Adapter exists; provider credentials and delivery validation do not                                             |
| Native PDF receipts, live pricing, production AI, external audit anchoring | **PLANNED**               | Preserved roadmap; not represented as current behavior                                                          |

## Public deployments

### Persistent public pilot

- **Start a fictional workspace:** [obliq-public-pilot.onrender.com/pilot](https://obliq-public-pilot.onrender.com/pilot)
- **Runtime readiness:** [obliq-public-pilot.onrender.com/health/ready](https://obliq-public-pilot.onrender.com/health/ready)
- **Give feedback:** [obliq-public-pilot.onrender.com/feedback](https://obliq-public-pilot.onrender.com/feedback)

The pilot is a real, isolated PostgreSQL-backed product trial for **fictional data only**. A guest can create and persist vendors and obligations, exercise deterministic duplicate detection and control evaluation, inspect structured findings, and review the resulting activity and audit history. It does not manufacture a second approver or a successful payment.

Each opaque, server-side guest session receives its own organization and expires after two hours. A workspace is capped at 20 vendors, 50 obligations, and 200 mutations. Workspace creation is protected by PostgreSQL fixed-window limits of five attempts per trusted client per hour and 100 eligible attempts globally per hour. On Render's public edge, only a valid `CF-Connecting-IP` value is accepted as the client signal; forwarded headers supplied by callers are ignored, and missing or malformed trusted input shares a bounded `unknown` bucket.

Pilot mode keeps settlement preparation, destination and approval authority, signing, broadcasting, reconciliation, evidence issuance, invoice storage/scanning, email delivery, the Zcash observer, and every Zcash network disabled. Its runtime status remains `PUBLIC_NETWORK_BLOCKED`.

The separate [read-only Render preview](https://obliq-7xh9.onrender.com) remains database-free and intentionally denies `/app`, `/auth`, `/verify`, recipient workflows, and all mutations. Its browser-only `/demo` does not persist financial records. Neither deployment is the production product runtime.

To run the two-browser pilot acceptance ceremony against the public URL:

```bash
OBLIQ_PILOT_ACCEPTANCE_URL=https://obliq-public-pilot.onrender.com \
OBLIQ_PILOT_ACCEPTANCE_ORIGIN=https://obliq-public-pilot.onrender.com \
npm run accept:pilot
```

The command creates fictional records and consumes workspace-start capacity. Its presence here is not a claim that a live ceremony, customer onboarding, or feedback submission has passed. Feedback opens only an owner-configured external HTTPS form; Obliq does not store the response, and no response collection is claimed when that form is absent or unverified. Never submit wallet secrets, viewing keys, financial records, or payment credentials.

## Demo and submission material

- [Founder/product presentation script](docs/submission/PITCH_SCRIPT.md)
- [Technical product-demo script](docs/submission/DEMO_SCRIPT.md)
- [Local demo runbook](docs/submission/LOCAL_DEMO_RUNBOOK.md)
- [Project description](docs/submission/PROJECT_DESCRIPTION.md)
- [Technical summary](docs/submission/TECHNICAL_SUMMARY.md)
- [Submission checklist](docs/submission/SUBMISSION_CHECKLIST.md)
- [Private Payables operational evidence](docs/operations/evidence/PRIVATE_PAYABLES_OPERATIONAL_2026-10-11.md)
- [Public-testnet compatibility evidence](docs/operations/evidence/PUBLIC_TESTNET_COMPATIBILITY_2026-10-10.md)

## Repository

```text
apps/web             Next.js product and public surfaces
packages/domain      Exact money, lifecycle, tenant, and authority types
packages/database    PostgreSQL schema, migrations, repositories, audit chain
packages/policy      Deterministic controls and settlement readiness
packages/ai          Extraction suggestion contract and labelled fixture
packages/storage     Private invoice storage and quarantine boundary
packages/zcash       ZIP-321, observer, signer-handoff, and redaction boundaries
packages/evidence    Canonical disclosure artifacts and integrity checks
packages/security    Runtime validation, sessions, redaction, and origin checks
tools/zcash-observer Pinned UFVK-only librustzcash scanner
docs                 Architecture, ADRs, operations, research, and submission
```

Ledger settlement entries remain planned. Domain, policy, and evidence logic remain independent of the UI framework.

## Local development

Requirements: Node.js 24, npm 11+, Docker Compose, PostgreSQL 16+, and Rust for observer work.

```bash
cp .env.example .env
npm ci
docker compose up -d postgres
npm run db:migrate
DATABASE_URL=postgresql://obliq:obliq@127.0.0.1:5433/obliq npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Application routes require PostgreSQL and fail explicitly when it is unavailable. No in-memory database silently replaces persistence. Development uploads live under ignored `.data/` storage.

For a safe demonstration, use the [local demo runbook](docs/submission/LOCAL_DEMO_RUNBOOK.md); do not attempt to recreate the historical settlement during a presentation.

## Validation

```bash
npm run validate
TEST_DATABASE_URL=postgresql://obliq:obliq@127.0.0.1:5433/obliq npm run test:integration
npm run security:secrets
npm audit --omit=dev --audit-level=high
cargo fmt --check --manifest-path tools/zcash-observer/Cargo.toml
cargo check --locked --manifest-path tools/zcash-observer/Cargo.toml
cargo test --locked --manifest-path tools/zcash-observer/Cargo.toml
cargo audit --file tools/zcash-observer/Cargo.lock
```

CI migrates an empty PostgreSQL database, runs integration and non-database suites, builds the production application, checks Rust, scans for secrets, and audits production dependencies.

## Security guarantees enforced in code

- Exact money uses integer minor units and zatoshis—never floating point.
- Every financial repository operation is organization scoped and server authorized.
- Policies, obligation versions, destinations, approvals, settlement intents, and evidence are version bound.
- Material changes invalidate stale authorization; a signed or broadcast transaction is preserved for safe reconciliation rather than rewritten.
- AI cannot approve, verify a destination, sign, broadcast, or issue evidence.
- The backend has no seed, spending key, wallet passphrase, PCZT, raw transaction, or unrestricted signer credential.
- Viewing authority never enters the browser, PostgreSQL business tables, logs, proof, or evidence.
- `BROADCAST != SETTLED`; only observer evidence and the confirmation policy can settle an obligation.
- Recipient contact verification is not wallet ownership proof.
- Evidence is immutable, selectively disclosed, hashed canonically, and visibly revoked or superseded rather than rewritten.
- Preview mode fails closed and cannot enable financial operations.

PostgreSQL row-level security is not active; repository-level tenant isolation and its compensating controls are documented in ADR 0009. Production identity, object storage, malware scanning, rate-limit infrastructure, email delivery, observer hosting, and signer operations require real deployment infrastructure and credentials.

## Roadmap

Obliq’s roadmap retains production AI-assisted extraction with mandatory human review, live quote providers, native PDF receipts derived from canonical evidence, accounting integrations, external audit anchoring, and public-network qualification. It does not include autonomous payment authority, embedded treasury custody, transparent fallback disguised as private settlement, or fabricated proof paths.

The authoritative product source is `obliq-context/Obliq_Master_Context.docx`. Implementation-critical Zcash references under `obliq-context/implementation-reference/` take precedence over historical research notes.
