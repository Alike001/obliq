# Zcash observer operations

Status: **IMPLEMENTED for isolated regtest; public-network deployment PLANNED**

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
The current process adapter accepts only `regtest`; `testnet` or `mainnet`
returns `MISCONFIGURED / PUBLIC_NETWORK_UNAVAILABLE` without starting the
observer. Public-network operation remains gated on the compatibility and
operational work below.

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

The isolated tracer used Zaino `0.6.0-no-tls`. That build rejects Ironwood
subtree-root requests from librustzcash 0.24.0, so the tracer scanned requested
ranges from their preceding authenticated tree state. Do not deploy the h2c
Zaino endpoint publicly. Production requires authenticated TLS and validated
Ironwood subtree-root/reorg behavior at operational scale.

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
