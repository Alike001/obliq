# Reality Research: Phase 6 production-hardening baseline

## Scope

This review traces the implemented Phase 1–5 assets, authority boundaries,
runtime modes, deployment assumptions, and current public-Zcash dependency
state before Phase 6 changes. It records current facts rather than treating
documented aspirations as controls.

## Sources Checked

- `obliq-context/Obliq_Master_Context.docx`, extracted read-only.
- Every ADR in `docs/decisions/0001` through `0008`.
- `docs/architecture/*`, `/security`, `/proof`, `.env.example`, CI, migrations,
  repositories, server actions, storage, observer, settlement, reconciliation,
  evidence, and tests.
- Fresh empty PostgreSQL migration and the complete baseline validation suite.
- Current Next.js 16 documentation through Context7.
- Current official/project source: Zaino `0.10.1`, Zaino component changelogs,
  librustzcash `zcash_client_backend 0.24.0`, lightwalletd `0.5.4`, Zebra
  `v7.0.0-rc.0`, Z3 main, and the current Zallet book/RPC index.

## Verified Facts

### Asset and authority trace

| Asset                        | Read / modify / authorize                                               | Storage                                    | Tenant enforcement                                            | Compromise impact                                      | Implemented mitigation                                               | Residual risk before Phase 6                                                     |
| ---------------------------- | ----------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Organization financial data  | Active members read; finance/control roles mutate                       | PostgreSQL                                 | Repository `organization_id` predicates and active membership | Full AP history disclosure or corruption               | Server-only repositories, exact money, audit chain                   | Identity is development-only; no RLS                                             |
| Invoice files                | Uploading member writes; no download route                              | Local private filesystem                   | Generated path under organization UUID                        | Malware, sensitive-document disclosure                 | Size, MIME and magic-byte checks; `0600` files                       | No production object store, quarantine, scan, retention or download control      |
| Vendor data                  | Finance roles mutate                                                    | PostgreSQL                                 | Scoped repositories                                           | Counterparty disclosure or destination substitution    | Immutable destination history, verification provenance, invalidation | Manual verification is not ownership proof                                       |
| Policies and approvals       | Policy administrators configure; eligible roles approve                 | PostgreSQL                                 | Scoped joins, membership roles, version binding               | Unauthorized spend authorization                       | Deterministic policy, actor separation, invalidation                 | Development identity is the upstream actor source                                |
| Settlement intents           | Finance/Treasury/CFO/Owner prepare; Treasury/CFO/Owner execute receipts | PostgreSQL                                 | Scoped execution snapshot and organization locks              | Transaction substitution or replay                     | Exact version/hash, quote expiry, idempotency keys                   | External receipt remains an operator assertion until observation                 |
| Viewing authority            | Observer process only                                                   | Observer environment; derived wallet cache | Separate process, no application API                          | Treasury privacy loss                                  | UFVK ViewOnly import; no spending API; redaction tests               | Cache encryption, secret manager, TLS and incident procedure are not implemented |
| Observer cache               | Observer process                                                        | SQLite                                     | Separate from business database                               | Transaction graph/privacy disclosure or corrupted sync | Dedicated path and wallet consistency logic                          | No production encryption/backup/restore validation                               |
| Signer boundary              | Human-operated Zallet                                                   | External host                              | No application credential                                     | Signer compromise can spend wallet funds               | One-way intent/handoff; sanitized receipt only                       | Privileged plaintext RPC and human comparison are operational controls           |
| Evidence packages            | Authorized members issue; bearer recipients read selected claims        | PostgreSQL                                 | Issuance role checks; public random token                     | Deliberate-field leakage or stale claim reliance       | Allowlist, 256-bit ID, hashing, revocation                           | No rate limiting, access telemetry, anti-indexing or recipient expiry            |
| Audit chain                  | Application writers append; members/proof verify                        | PostgreSQL                                 | Per-organization chain and transaction lock                   | Tampering can conceal privileged actions               | Canonical SHA-256 link verification                                  | Same database/admin trust domain; no external anchoring                          |
| Authentication/session state | Environment-selected development actor                                  | Environment + membership row               | Membership lookup                                             | Environment compromise impersonates an active member   | Fails closed unless mode is exactly `development`                    | No production identity, session lifecycle, logout or invalidation                |

### Mutation review

- Every server action obtains its actor through the server-only session module.
- Repositories validate active membership and role for vendor writes,
  obligations, policy administration, control evaluation, destination
  verification, duplicate resolution, approvals, readiness, settlement
  preparation/execution, reconciliation and evidence lifecycle actions.
- Owned-resource queries use organization predicates. Several settlement
  follow-up updates use a previously scoped UUID without repeating the
  organization predicate; no cross-tenant exploit was demonstrated, but those
  writes are less auditable than fully scoped mutations.
- Next.js Server Actions are remotely invokable POST entry points. Current
  Next.js performs Origin versus Host checks, but each action must still
  authenticate and authorize itself. The actions do authenticate; there is no
  explicit application request/rate-limit layer.

### Runtime/status inventory

- `SEEDED`: invoice extraction fixture only.
- `REGTEST VERIFIED`: UFVK observation, shielded signing/broadcast, and
  end-to-end reconciliation evidence.
- `PLANNED`: production identity, RLS decision, private object storage,
  malware scanning, rate limiting, scan-cache encryption/custody, native PDF,
  independent audit anchoring, and ledger.
- `BLOCKED`: public-network observation/execution qualification.
- `UNAVAILABLE`: embedded wallet custody and ZK business proofs.
- Development-only: environment-selected tenant identity, local invoice
  filesystem, controlled regtest quote source.

### Baseline validation

- Formatting, lint, strict TypeScript, 83 unit tests, production build, secret
  scan, fresh migrations, 22 PostgreSQL integration tests, Rust formatting and
  Rust check pass.
- The npm production audit endpoint returned a network error during the first
  baseline run; this is not a vulnerability result.
- `cargo-audit` is not installed.

### Current public-Zcash dependency state

- Zaino `0.10.1` was released 2026-09-29.
- Zaino's `zaino-serve 0.7.0` changelog says `z_getsubtreesbyindex` accepts
  `ironwood` and gRPC `GetSubtreeRoots` serves Ironwood via
  `ShieldedProtocol::Ironwood`. Its protocol changelog added Ironwood in
  `zaino-proto 0.5.0` and later aligned the vendored lightwallet protocol with
  upstream `v0.5.0`.
- This means the precise Zaino enum rejection recorded in ADR 0006 is fixed in
  current upstream releases.
- The current Obliq Rust observer still hardcodes `LocalNetwork` activation
  parameters, and the TypeScript adapter deliberately rejects testnet/mainnet.
  No current public-network UFVK sync, transaction, or funded settlement has
  been demonstrated by Obliq.
- Official Zebra documentation still recommends the `zcash/lightwalletd`
  service for production-exposed light-wallet service and requires TLS; Zebra's
  direct lightwalletd-compatible port is documented as experimental, plaintext,
  and unauthenticated unless isolated behind a proxy.

## Inferences

- The earlier upstream Ironwood subtree-root blocker is no longer sufficient by
  itself to classify public operation as technically impossible.
- Obliq nevertheless remains `PUBLIC_NETWORK_BLOCKED` until its observer is
  parameterized and a real public synchronization/observation qualification is
  completed. Upstream capability is not Obliq evidence.
- Repository isolation is currently coherent, but a production identity
  failure would undermine every downstream role check because the actor is the
  root of authorization.

## Unknowns And Questions

- Which production OIDC issuer and client credentials will be provisioned?
- Which private object store and malware scanner will be operated?
- Which secret manager and encrypted-volume/KMS implementation will protect the
  UFVK cache?
- Whether the competition environment can sustain a public Zebra/Zaino or
  Zebra/lightwalletd initial sync within the available resources.
- Which public-network external wallet will create the first diversified
  receiver and funded shielded test transaction.

## Not Included

- No public funds were moved and no wallet, seed, spending key, or UFVK was
  requested.
- No public-network success is inferred from changelogs.
- No Phase 7 presentation or competition-polish work is included.
