# Obliq Zcash observer

This server-only tracer imports a Unified Full Viewing Key as a
`ViewOnly` account, derives a shielded receiver, synchronizes compact blocks,
decrypts received outputs and emits normalized JSON. It has no transaction
builder, signer or broadcast API.

On first initialization, the UFVK is accepted through a hidden terminal prompt.
For non-interactive secret-manager integration, `init --ufvk-stdin` reads it
from standard input. The process never accepts it in an environment variable or
command argument and never prints it. After import, `sync` uses only the private
observer database. The wallet scan cache belongs outside the web application
database. See ADR 0006 and `docs/operations/zcash-observer.md` before running it.

The current Z3/Zaino `0.6.0-no-tls` regtest image rejects the new Ironwood
subtree-root enum from `zcash_client_backend 0.24.0`, so the preserved regtest
path scans wallet-requested ranges from their authenticated preceding tree
state. Public networks use librustzcash's maintained sync driver and require a
TLS endpoint whose reported chain identity matches `OBSERVER_NETWORK`.

Public testnet synchronization, including current Ironwood subtree roots, was
qualified on 2026-10-07. It remains ready for a funded test rather than verified:
no public shielded output has yet been observed. Mainnet stays runtime-gated.

`verify-recipient` opens an existing observer database read-only and uses the
imported account's incoming-viewing-key algebra to test whether the Orchard
receiver in a private recipient JSON file belongs to that account. It does not
compare complete Unified Address strings, require spending authority, contact a
network service, or print the address or viewing key:

```sh
OBSERVER_NETWORK=testnet \
OBSERVER_DB=/private/observer.sqlite \
OBSERVER_RECIPIENT_FILE=/private/recipient.json \
./target/release/obliq-zcash-observer verify-recipient
```

Both files must be regular, non-symlink files with mode `0600`. The recipient
file must contain only `{ "address": "utest1..." }`.
