# Judge-facing technical summary

## System thesis

Obliq treats the business obligation—not a transaction—as the durable financial object. It binds every later decision to immutable versions and separates the authority to approve, spend, observe, and disclose.

```text
CAPTURE          CONTROL            SETTLE             RECONCILE          PROVE
vendor/source → policy decision → settlement intent → UFVK observation → scoped artifact
obligation       human approvals    external signer    confirmations      canonical hash
```

## Authority model

| Authority              | Holds                                                                 | Can do                                                                                             | Cannot do                                                         |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Finance application    | Business records, membership, policy, approval state, intent metadata | Capture obligations, enforce policy, prepare exact intent                                          | Independently spend treasury funds                                |
| Human approver         | Organization role/capability                                          | Approve or reject the exact current obligation version                                             | Sign a Zcash transaction merely by approving                      |
| External Zallet signer | Wallet spending authority, isolated from Obliq                        | Inspect, prove, sign, extract, and broadcast an exact `FullPrivacy` PCZT after human authorization | Rewrite Obliq policy or reconciliation facts                      |
| Read-only observer     | UFVK and private scan cache                                           | Decrypt relevant received outputs, read memo/value, track confirmations                            | Construct, sign, or broadcast a spend                             |
| Evidence issuer        | Disclosure capability                                                 | Preview and issue selected fields from a settled record                                            | Alter the historical artifact or disclose forbidden secret fields |
| Recipient              | One invitation/session                                                | Read one scoped summary and confirm one destination candidate                                      | Approve, verify, sign, broadcast, reconcile, or issue evidence    |

## Lifecycle implementation

### Capture

- PostgreSQL-backed organizations, memberships, vendors, immutable destination versions, source documents, and obligations.
- Exact integer minor units; decimal input is parsed at the boundary.
- Manual creation plus PDF/PNG/JPEG upload with size, signature, MIME, opaque-name, tenant, and quarantine controls.
- Deterministic exact/possible duplicate detection.
- Strict extraction suggestion schema with confidence and provenance. The current provider is `SEEDED_FIXTURE`; a human must confirm every financial field.

### Control

- Immutable policy versions and reproducible structured findings.
- Amount bands, new-vendor controls, destination verification, duplicate resolution, completeness, and required role thresholds.
- Server-authorized approvals with creator restrictions and actor distinctness.
- Material changes invalidate policy decisions, approvals, readiness, and unsigned preparation.
- Settlement readiness returns structured reasons and requires current obligation, destination, decision, and approvals.

### Private Payables Link

- 256-bit invitation secrets are kept out of persistent plaintext storage; only keyed hashes are stored.
- Invitations are tenant-, vendor-, obligation-, version-, purpose-, contact-, and network-bound; default expiry is 24 hours.
- Fragment-only browser entry removes the token immediately and keeps it in memory.
- Contact verification issues a 30-minute HttpOnly scoped session. It is not wallet-ownership proof.
- One-time destination confirmation is transactional and idempotent; uncertain retries remain bound to the original receiver and key.
- The API returns `RECIPIENT_CONFIRMED`; the immutable destination stores
  `CONTACT_CONFIRMED` provenance and remains `UNVERIFIED` for settlement.
- An independent eligible finance actor must record manual verification.
- Contact changes atomically revoke open invitations, challenges, and sessions without redirecting historical links.

### Settle

- Exact quote and immutable intent bind organization, obligation/version, policy decision, approvals, vendor, destination/version/receiver, business amount/currency, exact zatoshis, quote times, opaque memo, network, privacy mode, and intent hash.
- ZIP-321 contains only the shielded receiver, exact ZEC value, and opaque memo—not vendor or invoice prose.
- Stale quote, obligation, destination, approval, network, amount, or memo fails closed.
- Financial execution is idempotent against double-click, retry, concurrency, uncertain broadcast, and replay.
- The web/backend has no seed, spending key, wallet RPC credential, PCZT, or raw signed transaction.

### Reconcile

- The Rust observer imports a UFVK as view-only and exposes no construction, signing, or broadcasting API.
- It uses `zcash_client_backend 0.24.0` and `zcash_client_sqlite 0.22.0` with a private SQLite scan cache.
- Normalized observations are tenant-scoped, idempotent, and correlated using transaction anchor, exact zatoshis, receiver evidence, and opaque memo reference.
- `BROADCAST`, `DETECTED`, `CONFIRMING`, and `SETTLED` remain separate.
- Node/scanner outage, stale tip, malformed output, mismatch, and confirmation regression preserve uncertainty; infrastructure failure never means unpaid.

### Prove

- Evidence derives only from canonical `SETTLED` obligations and matching reconciliation.
- Server-enforced disclosure classes and templates limit every external artifact.
- Deterministic canonical JSON and SHA-256 content hashes make tampering detectable.
- Evidence IDs contain 256 bits of random entropy and public routes use no-store, no-referrer, noindex, rate limiting, and privacy-safe access events.
- Issued artifacts are immutable; corrections revoke or supersede without rewriting history.
- JSON is canonical. Printable receipts exist; native server-generated PDF remains planned. Evidence is not marketed as a zero-knowledge business proof.

## Persistence and audit

The repository contains 14 ordered Drizzle migrations (`0000` through `0013`). Financial tables are organization-scoped and carry opaque identifiers and timestamps. Settlement foreign keys ensure a settlement cannot exist without an obligation and intent. Uniqueness and transactional locks protect invitation consumption, approvals, observations, and settlement execution.

The application audit chain records actor, organization, subject, event time, canonical payload hash, and previous hash. Events include vendor/destination changes, policy decisions, approvals, intent/signing/broadcast receipts, observations, evidence issuance, and recipient lifecycle actions. The chain is integrity-checked in PostgreSQL tests; it is not independently timestamped or externally anchored.

PostgreSQL RLS is not active. ADR 0009 documents why the present connection model cannot set a trustworthy per-request database identity safely; repository scoping, server-derived tenancy, transaction locks, authorization checks, and negative integration tests are the current compensating controls.

## Demonstrated evidence

### Isolated Z3 regtest — verified

- Date: 2026-10-06.
- Pool: Ironwood.
- Transaction: `55cace1af778497d182f64d88a5b611737c27017ef9382e19cbef47d77c0115a`.
- Amount: 25,000,000 zatoshis.
- Mined height: 119.
- Confirmations recorded: 1 then 3.
- Privacy policy: `FullPrivacy`.
- Signer: external Zallet `v0.1.0-beta.3` at commit `987382f…`.
- Observer: UFVK-only; backend spending authority `NONE`.
- Result: exact obligation and settlement reached `SETTLED`; audit chain valid.

This transaction exists on an isolated local network and cannot be verified through a public block explorer. The `/proof` surface renders the repository’s redacted historical record; it does not replay the payment.

### Public Zcash testnet — read path only

- TLS endpoint identified public testnet and active NU7 branch `77190ad9`.
- UFVK-only observer synchronized with real Ironwood subtree data and reported `spendingAuthority=false`.
- The recipient receiver was locally matched to the imported viewing account without exposing the UFVK.
- No funded output was received, signed, broadcast, observed, or reconciled.
- The pinned Zallet beta.3 dependency graph predates finalized NU7 transaction parameters, so live signer compatibility remains blocked pending a qualified artifact/environment.

Classification: `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`, not `PUBLIC_NETWORK_VERIFIED`. Render preview intentionally reports `PUBLIC_NETWORK_BLOCKED` because no observer or signer is configured there.

### Private Payables — isolated local acceptance

The browser ceremony used migrated PostgreSQL, separate Finance and Treasury identities, Chromium, the release Rust address inspector, and a loopback memory-only mail sink. It exercised invitation delivery acceptance, fragment cleanup, wrong-code rejection, contact verification, session recovery, scoped summary, Orchard address confirmation, and independent review. External email, signing, broadcast, and settlement were `NOT_TESTED`.

## Validation baseline

Merged `main` revision `26022d55bd8ad01c2bdd7dcf016a68c8f3ad1e66` passed GitHub CI on 2026-10-11. The Phase 7B correction run recorded:

- 213 non-database tests passed; 41 database-gated tests skipped in that run;
- 41/41 PostgreSQL integration tests passed against migrated PostgreSQL;
- 10/10 Rust observer tests passed;
- formatting, ESLint, strict TypeScript, production build, migration, secret scan, `npm audit`, and `cargo audit` passed; and
- GitGuardian passed.

The submission branch must re-run these gates before owner merge. Counts describe that recorded revision and should be updated if later changes alter the suite.

## Security guarantees and honest limits

Enforced:

- no unrestricted backend spending authority;
- no AI approval or money movement;
- no client-provided tenant or role trust;
- no floating-point money;
- no settlement without an obligation;
- no settlement conclusion at signing or broadcast;
- no viewing key in browser, PostgreSQL business data, logs, proof, or evidence;
- no recipient payment authority;
- no transparent fallback represented as private; and
- no fake blockchain success in proof paths.

Not yet proven or configured:

- funded public-testnet or mainnet settlement;
- current NU7-compatible public Zallet PCZT ceremony;
- production OIDC, object storage, malware scanner, email provider, rate-limit backend, node/data service, observer host, or signer host;
- live exchange-rate source;
- production AI extraction;
- native PDF receipt generation;
- independent audit-chain anchoring;
- customer adoption, revenue, or product-market fit.

## Important links

- [Architecture](../architecture/overview.md)
- [Security architecture](../architecture/security.md)
- [Threat model](../architecture/threat-model.md)
- [External signer ADR](../decisions/0007-non-custodial-zcash-settlement.md)
- [Observer ADR](../decisions/0006-zcash-read-only-observer.md)
- [Private Payables boundary](../decisions/0012-private-payables-recipient-boundary.md)
- [Private Payables operational evidence](../operations/evidence/PRIVATE_PAYABLES_OPERATIONAL_2026-10-11.md)
- [Public-testnet compatibility evidence](../operations/evidence/PUBLIC_TESTNET_COMPATIBILITY_2026-10-10.md)
