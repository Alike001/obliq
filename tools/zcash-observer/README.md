# Obliq Zcash observer

This server-only tracer imports a Unified Full Viewing Key as a
`ViewOnly` account, derives a shielded receiver, synchronizes compact blocks,
decrypts received outputs and emits normalized JSON. It has no transaction
builder, signer or broadcast API.

The UFVK is accepted only through `OBSERVER_UFVK`; the process never prints it.
The wallet scan cache belongs outside the web application database. See ADR
0006 and `docs/operations/zcash-observer.md` before running it.

The current Z3/Zaino `0.6.0-no-tls` regtest image rejects the new Ironwood
subtree-root enum from `zcash_client_backend 0.24.0`. This observer therefore
scans wallet-requested ranges from their authenticated preceding tree state.
Large production wallets still require a compatible source for subtree roots;
mainnet deployment remains blocked on that operational qualification.
