# Reality Research: Obliq Phase 3 Zcash read path

## Scope

Current, authoritative implementation reality for observing shielded Zcash
payments with read-only authority. This brief answers the research gate before
any Obliq product integration.

## Sources Checked

- `obliq-context/Obliq_Master_Context.docx`
- Every file under `obliq-context/implementation-reference/`, with particular
  attention to files 01, 02, 03, 04, 06, 07, and 09
- Phase 2 commit `055e863a1fe66189bf2ad83e087253efdf303f88`
- Existing `packages/zcash`, settlement schema, threat model, and ADRs
- [Zallet Book](https://zcash.github.io/zallet/) and
  [current RPC reference](https://zcash.github.io/zallet/rpc/index.html)
- [Zallet source](https://github.com/zcash/zallet), current `main` commit
  `98c5c2a00fd447de60c2c9cfb1f502bb9e0b51c5`, and release
  `v0.1.0-beta.3` at commit `987382f67e622915228686e9f956c6a9c9a7514c`
- [librustzcash source](https://github.com/zcash/librustzcash), current `main`
  commit `9c5705f56517c040c50f96d29f1ff15a9383f3e0`, and
  [`zcash_client_backend` 0.24.0](https://github.com/zcash/librustzcash/releases/tag/zcash_client_backend-0.24.0)
  at signed commit `97aefdc39a037da9c4f19a0e8a450d2c7932f53e`
- [lightwalletd source and operating guidance](https://github.com/zcash/lightwalletd),
  current commit `d16d48124e9ad4157ebc2324b5090c6ba201470c`
- [Zebra lightwalletd guidance](https://github.com/ZcashFoundation/zebra/blob/main/book/src/user/lightwalletd.md)
- [Z3 regtest environment](https://github.com/ZcashFoundation/z3/blob/main/docs/regtest.md),
  commit `e84ce9fd8e864ff0b2a8a62f6ce14392145db0fb`
- [Official regtest documentation](https://zcash.github.io/zcash/dev/regtest.html)
- Local source inspection of the exact tagged releases above

## Verified Facts

- Zallet remains beta software. Its RPC documentation is generated from its
  source and warns that interfaces may change.
- Zallet can export a UFVK or UIVK for a Unified Address. Export capability is
  not equivalent to watch-only import capability.
- Released Zallet `v0.1.0-beta.3` does not implement `z_importviewingkey`.
  Current `main` documents that method as accepting only a Sapling extended
  full viewing key. It does not provide the required Orchard-capable UFVK/UIVK
  import-and-scan path.
- Zallet can derive diversified Unified Addresses for an account, but its
  currently documented shielded-account RPC views are account-oriented rather
  than a proven obligation-address correlation API.
- `zcash_client_backend` 0.24.0 and `zcash_client_sqlite` provide
  `import_account_ufvk`, accepting a `UnifiedFullViewingKey`, account birthday,
  and `AccountPurpose::ViewOnly`. The import returns no spending key.
- The tagged librustzcash source builds Orchard scanning keys from tracked
  UFVKs, scans compact blocks, records received Orchard outputs, recovers the
  recipient diversifier, stores values and memos, reports transaction heights,
  and exposes synchronization state.
- The tagged Orchard wallet implementation treats outputs associated with an
  imported viewing key as non-spendable. This is an implementation property in
  addition to the cryptographic fact that a UFVK lacks spending authority.
- `WalletRead::get_received_outputs` returns wallet-received outputs for a
  transaction. `WalletRead::get_memo` returns the decrypted memo for a known
  received note after transaction enhancement has populated it.
- The sync engine prioritizes verification ranges and its storage API explicitly
  supports rewind/revalidation after chain reorganizations.
- A lightwalletd-compatible service supplies compact blocks, subtree roots,
  full transaction data, and tip metadata. The observer must compare its
  fully-scanned height with the service tip; service availability alone does
  not establish currency of the wallet view.
- Zebra plus lightwalletd is the documented production-style official data
  path. Zaino is a lightwalletd-compatible indexer included in the Zcash
  Foundation's Z3 stack, but its Z3 deployment is plaintext h2c and therefore
  appropriate only on a trusted local network unless TLS is added at the edge.
- Zcash regtest is one of the three supported network types. It is an isolated,
  locally controlled real blockchain, not public testnet or mainnet.
- The Z3 regtest stack pins Zebra `6.2.3`, Zaino `0.6.0-no-tls`, and Zallet
  `v0.1.0-beta.1` by digest, and provides an official reproducible path for
  generating blocks and exercising current Unified Address pools.
- A UFVK is privacy-sensitive: compromise reveals incoming and outgoing
  activity for the account even though it cannot authorize spends. A remote
  lightwalletd can also observe client query metadata, so production should
  use an Obliq-operated service over authenticated TLS.
- The existing Obliq TypeScript Zcash package is an interface-only placeholder.
  It has no key import, sync, memo, observation, persistence, or reconciliation
  implementation and exposes no spending method.
- The pre-change Phase 2 suite passes: formatting, lint, strict TypeScript,
  54 tests passed with 10 PostgreSQL tests skipped when the configured database
  was unavailable, production build, tracked-file secret scan, and production
  dependency audit with zero reported vulnerabilities.

## Inferences

- Zallet cannot be the Phase 3 observer because its exact required
  Orchard-capable watch-only import method is absent.
- The strongest candidate is a small server-only Rust observer using the tagged
  librustzcash crates, a dedicated encrypted SQLite scan cache, a UFVK imported
  with `AccountPurpose::ViewOnly`, and an Obliq-operated
  lightwalletd-compatible data service.
- PostgreSQL should hold normalized, tenant-scoped business observations and
  evidence metadata, not raw viewing authority. The librustzcash wallet store
  should be an operational scan cache outside ordinary business tables.
- A unique diversified Unified Address plus a random opaque memo reference is
  stronger than amount-only matching. Exact receiver recovery and memo
  decryption still require tracer-bullet evidence before this mechanism can be
  selected.
- A successful local regtest tracer proves the cryptographic and software
  architecture but does not prove public testnet/mainnet operations, service
  reliability, or production key custody. Those distinctions must remain
  explicit in proof and documentation.

## Unknowns And Open Gates

- The end-to-end tracer passed on Z3 regtest. A distinct recipient UFVK-only
  observer recovered an Ironwood output, exact amount, receiver context and
  opaque memo, then recorded one-to-three confirmation progression and
  idempotent same-height re-observation.
- No official funded public-testnet account or faucet is available in the
  workspace. Public testnet/mainnet evidence would require externally supplied
  funds and an externally authorized sender; Obliq must not import that
  spending authority merely to satisfy the test.
- Z3's current regtest defaults activate NU6.3/Ironwood at height 2. The tracer
  must record the actual pool used and must not describe an Ironwood output as
  Orchard.
- Production encrypted custody and rotation of the UFVK, production TLS, HA,
  monitoring, recovery, and privacy-preserving service operation remain design
  work even if the local tracer succeeds.
- Zaino `0.6.0-no-tls` rejects librustzcash 0.24.0's Ironwood subtree-root
  request. Direct range scanning worked for the tracer; production-scale
  subtree-root compatibility remains an explicit deployment gate.

## Tracer Evidence

- Date: 2026-10-06
- Network: isolated official Z3 regtest
- Pool: Ironwood (NU6.3 active at height 2)
- Transaction: `17e402b28c31fb21f4cc3ca74856cf04634143ca79f1ce10512b6287a08e8d56`
- Mined height: 115
- Amount: 125,000,000 zatoshis
- Confirmation observations: 1 at tip 115, then 3 at tip 117
- Sanitized confirmation evidence recaptured: 2026-10-06T07:29:28Z
- Authority: recipient UFVK imported with `AccountPurpose::ViewOnly`
- Correlation: unique shielded receiver plus opaque memo plus exact amount
- Opaque memo: recovered and matched; plaintext intentionally omitted
- Spend authority in observer: none
- Sender: external Zallet `v0.1.0-beta.3`
- Node/indexer: Zebra `6.2.3`, Zaino `0.6.0-no-tls`
- Observer libraries: `zcash_client_backend 0.24.0`,
  `zcash_client_sqlite 0.22.0`

Viewing keys, seed material, spending keys, the receiver, and unrelated
transaction details are intentionally excluded.

## Not Included

No signing, transaction construction, broadcast, price quoting, FROST, PCZT,
CrossPay, payment execution, or Phase 4 work is authorized by this research.
