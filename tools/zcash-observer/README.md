# Obliq Zcash observer

This server-only tracer imports a Unified Full Viewing Key as a
`ViewOnly` account, derives a shielded receiver, synchronizes compact blocks,
decrypts received outputs and emits normalized JSON. It has no transaction
builder, signer or broadcast API.

The UFVK is accepted only through `OBSERVER_UFVK`; the process never prints it.
The wallet scan cache belongs outside the web application database. See ADR
0006 and `docs/operations/zcash-observer.md` before running it.

The current Z3/Zaino `0.6.0-no-tls` regtest image rejects the new Ironwood
subtree-root enum from `zcash_client_backend 0.24.0`, so the preserved regtest
path scans wallet-requested ranges from their authenticated preceding tree
state. Public networks use librustzcash's maintained sync driver and require a
TLS endpoint whose reported chain identity matches `OBSERVER_NETWORK`.

Public testnet synchronization, including current Ironwood subtree roots, was
qualified on 2026-10-07. It remains ready for a funded test rather than verified:
no public shielded output has yet been observed. Mainnet stays runtime-gated.
