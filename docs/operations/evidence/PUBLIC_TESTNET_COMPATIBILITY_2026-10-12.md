# Public-testnet compatibility audit — 2026-10-12

## Decision

**Full application-bound settlement: NO-GO.** No released signing path was
found that both supports finalized NU7 and preserves Obliq's reviewed PCZT
handoff, independent human inspection, and external signing boundary.

**Read-only observer: PASS.** The existing private UFVK-only observer was
freshly synchronized to public testnet. It observed no payment, so this is not
public settlement evidence.

**Limited observer-receipt candidate: NOT_TESTED.** Zingo PC 2.0.26-196 is an
official pre-release whose release notes and pinned zingolib revision add NU7
support. It signs and broadcasts internally, however, so it can only be
considered for a separately approved receipt-observation experiment. It cannot
satisfy Obliq's full external-PCZT settlement acceptance gate.

No wallet, account, funding, proving, signing or broadcast action was used.

## Reproducible read-only checks

Run from repository revision
`69ea46b46940cea3fd4fcefe9f37d49e2af7f132`:

```sh
OBSERVER_NETWORK=testnet \
OBSERVER_ENDPOINT=https://testnet.zec.rocks:443 \
tools/zcash-observer/target/release/obliq-zcash-observer preflight
```

Sanitized result:

| Field                   | Result                                       |
| ----------------------- | -------------------------------------------- |
| Network / service chain | `testnet` / `test`                           |
| Chain tip               | `4,492,164`                                  |
| NU7 activation / active | `4,465,026` / `true`                         |
| Active consensus branch | `77190ad9`                                   |
| Service                 | ECC LightWalletD `v0.5.4`, commit `c22ca9b…` |
| Node                    | Zebra `v7.0.0-rc.0`                          |
| Authority               | `NONE_REQUIRED`                              |
| Spending authority      | `false`                                      |

The endpoint is a third-party TLS service. These values are its authenticated
transport response, not an independent attestation of server correctness.

Using the already initialized private observer cache, without a UFVK in an
argument or environment variable:

```sh
OBSERVER_NETWORK=testnet \
OBSERVER_DB=/home/ali/.local/state/obliq/testnet-observer/recipient-observer.sqlite \
OBSERVER_ENDPOINT=https://testnet.zec.rocks:443 \
tools/zcash-observer/target/release/obliq-zcash-observer sync
```

The observer reported `UFVK_VIEW_ONLY`, `spendingAuthority=false`, tip and
fully-scanned height `4,492,165`, `synced=true`, and zero observations. The
existing sanitized receiver check remained `MATCH`, with one matching account,
an Orchard receiver, recovered diversifier, and private mode-`0600` input files
under a mode-`0700` directory. No viewing material or full receiver is retained
in this evidence.

## Signer audit

| Candidate               | Current finding                                                                                                                                | Qualification                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Zallet `v0.1.0-beta.3`  | Latest official release; pins librustzcash `1f6bb207…`, which predates finalized NU7 parameters                                                | **BLOCKED**                                             |
| Zallet main `d9a09634…` | Unreleased; PR #900 removed `zallet-zaino`; current Zebra backend needs co-located indexed Zebra state and still pins librustzcash `1f6bb207…` | **BLOCKED**                                             |
| Zingo PC `2.0.26-196`   | Official pre-release at `48fdae3c…`; pins zingolib `6d43e7c4…` and claims finalized NU7 support                                                | **NOT_TESTED**, limited observer-receipt candidate only |

Zingo's reviewed send path obtains a proposal and fee, then its confirmation
action calls the wallet's internal confirm operation, which signs and
broadcasts. It does not yield the separately inspectable PCZT artifact required
to bind Obliq's exact intent to an external signer. Consequently, even a real
Zingo-to-observer payment would be classified
`PUBLIC_TESTNET_OBSERVATION_VERIFIED`, never full public-network settlement.

## Funding service check

Fauzec's read-only API reported testnet, an open launch phase, a
100,000,000-zatoshi drip, and `cause=ready`. Its telemetry was internally stale
at collection time: the reported tip was below both the live observer tip and
its own reported scan height. Funding is therefore **AVAILABLE BUT UNQUALIFIED**
until a human rechecks the service immediately before an approved attempt.

No faucet claim was made.

## Evidence matrix

| Check                                           | State      | Boundary                                        |
| ----------------------------------------------- | ---------- | ----------------------------------------------- |
| Regtest external sign/broadcast/reconcile       | PASS       | Historical Phase 4 evidence                     |
| Public testnet chain identity and NU7           | PASS       | Fresh third-party TLS endpoint response         |
| UFVK-only public sync                           | PASS       | Fresh local private observer run                |
| Existing recipient receiver / UFVK relationship | PASS       | Sanitized local `MATCH` result                  |
| Public shielded output observed                 | NOT_TESTED | Requires an owner-approved funded send          |
| Zingo 2.0.26-196 NU7 send                       | NOT_TESTED | Requires reviewed installation and owner action |
| Zallet finalized-NU7 PCZT                       | BLOCKED    | No compatible released artifact found           |
| Full application-bound public settlement        | BLOCKED    | Compatible external PCZT signer missing         |
| Natural public reorganization                   | NOT_TESTED | No reorg occurred during the check              |

## Primary sources

- [ZIP 259](https://zips.z.cash/zip-0259)
- [Zallet beta.3](https://github.com/zcash/zallet/releases/tag/v0.1.0-beta.3)
- [Zallet PR #900](https://github.com/zcash/zallet/pull/900)
- [Zallet current source](https://github.com/zcash/zallet/tree/d9a096342d0d5247c8c6d5c74f87b3b14095fd50)
- [Zebra v7.0.0-rc.0](https://github.com/ZcashFoundation/zebra/releases/tag/v7.0.0-rc.0)
- [Zaino 0.10.1](https://github.com/zingolabs/zaino/releases/tag/0.10.1)
- [Zingo PC 2.0.26-196](https://github.com/zingolabs/zingo-pc/releases/tag/zingo-pc-2.0.26-196)
- [Pinned Zingo NU7 integration](https://github.com/zingolabs/zingo-pc/blob/48fdae3cb81a37c7130c2292942777724e5ccd24/native/Cargo.toml)

The machine-readable companion is
[`public-testnet-compatibility-2026-10-12.json`](./public-testnet-compatibility-2026-10-12.json).
