# ADR 0012: Scoped recipient confirmation boundary

Status: Accepted — Phase 6B backend vertical slice

## Decision

Private Payables Link uses a recipient principal that is separate from
organization membership. A 256-bit invitation token, email-code challenge and
30-minute recipient session are stored only as domain-separated HMAC-SHA-256
digests. The raw invitation is transported in a URL fragment and all recipient
mutations are same-origin, rate-limited and scoped by server-resolved invitation
relationships.

Invitation issuance is limited to active Owner, CFO and Finance members. A
recipient submission creates an immutable destination version with
`CONTACT_CONFIRMED` provenance and existing `UNVERIFIED` settlement status.
The invitation issuer cannot perform the later manual verification; an eligible
independent reviewer must do so. Contact verification is not address-ownership
proof.

Destination consumption, idempotency receipt, stale-authorization invalidation
and audit events share one PostgreSQL transaction and organization advisory-lock
order. The pinned Rust boundary validates the network-specific Unified Address,
requires Orchard and rejects transparent receivers without receiving spending
authority.

## Consequences

- Recipient sessions cannot list or mutate organization resources.
- A mailbox compromise can propose a malicious destination, but cannot make it
  settlement-ready without independent internal review and fresh controls.
- Email delivery is a production dependency and necessarily observes recipient
  contact and message timing.
- Existing approval and settlement-intent history is retained but invalidated
  after destination changes.
- Evidence is not released to the recipient automatically; an authorized
  internal action after observer-confirmed settlement remains required.
- Recipient UI, wallet ownership proof and public-network settlement remain
  outside this backend slice.
