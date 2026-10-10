# Zcash feasibility for Private Payables Link

Research snapshot: 2026-10-10. Authoritative Zcash specifications and current
official implementation documentation take precedence over historical project
notes.

## Decision summary

The workflow can be implemented without a new smart contract. The link should
coordinate recipient identity and destination confirmation inside Obliq; value
still moves through a normal shielded Zcash transaction created from a ZIP-321
request and authorized by an external signer.

That is feasible at the architecture level and verified on regtest. It is not
yet a demonstrated public-network product: public testnet synchronization is
qualified, but a funded shielded output has not been externally signed,
observed and reconciled through this path.

## Current standards and implementation reality

### ZIP-321

[ZIP-321](https://zips.z.cash/zip-0321) is the canonical payment-request
format. It carries one or more address/amount tuples and optional shielded memo,
label and display message. It is a request for wallet transaction construction,
not an authorization, invoice, escrow or receipt. A wallet must validate the
address/network; memo is permitted only for a shielded receiver.

Obliq already uses a single-payment ZIP-321 request with exact zatoshis and an
opaque memo reference. The shareable request must not include vendor name,
invoice number, category, approval data or policy findings.

### Unified Addresses

[ZIP-316](https://zips.z.cash/zip-0316) defines Unified Addresses as containers
for receiver types. Orchard has no standalone human-facing address format; it
is represented as a receiver within a UA. A sender that supports Orchard must
use the most preferred supported receiver. A UA string alone is not proof that
an eventual transaction used only shielded inputs/outputs. Obliq's
`FullPrivacy` review must inspect the constructed PCZT and reject transparent
components or a privacy-policy downgrade.

Different diversified UAs can belong to the same account. Destination
confirmation must bind the exact receiver/version to the obligation; equality
with a wallet's default UA is neither necessary nor sufficient for account
ownership. A UFVK can derive/recognize its receivers without spending
authority, which is how the existing qualification utility established account
membership.

### External Zallet and PCZT

The latest official Zallet release at this snapshot is
[`v0.1.0-beta.3`](https://github.com/zcash/zallet/releases/tag/v0.1.0-beta.3),
commit `987382f67e622915228686e9f956c6a9c9a7514c`. It remains beta software.
The [Zallet RPC documentation](https://zcash.github.io/zallet/rpc/index.html)
states that `pczt_inspect` reports creator-recorded shielded recipient/value
metadata, fee, privacy policy and proof/signature status. It also warns that
metadata in a PCZT received from elsewhere is not independently trusted until
extraction. `pczt_sign` defaults to acknowledging only `FullPrivacy` and must
not silently accept a weaker policy.

Obliq's reviewed signer is `zallet-zaino`, not an application RPC integration.
A human operating a loopback/private wallet creates and inspects the PCZT,
checks the intent fingerprint, amount, receiver, fee, network and privacy
policy, then separately authorizes signing. Obliq receives only a sanitized
receipt. A recipient link cannot invoke this signer.

### UFVK observer

The observer is built on `zcash_client_backend 0.24.0` and
`zcash_client_sqlite 0.22.0`. The library's wallet data APIs are UFVK-oriented
and require spending keys to be supplied separately for spending operations;
blockchain scanning trial-decrypts compact-block outputs with viewing keys.
Obliq imports only a UFVK as view-only into a private SQLite cache and offers
only status/observation methods through its TypeScript boundary.

A UFVK is not harmless. It can expose incoming and outgoing account activity,
amounts, destinations and memos within its scope. It must remain in the isolated
observer, never in a link, browser, PostgreSQL business table, log, evidence
artifact or general web environment.

## Safe role of the link

The link may:

- identify one invitation through a random, hashed-at-rest token;
- show a deliberately limited payer, obligation and requested-action summary;
- authenticate the intended recipient through a separate factor/session;
- collect or confirm one shielded UA;
- bind the confirmed destination version to an obligation version;
- expire, revoke, supersede and reject replay; and
- later lead to a separately scoped evidence receipt.

The link must not:

- hold or unlock funds;
- authorize business approval, transaction construction, signing or broadcast;
- carry a seed, spending key, UFVK, wallet credential, PCZT or raw transaction;
- promise payment before observer-confirmed settlement;
- accept a transparent-only destination or privacy downgrade; or
- expose a reusable organization login/session.

## Privacy boundary

### What can be private

- Shielded transaction sender, recipient and amount are not disclosed in the
  public transaction in the way transparent transfers are.
- The memo can carry only an opaque correlation reference recoverable by the
  relevant viewing authority.
- Controlled evidence can omit vendor, ZEC amount, transaction reference,
  destination, approvals and internal findings unless explicitly authorized.

### What is not automatically private

- Invitation delivery exposes relationship metadata to the email/messaging
  provider and possibly Obliq.
- Obliq knows the organization, vendor, obligation, confirmed destination and
  workflow timing.
- The recipient knows the payer relationship and its own payment.
- The observer operator can learn UFVK-scoped history.
- A public compact-block/data service can observe client IP, request ranges and
  timing; an Obliq-controlled service reduces third-party exposure but not node
  compromise risk.
- Exact amounts and close timing may enable off-chain correlation.
- Evidence and access logs disclose whatever the issuer intentionally shares.
- Endpoints, device telemetry, screenshots and copied links can leak metadata.

“Private” therefore means shielded on-chain settlement plus minimized controlled
business disclosure, not anonymity from all participants.

## What the recipient can independently verify

With its own wallet/viewing capability, the recipient can independently see
that it received a shielded note, its amount, memo and confirmation state. It
can compare the opaque reference supplied through the business workflow.

With an Obliq evidence link, it can verify that:

- the immutable artifact exists and is active/revoked/superseded;
- canonical disclosed content matches its SHA-256 hash;
- Obliq issued it at a stated time; and
- selected facts are labelled by provenance.

It cannot infer vendor identity, invoice validity or approval truth from the
Zcash chain. A transaction ID alone does not publicly prove a shielded output's
recipient or amount. Obliq's artifact is not an independent signature by an
auditor, a zero-knowledge business proof, or proof of delivery/services.

## Evidence that can be disclosed safely

A minimal vendor receipt should normally disclose only an opaque business
reference, `SETTLED`, settlement date, issuer and artifact hash. Business
amount may be added when the vendor already knows it. Transaction reference and
ZEC amount should require an elevated disclosure capability and explicit
preview. Never disclose destination, raw memo, viewing/spending material,
signer credentials or internal control findings.

## Public-network qualification still required

Before any public claim:

1. independently qualify the pinned/current Zebra, Zaino and Zallet combination
   on NU7 using live RPC evidence rather than operator-authored JSON;
2. create a fresh external testnet sender and recipient under owner approval;
3. confirm an Orchard-capable recipient receiver belongs to the imported UFVK;
4. construct and human-inspect an exact `FullPrivacy` PCZT;
5. externally sign and broadcast a funded shielded testnet payment;
6. observe memo, amount and receiver correlation using only the UFVK;
7. record confirmation progression, repeated ingestion and any regression;
8. issue minimal evidence from the canonical settled record; and
9. independently review logs/artifacts for secret leakage.

Current status remains `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`, not
`PUBLIC_NETWORK_VERIFIED`. Mainnet is blocked. The exact evidence boundary is
recorded in [ADR 0011](../../decisions/0011-public-zcash-ready-for-funded-test.md).

## Open questions

- Will the recipient wallets used by target customers reliably parse the exact
  ZIP-321 subset and display the memo/receiver details needed for review?
- Can public Zallet beta3 complete NU7 PCZT construction under the reviewed
  `zallet-zaino` topology, or is a newer immutable revision required?
- Which confirmation policy meets customer expectations under reorg risk?
- Can recipient ownership be proven with current wallet capabilities, or must
  Phase 1 deliberately label it `RECIPIENT_CONFIRMED` rather than cryptographic?
- What operational model contains UFVK blast radius for multiple organizations?

## Feasibility acceptance criteria

Feasibility passes only when the link cannot alter payment authority, the exact
destination version enters policy/readiness and intent binding, the signer
shows `FullPrivacy`, and the existing observer independently settles the exact
obligation on public testnet. Until then, the architecture is implementable but
the public-network customer promise remains unproven.
