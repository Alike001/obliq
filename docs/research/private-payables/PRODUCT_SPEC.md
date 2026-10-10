# Private Payables Link product specification

## Product definition

Private Payables Link is a recipient-confirmation workflow attached to a real
Obliq obligation. It lets an intended vendor or contractor confirm the exact
shielded destination to which an already-controlled business payment may later
be prepared, and receive a minimal evidence receipt after observer-confirmed
settlement.

It is not a claim link, wallet, checkout, escrow, invoice-payment button or
authorization to spend. The canonical lifecycle remains:

```text
CAPTURE → CONTROL → SETTLE → RECONCILE → PROVE
```

## Actors

- **Finance operator:** creates the obligation and invitation; reviews the
  recipient and confirmed destination.
- **Recipient:** authenticates to one scoped invitation and confirms a UA.
- **Approvers:** authorize the obligation under versioned policy.
- **Treasury signer:** independently reviews and signs the exact PCZT outside
  Obliq.
- **Observer:** read-only UFVK component that detects and reconciles settlement.
- **Evidence issuer:** chooses the minimal disclosed receipt after settlement.

No actor role implies Zcash spend authority. Only the external wallet/signer
possesses it.

## Preconditions

- A persisted organization, vendor/contact and obligation exist.
- The obligation is human-reviewed; extraction suggestions are not truth.
- The inviter has a server-verified `MANAGE_VENDOR_DESTINATIONS`-equivalent
  capability.
- A verified delivery channel exists for the intended counterparty contact.
- The organization has selected the exact testnet/mainnet policy; public
  network availability remains gated by runtime qualification.

## Proposed flow

### 1. Create invitation

The finance operator selects one obligation/vendor and previews the fields the
recipient will see. The server creates a 256-bit random token, stores only a
keyed hash, binds it to organization, vendor, obligation version, intended
contact, purpose and expiry, and records an audit event. The raw token is shown
once for delivery.

### 2. Authenticate recipient

Opening the link establishes no authority by itself. The recipient completes a
second channel check—initially a one-time code sent to the vendor contact
already on record. The code and link token are independently rate-limited,
single-purpose, hashed at rest and bound to the same invitation. Link-preview
bots must not consume either token.

This proves control of the configured contact channel, not legal identity or
wallet ownership. Higher-risk customers may require an out-of-band finance
call/KYB process; the product must label the method used.

### 3. Confirm destination

The recipient enters or confirms a testnet/mainnet UA. The server validates
syntax, network and the required shielded receiver set. It displays a
fingerprint and asks the recipient to confirm the exact value. A new immutable
destination version is created with status `RECIPIENT_CONFIRMED` and provenance
containing invitation, actor/session, method and timestamp.

`RECIPIENT_CONFIRMED` is deliberately distinct from `VERIFIED_MANUALLY` and
from a future cryptographic proof of wallet control. The full receiver is never
echoed into analytics or ordinary audit metadata.

### 4. Re-evaluate controls

Destination confirmation is material. It invalidates prior policy decisions,
approvals, readiness and settlement intents that reference another version.
The normal deterministic policy engine evaluates the exact confirmed version.
The recipient cannot approve, waive a finding or select a policy.

### 5. Prepare immutable settlement intent

After approvals produce `READY_TO_SETTLE`, an authorized finance/treasury actor
creates an exact quote and immutable intent binding obligation/version,
policy decision, approval state, vendor, destination/version/receiver,
business amount/currency, zatoshis, quote/expiry, opaque memo reference,
network, `FullPrivacy` and intent hash.

### 6. Human signing ceremony

A treasury human reviews the business context in Obliq and the exact PCZT in
external Zallet. The signer verifies receiver fingerprint, zatoshis, fee,
network, no transparent inputs/outputs, `FullPrivacy` and intent fingerprint.
Business approval does not replace this action. The recipient link has no
route to the signer.

### 7. Observe and reconcile

Broadcast remains uncertain until the UFVK-only observer detects the output.
The observer matches exact amount, receiver fingerprint and opaque memo,
records confirmation progression idempotently and advances to `SETTLED` only
at policy threshold. Outage means `UNAVAILABLE`, never unpaid.

### 8. Issue receipt

An authorized evidence issuer previews and issues a minimal recipient receipt
from the canonical settled record. The recipient gets a distinct high-entropy
verification link, not a reused destination invitation. Access does not expose
the organization workspace or UFVK. Revocation/supersession stays visible.

## Invitation state model

```text
DRAFT → ACTIVE → CONTACT_VERIFIED → DESTINATION_CONFIRMED → CONSUMED
          ├── EXPIRED
          ├── REVOKED
          └── SUPERSEDED
```

- Only one current invitation may mutate a given vendor-purpose-version tuple.
- `CONSUMED` means destination confirmation was committed; it does not mean
  approved, signed, broadcast or paid.
- Expiry is checked transactionally at use time, not only displayed.
- Resend creates a new token/version and supersedes the old link.
- Token reuse returns a generic terminal response and performs no mutation.

## Human versus automated decisions

| Step                          | Human required                                                                        | Safe automation                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Obligation review             | Finance confirms source fields.                                                       | Extraction suggestions, duplicate scan.                                          |
| Invitation creation           | Finance selects recipient/contact and disclosure.                                     | Token generation, expiry, delivery job.                                          |
| Recipient confirmation        | Recipient authenticates and confirms fingerprint.                                     | UA/network/runtime validation.                                                   |
| Destination-change acceptance | Finance reviews first/change provenance; high-risk changes require out-of-band check. | Version creation and stale-authorization invalidation.                           |
| Policy and approvals          | Eligible humans approve/reject.                                                       | Deterministic findings and requirement derivation.                               |
| Quote/intent                  | Authorized operator deliberately prepares.                                            | Exact arithmetic, expiry and canonical hashing.                                  |
| Signing                       | Treasury human authorizes external Zallet.                                            | PCZT construction/proving may run externally after review; no automatic signing. |
| Reconciliation                | No human needed for matching normal observations.                                     | UFVK scan, idempotent ingest, confirmations. Exceptions require human review.    |
| Evidence                      | Authorized human selects disclosure and previews.                                     | Canonicalization, hashing and artifact rendering.                                |

AI may extract, summarize, suggest and flag. It may not authenticate a
recipient, verify a destination, approve, sign, broadcast or disclose evidence.

## Failure, cancellation, refund and recovery

- **Lost/forwarded link:** second-factor contact verification prevents bearer
  possession alone from changing a destination; revoke and reissue.
- **Compromised contact channel:** require an internal change warning and
  out-of-band review for new/changed destinations. No single email event makes
  a material payment ready.
- **Expired invite/code:** fail closed; reissue a new version.
- **Stale approval/intent:** mutation invalidates it; never patch in place.
- **Duplicate request:** uniqueness and transactional consumption return the
  existing result, not a second destination/version.
- **Payment failure/unknown broadcast:** retain intent and reconcile; do not
  prepare a replacement until the original is conclusively safe.
- **Under/overpayment or wrong memo:** record `MISMATCH`; do not auto-settle.
- **Recipient disputes receipt:** preserve immutable observations and issue a
  corrected/superseding artifact only from canonical data.
- **Refund:** Zcash payment finality does not provide application-level refund.
  A refund is a new obligation, policy decision, approvals and shielded
  settlement. It is never an edit or reversal of the historical payment.

## Minimal data additions (future implementation)

- `recipient_invitations`: opaque ID, organization/vendor/obligation/version,
  token hash, contact snapshot, purpose, state, expiry, consumed/revoked data.
- `recipient_sessions`: invitation, authentication method, session hash,
  expiry, attempt/rate-limit metadata; no reusable org membership.
- `destination_attestations`: destination version, invitation, attestation
  kind, subject, timestamp and safe provenance.
- `invitation_events`: append-only lifecycle/audit events without raw token,
  code, full receiver or contact secrets.

All tables are organization-scoped. Public lookup uses only high-entropy
tokens. Raw tokens/codes are never stored or logged.

## Vertical slice

1. Regtest-only recipient invitation for one existing obligation/vendor.
2. Verified-contact code plus one-time, expiring link.
3. Server validation of a shielded test-network UA and immutable
   `RECIPIENT_CONFIRMED` destination version.
4. Automatic invalidation and fresh policy/readiness evaluation.
5. Existing external Zallet settlement and UFVK reconciliation unchanged.
6. Existing minimal evidence template delivered through a new, separate
   receipt link.
7. Adversarial tests for token theft, replay, cross-tenant access, contact
   compromise, destination substitution, stale approvals/intents and link
   preview bots.
8. Only after regtest and security review, exercise the same slice in the
   independently approved public-testnet funded ceremony.

Do not add wallet custody, recipient treasury accounts, in-link payments,
automated refunds, chat, payroll, stablecoins or generic vendor portals.

## Acceptance criteria

- Link possession alone cannot change a destination or authorize payment.
- Recipient disclosure is minimal and server-enforced.
- Exact destination version is bound through policy, intent, signer review and
  reconciliation.
- Every material change invalidates stale approval/readiness/intent.
- Invite and confirmation writes are tenant-scoped, expiring and idempotent.
- No secret enters URL query parameters, logs, analytics or business tables.
- No transparent-only destination or non-`FullPrivacy` settlement is accepted.
- Recipient receipt derives only from observer-confirmed `SETTLED` data.
- Public status remains unverified until the funded public-testnet gate passes.

## Open product questions

- Which recipient authentication method best fits real customers without
  turning Obliq into a broad identity platform?
- Should first destinations and changed destinations have different internal
  approval thresholds?
- Does a recipient need a persistent account, or are scoped sessions enough?
- Which organization identity can safely be shown before recipient auth?
- When should receipt access expire, and must recipients download a durable
  copy before link revocation?
