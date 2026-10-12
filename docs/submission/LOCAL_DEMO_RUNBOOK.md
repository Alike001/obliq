# Local demo runbook

This runbook demonstrates Obliq’s persisted finance workflow, Private Payables Link, independent destination review, and historical regtest proof without creating a wallet or moving funds.

## Evidence labels used during the demo

| Surface                                  | Label                                                              |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Manually created local vendor/obligation | `SEEDED` / demo record                                             |
| Development extraction fixture           | `SEEDED_FIXTURE`                                                   |
| Loopback memory mail sink                | development-only; delivery acceptance, not external inbox delivery |
| Private Payables browser ceremony        | isolated local acceptance                                          |
| `/proof` settlement timeline             | historical `REGTEST VERIFIED` evidence                             |
| Public testnet                           | `READY FOR FUNDED TEST`; no funded payment                         |
| Mainnet                                  | `BLOCKED`                                                          |

Never present a local fixture obligation as the historical settled obligation. The committed proof record and the current demo database are separate evidence sources.

## Prerequisites

- Linux or another supported Node/Rust environment.
- Node.js 24 and npm 11.
- Docker with Compose.
- Rust stable toolchain.
- Google Chrome at `/usr/bin/google-chrome`, or set `OBLIQ_ACCEPTANCE_CHROME` to an installed Chrome-family binary.
- At least 2 GB free RAM for build plus browser ceremony and enough disk for dependencies, PostgreSQL, and the Rust target.
- A **non-sensitive Orchard-only regtest fixture receiver**. Never use a real recipient address or paste any UFVK, seed, or spending key into this workflow.

## 1. Confirm a clean, expected revision

```bash
git status --short
git rev-parse HEAD
git log -1 --oneline
```

Stop if the worktree is not clean or the revision is not the owner-approved submission candidate.

## 2. Install and validate

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run security:secrets
npm audit --omit=dev --audit-level=high
```

Build the read-only observer/address inspector. This does not create an observer account or wallet.

```bash
cargo build --release --locked --manifest-path tools/zcash-observer/Cargo.toml
cargo test --locked --manifest-path tools/zcash-observer/Cargo.toml
```

## 3. Create an isolated demo database

Start the repository PostgreSQL service:

```bash
docker compose up -d postgres
docker compose ps postgres
```

Use an explicit disposable database name so ordinary development data is not mixed with the demo. This command creates a database; it does not delete an existing one:

```bash
docker compose exec postgres createdb -U obliq obliq_submission_demo
```

If it already exists, stop and choose another explicit name rather than overwriting it.

```bash
export DATABASE_URL=postgresql://obliq:obliq@127.0.0.1:5433/obliq_submission_demo
npm run db:migrate
npm run db:seed
TEST_DATABASE_URL="$DATABASE_URL" npm run test:integration
```

The seed creates a development organization, owner membership, and versioned default policy only. It does not invent a settled payment.

## 4. Demonstrate the finance workspace

Copy `.env.example` to a local ignored `.env` and replace only development placeholders with fresh local values. Do not commit the file or print secrets in the recording.

Required safe local modes:

```text
OBLIQ_DEPLOYMENT_MODE=development
OBLIQ_SESSION_MODE=development
OBLIQ_STORAGE_MODE=local-development
OBLIQ_ZCASH_NETWORK=regtest
OBSERVER_NETWORK=regtest
OBLIQ_PUBLIC_NETWORK_STATUS=PUBLIC_NETWORK_BLOCKED
```

Generate distinct session and recipient peppers locally with a password manager or `openssl rand`; keep them in `.env` only. Start the app:

```bash
npm run dev
```

At `http://127.0.0.1:3000`:

1. Open `/app/vendors/new` and create an explicitly fictional demo vendor with a fixture email.
2. Open `/app/obligations/new` and create a vendor invoice with a clear demo reference.
3. Show `/app/obligations`: the record is persisted, not a dashboard-only number.
4. Open the obligation and show source, exact amount, current state, control findings, approval section, and activity.
5. Explain that the current record is not settled and do not manufacture later states.

For invoice upload, use a harmless local PDF/PNG/JPEG created for the demo. The current extraction result is a labelled fixture and must be human reviewed.

## 5. Run the canonical Private Payables ceremony

Use the automated acceptance harness for the invitation and independent-review proof. It creates its own isolated organization, Finance actor, Treasury reviewer, loopback mail sink, and browser contexts. It never signs or broadcasts.

In a private shell, set the non-sensitive regtest fixture receiver without displaying it:

```bash
read -rsp 'Orchard-only regtest fixture receiver: ' OBLIQ_ACCEPTANCE_RECEIVER
printf '\n'
export OBLIQ_ACCEPTANCE_RECEIVER
TEST_DATABASE_URL="$DATABASE_URL" npm run accept:private-payables
unset OBLIQ_ACCEPTANCE_RECEIVER
```

Stop if the receiver is not a disposable test vector. Do not use a real wallet address.

Expected sanitized result:

- invitation adapter acceptance: `PASS`;
- fragment cleanup and no token persistence: `PASS`;
- wrong-code neutral rejection: `PASS`;
- contact verification and expired-session recovery: `PASS`;
- obligation-scoped summary: `PASS`;
- Orchard destination confirmation: `PASS`;
- recipient result remains `UNVERIFIED`: `PASS`;
- separate Treasury review: `PASS`; and
- signing, broadcast, settlement, public network: `NOT_TESTED`.

The harness writes mode-`0600` screenshots and a sanitized report under ignored `.data/private-payables-acceptance/`. Review every image before presentation. Never expose the mail sink’s `/messages` output; it contains invitation and verification secrets by design.

For a live talk-through, use the approved PR #27 recipient and finance screenshots while explaining that the automated ceremony exercised the real API and PostgreSQL contracts. Do not manually copy tokens or codes into presentation notes.

## 6. Show independent review

The acceptance harness uses separate Finance and Treasury identities. Show the resulting `finance-review-complete.png` only after verifying it contains fixture data and no full receiver or secret.

Explain:

- the finance issuer cannot satisfy the independent review it created;
- recipient confirmation is `RECIPIENT_CONFIRMED` and `UNVERIFIED`;
- the Treasury reviewer records `VERIFIED_MANUALLY` with method and note;
- this is operational verification, not cryptographic wallet ownership; and
- changing the destination invalidates stale approvals/readiness/unsigned intent.

## 7. Show the historical regtest proof

Open `/proof` in the local app or read the committed safe evidence in:

- `apps/web/src/content/phase4-proof.ts`;
- `docs/decisions/0007-non-custodial-zcash-settlement.md`; and
- `docs/decisions/0006-zcash-read-only-observer.md`.

Present these exact facts:

- isolated Z3 regtest, not public testnet or mainnet;
- Ironwood pool;
- 25,000,000 zatoshis;
- mined height 119;
- confirmations observed at 1 and 3;
- external Zallet `FullPrivacy` signing;
- UFVK-only observation with `spendingAuthority=false`;
- matched opaque memo and amount; and
- canonical obligation and settlement reached `SETTLED` only after observation.

Do **not** attempt to rerun the transaction. Do not call it live demo activity. Do not claim a public explorer can find a local regtest transaction.

## 8. Verify preview fail-closed behavior

If the public Render preview is used during the presentation, check it separately:

```bash
curl -fsS https://obliq-7xh9.onrender.com/health/live
curl -fsS https://obliq-7xh9.onrender.com/health/ready
curl -sS -o /dev/null -w '%{http_code}\n' https://obliq-7xh9.onrender.com/app
curl -sS -o /dev/null -w '%{http_code}\n' https://obliq-7xh9.onrender.com/payables/invitation
```

Expected public routes are healthy; private product routes return `404`. Do not change Render configuration for the demo.

## 9. Stop and clean up

Stop local app and sink processes. Keep the database until the recording has been reviewed. After explicit owner confirmation that it is no longer needed, remove only the named disposable database using the documented PostgreSQL administration workflow—never a broad or unresolved target.

Do not commit `.env`, `.data`, screenshots containing fixture identifiers, browser profiles, database dumps, wallet files, observer caches, or generated credentials.

## Stop conditions

Stop the demonstration rather than weakening controls if:

- PostgreSQL is unavailable or migrations fail;
- the app falls back to an unexpected identity, network, or deployment mode;
- a link, code, receiver, session, or secret appears in logs or the recording;
- address inspection is unavailable or ambiguous;
- the independent reviewer is not a different eligible actor;
- an outcome is uncertain;
- a screen implies paid/settled without canonical observer evidence; or
- any command would create a wallet, request funds, sign, broadcast, or alter public-network status.
