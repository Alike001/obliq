# PR #10 funded-test preflight

## Verdict

`PUBLIC_NETWORK_READY_FOR_FUNDED_TEST` remains the only truthful public-network
classification. PR #10 is compatible with the merged Render preview work after
syncing `origin/main`: preview mode still rejects database, OIDC, object
storage, observer, signer, financial mutations, and any status other than
`PUBLIC_NETWORK_BLOCKED`.

No public transaction was prepared, signed, broadcast, or observed during this
review.

## Current evidence

- Recipient ownership: `MATCH` from read-only UFVK algebra, without complete-UA
  string equality or spending authority.
- Observer: public testnet synchronized through height 4,474,328 with
  `UFVK_VIEW_ONLY` and `spendingAuthority=false`.
- Funded observation: not run.
- Public confirmation progression: not run.
- Public reorganization occurrence: not observed.
- Render public preview: remains read-only and fail-closed.

## Corrections made by this review

1. Settlement review now derives `testnet` or `regtest` from the immutable
   intent instead of displaying and handing off hard-coded regtest.
2. The external signing receipt requires and persists the inspected positive
   network fee as exact integer zatoshis; the audit chain records it.
3. Recipient, handoff, prior evidence, and evidence output files require private
   regular-file semantics. Handoffs and evidence snapshots use exclusive
   creation and cannot silently overwrite prior ceremony evidence.
4. Confirmation progression takes a distinct prior evidence file, preserving
   immutable snapshots, and accepts it only for the same bound payment and
   transaction output.
5. The runbook no longer claims that Zallet v0.1.0-beta.3 PCZT inspection shows
   memo plaintext. Memo correctness remains an observer-decryption gate.
6. The operator path uses a separate fresh Zallet sender for inspectable PCZT
   signing. Existing Zingo sender funds are not imported into Zallet.

## Funding-source check

On 2026-10-07, Fauzec's public read-only endpoints reported testnet, open launch
phase, ready state, Unified/Sapling recipient support, a 100,000,000-zatoshi
drip, and sufficient balance. The faucet requires a human Turnstile challenge.
Availability is third-party, volatile, and must be rechecked before an approved
claim. No faucet request was submitted in this review.

## Stop gate

Owner review and explicit approval are required before requesting testnet funds
or beginning any external signing step. A successful unfunded sync cannot
advance the classification.

## Validation executed in this review

- Format check, ESLint, strict TypeScript: passed.
- Unit suites: 15 passed / 124 tests passed; 6 database-gated files skipped in
  the unit-only invocation.
- PostgreSQL integration: 6 files / 28 tests passed after migration 0011.
- Empty PostgreSQL migration chain: passed from migration 0000 through 0011.
- Production Next.js build: passed.
- Exact Render preview install/check/build: passed from `npm ci`; runtime
  reported preview, disabled auth/storage/rate limit/network, and
  `PUBLIC_NETWORK_BLOCKED`.
- Preview HTTP smoke: public presentation routes returned 200; `/app`, auth,
  evidence verification, and POST returned 404. Supplying `DATABASE_URL`
  caused startup validation to fail closed.
- Secret-pattern scan: passed across 244 tracked/untracked source files.
- Production npm audit: zero vulnerabilities.
- Rust format, locked check, locked tests: passed; 6 observer tests passed.
- `cargo-audit`: not executed because installation of v0.22.2 timed out while
  downloading `gix-revwalk`. GitHub CI retains its cargo-audit job.
