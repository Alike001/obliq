# Competitor and reference architecture analysis

Research snapshot: 2026-10-10. This is a source review, not a security audit or
an assertion of customer demand. The three reference repositories were reviewed
at immutable commits:

- [Xenia `2666b18`](https://github.com/jadonamite/XENIA/tree/2666b18e112a76353f1d845b0a1df559378afda6) — MIT.
- [Erebus `27ced71`](https://github.com/PoulavBhowmick03/Erebus/tree/27ced710bc3ad6c387fc1ae8200bea6631d202bf) — Apache-2.0.
- [Stake Wars `90c5c67`](https://github.com/broody/stake-wars/tree/90c5c675aa03e152c8488c437cb8c3ff4953a475) — Apache-2.0.

No source from these projects is incorporated into Obliq by this research.

## Obliq's implemented starting point

The repository already supports substantially more than a payment link:

| Capability                   | Actual boundary                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Obligation and vendor record | Tenant-scoped PostgreSQL records for vendor invoices and contractor bills, exact integer minor-unit money, manual or invoice-upload sources, immutable source hashes, deterministic duplicate findings and versioned vendor destinations. See [`obligation.ts`](../../../packages/domain/src/obligation.ts) and [`vendor.ts`](../../../packages/domain/src/vendor.ts).                               |
| Control                      | Immutable policy versions, structured findings, amount tiers, new-vendor strengthening, duplicate/completeness/destination controls, role requirements, separation of duties, stale-decision rejection and deterministic settlement readiness. See [`policy`](../../../packages/policy/src/index.ts).                                                                                                |
| Authorization                | Persisted, tenant-scoped approvals bound to obligation and policy-decision versions. Material changes invalidate the prior authorization. Business approval does not sign a Zcash transaction.                                                                                                                                                                                                       |
| Settlement                   | Expiring exact-zatoshi quotes, immutable settlement intents, canonical ZIP-321 requests and idempotent execution receipts. The application does not accept a seed, spend key, wallet credential, PCZT or raw transaction. Current live pricing is not implemented.                                                                                                                                   |
| Signing                      | A human-operated external Zallet creates, inspects, proves, signs and extracts a PCZT under `FullPrivacy`. Only sanitized metadata is returned to Obliq. This flow is verified end-to-end on isolated Z3 regtest, not on a public funded transaction. See [ADR 0007](../../decisions/0007-non-custodial-zcash-settlement.md).                                                                        |
| Reconciliation               | A separate librustzcash observer imports a UFVK as `AccountPurpose::ViewOnly`, scans into a private SQLite cache, and correlates receiver fingerprint, opaque memo reference and exact zatoshis. It exposes no spending API. Public testnet synchronization is qualified, but no funded public output has been observed. See [ADR 0011](../../decisions/0011-public-zcash-ready-for-funded-test.md). |
| Evidence                     | Settled canonical records can issue immutable, selectively disclosed JSON evidence with deterministic SHA-256 hashing, provenance, high-entropy public identifiers, revocation and supersession. It is application evidence, not a ZK proof or independent attestation. See [`evidence`](../../../packages/evidence/src/index.ts).                                                                   |

The only recipient-facing capability today is a bearer-like, high-entropy
`/verify/[evidenceId]` view of an already-issued evidence package. There is no
recipient identity, invitation, destination-confirmation, notification, or
counterparty session model. Internal `VERIFIED_MANUALLY` destination status is
not cryptographic address ownership proof.

## Xenia

### What it actually does

Xenia parks STRK20 funds in a Cairo escrow behind a commitment to a link-derived
key. The URL fragment carries the private key and is not sent in HTTP requests.
The holder signs a claimant-address-specific message, preventing a copied
mempool signature from redirecting an in-flight claim. A single claim/refund
flag prevents double consumption, and an absolute expiry changes the available
operation from claim to refund. The contract and client tests cover calldata
shape, domain separation, expiry, replay and mutual exclusion. See its
[claim-link design](https://github.com/jadonamite/XENIA/blob/2666b18e112a76353f1d845b0a1df559378afda6/docs/concepts/claim-links.md),
[escrow interface](https://github.com/jadonamite/XENIA/blob/2666b18e112a76353f1d845b0a1df559378afda6/contracts/INTERFACE.md), and
[privacy model](https://github.com/jadonamite/XENIA/blob/2666b18e112a76353f1d845b0a1df559378afda6/docs/concepts/privacy-model.md).

The important limitation is explicit: the link is a bearer spending instrument.
Anyone who obtains it can claim before expiry or sweep after expiry. Xenia also
exposes amount and timing through its STRK20/open-note model and depends on a
relayer/paymaster fee path. Its optional public-claim fallback does not preserve
the same privacy property.

### Transferable lessons

- Put secrets in a URL fragment only when browser-local possession is the
  intended authority; otherwise do not put an authorization secret in the URL.
- Domain-separate link purposes and bind every action to the intended subject.
- Model expiry, consumption and recovery as explicit states.
- State bearer semantics and privacy leakage instead of hiding them in UX copy.
- Inspect fee sponsorship for privacy regressions: a helper payment can create
  the sender-to-recipient edge the product meant to hide.

### What does not transfer

Xenia's escrow, Poseidon commitments, Stark signatures, STRK20 phases,
open-note deposits, relayer reimbursement and atomic register-and-claim flow
are Starknet-specific. Zcash has no equivalent application smart-contract hook,
and Obliq should not park treasury funds behind a bearer link. The proposed
Obliq link must confer only a scoped ability to confirm counterparty data—not
the ability to move or claim money.

## Erebus

### What it actually does

Erebus is local agent-side settlement infrastructure. Its most reusable
operational concepts are:

- a caller-supplied, durable `operation_id` on every write;
- reconciliation before retry after an uncertain submission;
- a single explicit `resume_operation` path;
- atomic construction of accepted terms and settlement within its STRK20
  action set;
- recipient-bound, deal-scoped disclosure grants with expiry in wire v3; and
- an honest privacy boundary: terms can be hidden while channel relationships,
  timing and some infrastructure metadata remain visible.

The repository has tests for malformed and conflicting operation IDs, crash
recovery, reconciliation, role restrictions, grant scope, expiry and fault
matrices. Its documentation also admits that expiry cannot retract information
already decrypted and that older grants were broader bearer secrets. See the
[reference contract](https://github.com/PoulavBhowmick03/Erebus/blob/27ced710bc3ad6c387fc1ae8200bea6631d202bf/docs/reference.md),
[custody operations](https://github.com/PoulavBhowmick03/Erebus/blob/27ced710bc3ad6c387fc1ae8200bea6631d202bf/docs/custody-operations.md), and
[production gaps](https://github.com/PoulavBhowmick03/Erebus/blob/27ced710bc3ad6c387fc1ae8200bea6631d202bf/docs/production-gaps.md).

### Transferable lessons

- A retry key is a financial identity, not just an HTTP convenience.
- `UNKNOWN` requires observation and recovery, never a new payment.
- Grant the minimum readable record, encrypted or authenticated to the intended
  recipient where possible, without parent viewing or spending authority.
- Bind domain, participants, terms, expiry and execution to one canonical
  digest; do not infer atomic semantics from UI ordering.
- Separate chain facts, application claims and third-party assertions.

### What does not transfer

Erebus's channel keys, encrypted salt lanes, Starknet pool notes, nullifiers,
proof pipeline and atomic `accept_and_settle` contract action cannot be moved to
Zcash. Obliq deliberately keeps business approval, external signing and later
observer reconciliation as separate gates. Its scoped-grant design is a useful
analogy for evidence, not a viewing-key scheme to copy.

## Stake Wars

### Historical sealed bid versus current auction

Stake Wars previously used Whisper, a private Vickrey auction with encrypted
bid capsules and a 1-of-1 operator-controlled vault. The historical README
states that the operator could decrypt bids before close and controlled escrow;
controlled notes and VDFs were research, not deployed enforcement. The
integration also needed a separately deployed operator, capsule persistence,
recovery, canonical-round projection and post-settlement winner disclosure.
That implementation is visible immediately before commit
[`cd56888`](https://github.com/broody/stake-wars/commit/cd56888a845ffae341bf6c40f6457eb3d6f2b1fd).

The current product replaced it with a public ascending auction. Bids and
identities are public, but the contract escrows only the current leader,
refunds the displaced leader atomically, makes settlement permissionless and
keeps its keeper unprivileged. The change trades bid privacy for a much smaller
trust and recovery surface. See the current
[README](https://github.com/broody/stake-wars/blob/90c5c675aa03e152c8488c437cb8c3ff4953a475/README.md)
and [PRD](https://github.com/broody/stake-wars/blob/90c5c675aa03e152c8488c437cb8c3ff4953a475/docs/PRD.md).

### Transferable lessons

- Give automation permission to advance an already-determined state, not to
  choose a winner, destination or amount.
- Preserve the previous valid owner/state until the successor is confirmed.
- Store immutable terminal projections and make recovery idempotent.
- Remove a privacy mechanism when its operator trust is worse than the business
  value it provides; privacy claims are not free.
- A bounded entitlement is safer than broad administrative control.

Game mechanics, auctions, Cairo contracts and keeper transactions do not belong
in Obliq. The product principle is bounded authority and explicit lifecycle,
not gamification.

## Commercial alternatives

| Alternative                                                                    | What it already solves                                                                                           | Gap relative to the proposed workflow                                                                                                                                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Request Finance AP](https://www.requestfinance.com/products/accounts-payable) | Invoice capture/OCR, vendor records, approvals, batch stablecoin/bank payments, accounting sync and audit trail. | No documented Zcash shielded settlement plus UFVK-only independent reconciliation and selective evidence model. This is the closest workflow competitor.                                       |
| [Ramp Bill Pay](https://support.ramp.com/bill-pay-overview/)                   | Mature bill intake, roles, vendor details, approvals, payment release and accounting operations.                 | Traditional/stablecoin rails rather than an intentionally shielded Zcash rail; privacy is not the product.                                                                                     |
| [Safe Wallet](https://safe.global/wallet)                                      | Self-custodial treasury proposal, simulation, signer thresholds, execution and an exportable on-chain record.    | Wallet/treasury-centric, not an obligation-first AP system; public-chain activity does not supply private AP reconciliation.                                                                   |
| A Zcash wallet plus [ZIP-321](https://zips.z.cash/zip-0321)                    | A standardized address, exact amount and optional memo request which reduces manual transaction entry.           | No invoice record, tenant policy, human business approvals, destination-change controls, quote binding, duplicate protection, reconciliation to an obligation or controlled business evidence. |
| Email/spreadsheet plus wallet                                                  | Universally available and cheap.                                                                                 | Manual destination handling, fragmented approvals, ambiguous retries and weak audit/reconciliation controls.                                                                                   |

## Evidence boundary

The reference repositories establish implemented patterns and their authors'
documented limitations; they do not establish that those patterns are secure,
audited, commercially successful or appropriate for Zcash. Competitor product
pages establish advertised workflows, not independent performance or demand.
No customer interviews were conducted in this repository study.
