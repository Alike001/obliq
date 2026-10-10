# Public-testnet compatibility audit — 2026-10-10

## Outcome

The UFVK-only observer path is **PASS** for current public-testnet read-only
synchronization. The external signer path is **BLOCKED** because the pinned
official Zallet beta.3 artifact predates finalized NU7 transaction parameters.
No wallet, account, funding, proving, signing or broadcast operation was used.

This does not change Obliq to `PUBLIC_NETWORK_VERIFIED`. The repository status
continues to describe the observer as ready for a funded test; the funded
ceremony itself is unauthorized while signer compatibility is blocked.

## Commands and observed results

Run from repository revision `85faef03370b45efe18fe12e707f0d8394959aa8`:

```sh
cargo build --release --locked \
  --manifest-path tools/zcash-observer/Cargo.toml

OBSERVER_NETWORK=testnet \
OBSERVER_ENDPOINT=https://testnet.zec.rocks:443 \
tools/zcash-observer/target/release/obliq-zcash-observer preflight
```

The endpoint reported chain `test`, tip `4,484,951`, active branch `77190ad9`,
NU7 active, LightWalletD `v0.5.4` commit `c22ca9b…`, and Zebra
`v7.0.0-rc.0`. This is endpoint self-reporting over TLS, not an independent
attestation of service correctness.

The existing private observer cache was then synchronized without supplying a
viewing key to the command or environment:

```sh
OBSERVER_NETWORK=testnet \
OBSERVER_DB=/home/ali/.local/state/obliq/testnet-observer/recipient-observer.sqlite \
OBSERVER_ENDPOINT=https://testnet.zec.rocks:443 \
tools/zcash-observer/target/release/obliq-zcash-observer sync
```

It reported `UFVK_VIEW_ONLY`, `spendingAuthority=false`, matching tip and fully
scanned height `4,484,943`, `synced=true`, and zero observations. A separate
local `verify-recipient` check returned `MATCH`. Paths are shown for
reproducibility; neither file is committed, and both were mode `0600` under a
mode-`0700` directory.

Official GitHub release metadata and the downloaded x86-64 Zallet archive were
checked:

```sh
gh api repos/ZcashFoundation/zebra/releases/latest
gh api repos/zcash/zallet/releases/latest
gh api repos/zingolabs/zaino/releases/latest
sha256sum -c zallet-v0.1.0-beta.3-linux-amd64.tar.gz.sha256
zallet-zaino --version
```

The archive matched
`1df2398df016ae6e9a1cba3f8ef0cc86ca0d7b48a0934b34df6f68114ebe9306`
and the binary identified itself as `zallet 0.1.0-beta.3`. Its source lockfile
pins librustzcash `1f6bb207…` and embedded Zaino `d2d06bdd…`.

## Compatibility finding

At the pinned librustzcash revision, `TestNetwork::activation_height(Nu7)` is
`None` and the feature-gated `BranchId::Nu7` encodes as provisional
`ffffffff`. ZIP 259 and the live testnet service require activation height
`4,465,026` and branch `77190ad9`. Zallet beta.3 therefore cannot be accepted
for the post-NU7 ceremony merely because its archive is authentic.

The repository's separate Zaino `0.10.1` review pin is not the Zaino revision
embedded by beta.3, and the public observer endpoint identifies as ECC
LightWalletD rather than standalone Zaino. These components must not be
conflated in qualification evidence.

## Evidence boundaries

| Check                                         | State      | Evidence boundary                                                |
| --------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| Regtest signed/broadcast/reconciled lifecycle | PASS       | Historical Phase 4 real Z3 regtest evidence                      |
| Public testnet chain identity and NU7 branch  | PASS       | Fresh TLS endpoint response                                      |
| UFVK-only public sync and recipient ownership | PASS       | Fresh local private observer run                                 |
| Ironwood subtree consumption                  | PASS       | Fresh maintained sync completed; no funded output                |
| Natural public reorganization observed        | NOT_TESTED | Upstream recovery path exists; no reorg occurred                 |
| Zallet executable identity/checksum           | PASS       | Official release asset and local hash                            |
| Post-NU7 Zallet PCZT compatibility            | BLOCKED    | Pinned dependency graph predates final NU7                       |
| Account-free RPC discovery                    | NOT_TESTED | Requires compatible Zallet plus Zebra JSON-RPC                   |
| Unfunded PCZT create/inspect                  | NOT_TESTED | Requires compatible Zallet and owner-approved disposable account |
| Public shielded observation/reconciliation    | NOT_TESTED | Requires funded external transaction                             |

## Primary sources

- [Zebra v7.0.0-rc.0](https://github.com/ZcashFoundation/zebra/releases/tag/v7.0.0-rc.0)
- [Zallet v0.1.0-beta.3](https://github.com/zcash/zallet/releases/tag/v0.1.0-beta.3)
- [Pinned Zallet dependency graph](https://github.com/zcash/zallet/blob/987382f67e622915228686e9f956c6a9c9a7514c/Cargo.toml)
- [Pinned pre-final NU7 consensus constants](https://github.com/zcash/librustzcash/blob/1f6bb2072e7fcb142b0d90ff7b267a8699a84818/components/zcash_protocol/src/consensus.rs)
- [Zaino 0.10.1](https://github.com/zingolabs/zaino/releases/tag/0.10.1)
- [ZIP 259](https://zips.z.cash/zip-0259)

The machine-readable companion is
[`public-testnet-compatibility-2026-10-10.json`](./public-testnet-compatibility-2026-10-10.json).
