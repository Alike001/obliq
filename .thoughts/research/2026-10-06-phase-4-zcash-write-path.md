# Reality Research: Obliq Phase 4 Zcash write path

## Scope

Current implementation reality for turning an approved Obliq obligation into a
reviewable, externally authorized, fully shielded Zcash transaction without
placing treasury spending authority in the Obliq application or backend.

## Sources Checked

- `obliq-context/Obliq_Master_Context.docx`
- Every file in `obliq-context/implementation-reference/`
- Phase 3 commit `cf62c775c738628e57df7e3a62564aec86324523`
- ADR 0006, the read-only observer, settlement schema, readiness repository,
  audit chain, and application authorization paths
- [ZIP 321](https://zips.z.cash/zip-0321)
- [ZIP 374](https://zips.z.cash/zip-0374)
- [Current Zallet RPC reference](https://zcash.github.io/zallet/rpc/index.html)
- Zallet `v0.1.0-beta.3`, commit
  `987382f67e622915228686e9f956c6a9c9a7514c`
- librustzcash `zcash_client_backend-0.24.0`, signed commit
  `97aefdc39a037da9c4f19a0e8a450d2c7932f53e`
- The isolated Z3 regtest stack retained from Phase 3: Zebra `6.2.3`, Zaino
  `0.6.0-no-tls`, and Z3 commit
  `e84ce9fd8e864ff0b2a8a62f6ce14392145db0fb`
- Direct help and behavior checks against the running beta.3 Zallet RPC

## Verified Facts

- ZIP 321 canonically represents one shielded payment as
  `zcash:<address>?amount=<decimal-ZEC>&memo=<unpadded-base64url>`. Amounts have
  at most eight decimal places. Memo bytes are limited to 512 and are invalid
  for transparent-only recipients.
- ZIP 321 URIs are payment requests, not signatures or settlement evidence.
  The URI itself can be copied or logged, so Obliq uses only a random opaque
  reference in the memo and no vendor, invoice, policy, or approval prose.
- Zallet beta.3 exposes `pczt_create`, `pczt_inspect`, `pczt_prove`,
  `pczt_sign`, and `pczt_extract`. Its generated RPC documentation is pinned to
  the implementation.
- `pczt_create` selects inputs and change, accepts a `FullPrivacy` ceiling, and
  emits a complete unproven/unsigned PCZT. `pczt_inspect` reports recipients,
  exact values, fee, pool details, proof/signature state, and privacy policy.
- `pczt_sign` requires the caller to acknowledge the recorded privacy policy.
  Zallet warns that an imported/modified PCZT must be inspected before signing.
- `pczt_prove` and `pczt_extract` support Ironwood in beta.3. Extraction verifies
  shielded proofs and signatures before returning network-ready transaction
  bytes.
- Zallet's RPC is privileged plaintext HTTP. Official guidance says it must not
  be exposed across an untrusted network. Possession of its RPC authentication
  grants access to fund-moving methods.
- Zallet remains beta and explicitly permits breaking changes before 1.0.
- Direct librustzcash construction can create valid shielded transactions, but
  a component with the unified spending key would be a signer. Embedding that
  component in Obliq would violate the server authority boundary.
- PCZT is implemented end-to-end in the selected released Zallet, but ZIP 374
  remains versioned/evolving. It is suitable here only inside the isolated
  external signer boundary, not as an Obliq application dependency or a claim
  of general multisignature support.
- The Phase 3 read observer still has only a UFVK and exposes no construction,
  signing, or broadcast method.

## Candidate Architectures

### A. External Zallet direct-send RPC

`z_sendmany` or `z_sendfromaccount` can construct, sign, and broadcast a fully
shielded transaction. This is operationally simple, but collapses construction,
review, signing, and broadcasting into one privileged RPC action. An Obliq
backend connection to that RPC would be an unrestricted signer credential.

### B. External Zallet PCZT lifecycle

An isolated, user-operated Zallet creates and inspects the exact PCZT, proves
it, signs only after explicit `FullPrivacy` acknowledgement, extracts it, and
broadcasts it. Obliq provides an immutable handoff manifest and later records a
sanitized receipt. The wallet RPC credential and key store never cross into
Obliq. This preserves review and lifecycle boundaries and is the selected
regtest path.

### C. Direct librustzcash external signer

Technically capable, including modern shielded pools, but would require Obliq
to build and secure a new wallet/signer product. It duplicates wallet state,
key custody, proof generation, review, and broadcast behavior already present
in Zallet and materially increases competition-critical risk.

### D. FROST or arbitrary multisignature

Not required for the one-authorized-wallet tracer. Application approvals are
not threshold signatures, and no organizational FROST path has been proven.

## Tracer Evidence

- Network: official isolated Z3 regtest
- Sender authority: external Zallet `v0.1.0-beta.3`
- Recipient: fresh shielded-only Unified Address receiver; omitted
- Payment: 25,000,000 zatoshis
- Fee: 10,000 zatoshis
- Privacy policy: `FullPrivacy`
- Transaction format/branch: v6 / `37a5165b` (NU6.3)
- Pool: Ironwood, two actions including change
- PCZT: created, inspected, proved, signed, and extracted
- All required Ironwood signatures: present
- Extracted transaction:
  `bdd95b22af564c4e40d177e9eb5bb6ddd42a4b50a7ca73fb499f43494e8316ac`
- Zebra broadcast response returned the same transaction identifier
- The opaque memo, receiver, PCZT, raw transaction, wallet RPC credential,
  viewing authority, and all key material are intentionally omitted

The first transaction proved the external signing/broadcast mechanics. A second
application-bound tracer then completed the acceptance gate:

- Obligation: persisted, Phase-2 controlled, distinctly approved, and
  `READY_TO_SETTLE`
- Intent fingerprint:
  `b75edf444b6feb50e7a81ed63fe4e2dee901a7cbf21e03bfb8fa1c789a410243`
- Transaction:
  `55cace1af778497d182f64d88a5b611737c27017ef9382e19cbef47d77c0115a`
- Network/pool: isolated Z3 regtest / Ironwood
- Amount/fee: 25,000,000 / 10,000 zatoshis
- Privacy policy: `FullPrivacy`; 2 Ironwood actions; all 2 signed
- Mined height: 119
- Confirmation evidence: 1 (`CONFIRMING`) then 3 (`SETTLED`)
- Observer: UFVK-only; `spendingAuthority: false`
- Correlation: exact signed transaction + opaque memo digest + exact amount
- Persistence: settlement and obligation both `SETTLED`
- Audit chain: valid, 30 events at capture time

Ironwood's current decrypted recipient representation is a reduced Unified
Address and is not byte-identical to the original multi-receiver ZIP-321 UA.
The application therefore treats the signed transaction ID as the exact
execution anchor and retains receiver fingerprints as supporting evidence. It
does not weaken correlation to amount alone.

## Inferences

- Obliq should persist immutable quote and intent snapshots, generate a
  canonical ZIP 321 request, and export a signer handoff. It should not invoke
  the wallet RPC.
- The external signer must compare the handoff intent hash, receiver, exact
  zatoshis, memo reference, network, and `FullPrivacy` policy before signing.
- Intermediate `SIGNED` and `BROADCAST` states are authorized external receipts;
  only the Phase 3 observer can advance detection, confirmation, and settlement.
- A controlled operator-entered regtest quote is honest for the tracer. It is
  not live market pricing and public product use must remain blocked.

## Unknowns And Questions

- Public testnet/mainnet signing and reconciliation are not proven. The Phase 3
  observer still rejects public networks, and Zaino 0.6 rejects the Ironwood
  subtree-root request used by the selected observer library.
- Production Zallet deployment, wallet unlock ceremony, RPC transport
  isolation, backup, signer-host hardening, and multi-person cryptographic
  authorization remain operational work.
- Public-network quote sourcing and market-data integrity remain unselected.
- PCZT interoperability outside the exact beta.3 Zallet path is not claimed.

## Not Included

No FROST, arbitrary multisig, CrossPay, stablecoin, payroll, evidence package,
AI settlement, browser wallet, or production public-network capability.
