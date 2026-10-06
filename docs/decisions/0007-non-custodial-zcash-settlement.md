# ADR 0007: Non-custodial shielded settlement

- Status: Accepted for isolated regtest; public-network settlement blocked
- Date: 2026-10-06
- Decision owners: Engineering, Finance Operations, and Security
- Extends: ADR 0006

## Context

Phase 4 must bind a currently authorized business obligation to one exact
shielded Zcash payment while keeping treasury spending authority outside the
Obliq application and backend. Business approval authorizes the obligation;
the external wallet separately authorizes the transaction.

Research and tracer evidence are recorded in
`.thoughts/research/2026-10-06-phase-4-zcash-write-path.md`.

## Decision

Obliq creates an immutable, version-bound settlement intent and canonical
ZIP-321 payment request. A human reviews the business and transaction facts in
Obliq, then transfers a sanitized handoff manifest to a separately operated
Zallet signer.

The selected external signer path is Zallet `v0.1.0-beta.3` using:

1. `pczt_create` with a shielded account source and `FullPrivacy`;
2. `pczt_inspect` to compare receiver, amount, fee, pool, and policy;
3. `pczt_prove`;
4. `pczt_sign` with explicit `FullPrivacy` acknowledgement;
5. `pczt_extract` to verify and produce the network transaction;
6. broadcast from the signer environment; and
7. a sanitized external receipt imported into Obliq.

Obliq never receives the wallet RPC credential, mnemonic, spending key,
wallet-encryption identity, wallet passphrase, PCZT, or raw transaction. It can
therefore describe what should be paid and record what the external signer
reports, but it cannot independently authorize another treasury spend.

## Intent binding

The intent hash commits to organization, obligation and version, policy
decision, destination version and receiver, vendor, business currency and exact
minor units, quote identity/source/time/expiry, exact zatoshis, network,
`SHIELDED` privacy mode, derived opaque memo reference, and intent version.

The current readiness decision, approvals, destination, obligation version,
and quote expiry are rechecked when the intent is created and when signing is
requested. Any mismatch invalidates or blocks the stale intent.

## Quote decision

Phase 4 supports only `REGTEST_FIXED` quotes. An authorized operator supplies
an exact positive zatoshi amount for the current business obligation; Obliq
records the source as controlled regtest data and applies a short expiry. This
is neither seeded live pricing nor a market-rate claim. Testnet/mainnet intent
creation is rejected.

## ZIP-321 subset

Obliq emits one-payment URIs containing:

- one shielded Unified Address;
- exact decimal ZEC derived from integer zatoshis; and
- an unpadded-base64url opaque memo reference.

No label, message, vendor name, invoice reference, description, approval, or
policy detail appears in the URI. Transparent-only receivers are rejected.

## Lifecycle and evidence

`PREPARED → AWAITING_SIGNATURE → SIGNED → BROADCAST → DETECTED → CONFIRMING → SETTLED`

Signing and broadcast are separate external receipts. Neither can produce
`SETTLED`. The unchanged read-only observer remains authoritative for detection
and confirmation. Observer/node failure leaves the last financial conclusion
unchanged.

## Rejected alternatives

- Direct `z_sendmany`: useful, but combines construction, signing, and
  broadcast and provides a weaker review boundary.
- Backend-to-Zallet RPC: rejected because the credential controls fund-moving
  methods and would give the backend independent spend capability.
- Direct librustzcash signer: rejected because it would make Obliq responsible
  for a new key-holding wallet implementation.
- FROST/arbitrary multisig: not required or proven for this phase.

## Public-network status

`PUBLIC_NETWORK_BLOCKED`. The regtest result does not prove public operations.
ADR 0006's observer safeguard remains active; the process adapter rejects
testnet/mainnet. A production path requires a proven Ironwood-compatible data
service, authenticated transport, signer-host operations, a trustworthy live
quote source, and a funded external authorization ceremony.

## Accepted tracer evidence

The application-bound transaction
`55cace1af778497d182f64d88a5b611737c27017ef9382e19cbef47d77c0115a`
paid 25,000,000 zatoshis through Ironwood on isolated regtest. It was mined at
height 119 and progressed from one to three confirmations. The Phase-3
UFVK-only observer correlated the exact signed transaction, opaque memo digest
and amount to an actual READY_TO_SETTLE obligation. Settlement and obligation
both reached `SETTLED`; the 30-event organization audit chain verified.

Current Ironwood decryption returns a reduced recipient Unified Address rather
than the byte-identical multi-receiver ZIP-321 address. Therefore Phase 4 uses
the signed transaction ID as the exact execution anchor and validates the memo
digest and amount on the observed output. It preserves both submitted and
observed receiver fingerprints as evidence, but does not claim byte equality.
