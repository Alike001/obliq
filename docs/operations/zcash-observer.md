# Zcash observer operations

Status: **REGTEST VERIFIED; PUBLIC NETWORK READY FOR FUNDED TEST**

## Components

- `tools/zcash-observer`: Rust process pinned to `zcash_client_backend 0.24.0`
  and `zcash_client_sqlite 0.22.0` (`zcash_keys 0.16.1`,
  `zcash_primitives 0.30.1`, `zcash_protocol 0.10.6`).
- Dedicated SQLite scan cache: operational wallet state, never the business
  source of truth.
- Zebra-backed lightwalletd-compatible service: compact blocks, tree state,
  full transactions, and chain tip.
- PostgreSQL: tenant-scoped targets, normalized observations, status, and audit
  events. It never stores a UFVK.

The observer interface contains status and observe operations only. It contains
no transaction builder, proposal, signer, seed import, or broadcaster.
The process adapter accepts `regtest`, `testnet`, or `mainnet`, passes the
selection to the sidecar, and rejects any mismatch between application,
sidecar, and data-service chain identity. Runtime policy permits testnet only
with `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST` or stronger status. Mainnet remains
blocked until `PUBLIC_NETWORK_VERIFIED` is backed by real evidence.

## Secret injection

Supply `OBSERVER_UFVK` to the isolated observer process from a production secret
manager. Do not put it in `.env`, process arguments, application logs, proof
output, screenshots, browser state, PostgreSQL, or CI variables available to
untrusted jobs. Restrict and encrypt the SQLite scan cache and backups because
decrypted transaction metadata can compromise commercial privacy.

Non-secret settings:

```text
OBSERVER_ENDPOINT=https://private-lightwalletd.example
OBSERVER_DB=/var/lib/obliq-observer/wallet.sqlite
OBSERVER_NETWORK=testnet
```

After creating tenant-scoped observation targets, operators run
`npm run zcash:observe`. The command records observer health, normalizes each
output, performs deterministic correlation, and idempotently upserts matched
observations. Its stdout is allowlisted to status, heights, and counts. It never
prints a receiver, memo, UFVK, transaction payload, or database credential.

## Synchronization

An available server is not necessarily synchronized. Persist both chain-tip
and fully-scanned heights. If either the node or observer is unavailable, or the
scan lags, record infrastructure status and leave the last financial conclusion
unchanged.

The isolated tracer used Zaino `0.6.0-no-tls`. Public networks now use the
maintained librustzcash sync driver, which imports Sapling, Orchard, and Ironwood
subtree roots and verifies recent ranges before scanning. On a continuity error
it truncates and rescans. The 2026-10-07 public-testnet qualification scanned
heights 4,472,946 through 4,472,968 from authenticated tree state and ended
fully synchronized. See ADR 0011.

The public compatibility endpoint was not Obliq-operated. Production must use
an owned Zebra/Zaino stack over private authenticated TLS; do not expose Zaino
h2c or Zebra/lightwalletd-style unauthenticated RPC publicly.

The sidecar returns its exact network; the process adapter rejects a mismatch.
Its SQLite file is set owner-only on Unix after a scan. Production must also use
an encrypted volume and encrypted restricted backups. Corruption or restart
failure reports observer UNAVAILABLE and preserves the last financial result.

## Correlation and confirmation

Allocate a unique shielded receiver per target, place only a random opaque
reference in the memo, and compare exact zatoshis. All three signals must match.
The default tracer policy settled at three confirmations. Amount alone never
correlates a payment.

`DETECTED` means the output is known, `CONFIRMING` means it is below threshold,
and `SETTLED` means the current main-chain view reaches threshold. `MISMATCH`
is an exception. `UNAVAILABLE` describes infrastructure, not paid/unpaid state.

## Regtest reproduction boundary

Use the official Z3 regtest guide and ADR 0006. The external sender must remain
outside Obliq. Export only its recipient account UFVK to the observer. Never
import a mnemonic or spending key to simplify the demonstration.

## Public funded-test boundary

Do not fund the deterministic key used for compatibility qualification. A
funded test requires a fresh external testnet wallet account with its mnemonic
backed up outside Obliq. Export only the account UFVK to the observer, initialize
the observer from a birthday preceding the payment, and send to the
observer-derived `utest1...` receiver from a separate externally controlled
wallet. Obliq must never receive either wallet's mnemonic or spending key.

The complete preparation, external-wallet ceremony, fee boundary, and
sanitized verification procedure are in
[Public testnet settlement verification](./public-testnet-verification.md).
