# ADR 0011: Public Zcash is ready for a funded test

- Status: Accepted
- Date: 2026-10-07
- Classification: `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`
- Supersedes: ADR 0010's `PUBLIC_NETWORK_BLOCKED` classification

## Decision

Obliq's read-only observer now supports explicit `testnet` and `mainnet`
consensus parameters in addition to the proven Z3 regtest parameters. Public
operation is still gated by runtime network identity and qualification status.
Testnet may be selected only when the runtime status is at least
`PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`; mainnet remains fail-closed unless a
future evidence-backed change sets `PUBLIC_NETWORK_VERIFIED`.

This decision does **not** qualify public settlement. It qualifies the observer
architecture and synchronization path for the next externally funded test.
No public shielded output has yet been sent to or decrypted by Obliq.

## Evidence collected

On 2026-10-07, a fresh observer cache was initialized against public Zcash
testnet using only a deterministic, publicly known qualification UFVK that must
never receive funds. The qualification run:

- connected over TLS to `testnet.zec.rocks:443`;
- required the service to report chain identity `test`;
- initialized from authenticated tree state at height `4,472,945`;
- imported the service's Sapling, Orchard, and Ironwood subtree roots through
  `zcash_client_backend::sync::run`;
- scanned through height `4,472,968`;
- reported `fullyScannedHeight = chainTipHeight = 4,472,968` and `synced = true`;
- reported `authority = UFVK_VIEW_ONLY` and `spendingAuthority = false`;
- found zero observations, as expected for an unfunded qualification key; and
- created its local cache with Unix mode `0600`.

Independent protocol probes at the same time showed:

| Network | Service evidence                                                             | Ironwood subtree result                         |
| ------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| Mainnet | lightwalletd `v0.5.3`, Zebra `v6.3.0`, chain `main`, height `3,508,826`      | index 0 returned, completing height `3,451,206` |
| Testnet | lightwalletd `v0.5.4`, Zebra `v7.0.0-rc.0`, chain `test`, height `4,472,944` | index 0 returned, completing height `4,307,326` |

The endpoints are independently operated public services, not Obliq production
infrastructure. Their successful responses prove wire compatibility, not their
trustworthiness, availability, or privacy. Production requires an
Obliq-controlled Zebra/Zaino deployment on a private authenticated transport.

## Reorganization behavior

Public networks use librustzcash's maintained sync driver rather than the small
regtest compatibility loop. On every run it updates the chain tip, requests any
`Verify` range first, downloads the range again, validates chain continuity and
commitment trees, and truncates ten blocks before a detected continuity error
before rescanning. A live public reorganization did not occur during the
qualification window, so the implementation path is present and upstream-tested
but a naturally occurring public reorg is not claimed as observed evidence.

The legacy Z3 tracer remains on its range scanner because its pinned Zaino
`0.6.0-no-tls` image predates the Ironwood subtree-root enum. This preserves the
existing regtest evidence without weakening the public path.

## Current stack

Obliq remains pinned to:

- `zcash_client_backend 0.24.0`;
- `zcash_client_sqlite 0.22.0`;
- `zcash_keys 0.16.1`;
- `zcash_primitives 0.30.1`;
- `zcash_protocol 0.10.6`; and
- `tonic 0.14.6`, now with native-root TLS support.

Current upstream state reviewed on 2026-10-07:

- Zebra `v7.0.0-rc.0`, release commit
  `6d1e414d6f55e4180d0e47baaa934bf97d5b4fec`;
- Zaino `0.10.1`, release commit
  `3244a74bb09fa6a09a4b2deeb6be53bab0890747`;
- Zallet `v0.1.0-beta.3`, commit
  `987382f67e622915228686e9f956c6a9c9a7514c`;
- lightwalletd `v0.5.4`, commit
  `09593edbee4ee68d47e5a53f8ce1c83514c4e8e6`; and
- current librustzcash `main` commit
  `eb3e586765236a808dc82eee85f2be47e11e48c6`.

Current Zaino defines Sapling, Orchard, and Ironwood shielded pools and serves
Ironwood subtree roots. Current Zallet can export account UFVK/UIVK values, but
its `z_importviewingkey` implementation still accepts only a Sapling extended
full viewing key. It is therefore not the selected Orchard/Ironwood watch-only
observer. Obliq continues to use direct librustzcash UFVK import with
`AccountPurpose::ViewOnly`.

## Funded-test gate

The only missing acceptance evidence for public observation is an externally
authorized shielded testnet transaction to a fresh receiver whose UFVK alone is
given to Obliq. No seed or spending key may enter the application or observer.
The operator must inspect the wallet proposal and fee, send deliberately, then
allow the existing observer to record detection and confirmation progression.

Until that happens:

- `/proof` must continue to say the verified settlement is regtest-only;
- public shielded observation and settlement are not `VERIFIED`;
- mainnet execution remains blocked;
- public data-service uptime is not a financial conclusion; and
- there is no transparent fallback.

Phase 7A adds a testnet-bound controlled quote and immutable-intent preparation
command plus a sanitized qualification harness. These changes make the funded
test reproducible, but do not add network evidence. The classification remains
unchanged. See `docs/operations/public-testnet-verification.md`.

The owner-review preflight also established two execution details:

- Zallet v0.1.0-beta.3 `pczt_inspect` exposes creator-recorded receiver/value
  metadata, shielded bundle composition, privacy policy, and implied fee, but
  not memo plaintext. The opaque memo is bound by local handoff-to-create chain
  of custody before signing and independently verified only after UFVK
  decryption. This limitation must remain visible; inspection is not evidence
  that the memo itself is correct.
- The exact inspected network fee is now mandatory in the sanitized signing
  receipt, persisted as integer zatoshis, and included in chained audit
  metadata. Historical settlement rows remain nullable; no historical fee is
  fabricated.

Qualification handoffs and evidence reports use owner-only, non-symlink files
and exclusive creation. Each confirmation run creates a new immutable report
and names its prior report explicitly, preserving rather than overwriting the
progression evidence.

## Authoritative sources

- [Zaino source and changelog](https://github.com/zingolabs/zaino)
- [Zallet RPC methods](https://zcash.github.io/zallet/rpc/index.html)
- [Zebra lightwalletd interface](https://zebra.zfnd.org/user/lightwalletd.html)
- [librustzcash source](https://github.com/zcash/librustzcash)
- [lightwalletd protocol and operations](https://github.com/zcash/lightwalletd)
- [Z3 operator stack](https://github.com/ZcashFoundation/z3)
- [ZIP 317 fee calculation](https://zips.z.cash/zip-0317)
