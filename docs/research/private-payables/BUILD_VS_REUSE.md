# Build versus reuse assessment

## Decision rule

Reuse standards and proven internal domain boundaries. Borrow architectural
patterns with attribution. Do not copy a chain mechanism merely because its UX
resembles a link, and do not add a dependency whose authority exceeds the job.

## Component decisions

| Capability                                  | Decision                                                | Rationale                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Obligation/vendor/policy/approval/readiness | Reuse Obliq                                             | Already versioned, tenant-scoped and tested. A parallel recipient workflow must feed these aggregates rather than create another payable object.                                       |
| Destination history                         | Extend Obliq                                            | Add recipient-confirmation provenance/state while preserving immutable versions. Do not overwrite or relabel manual verification as cryptographic ownership.                           |
| Invitation/token/session                    | Build small Obliq module                                | No existing module has the required one-obligation, non-member, non-spending authority. Use standard CSPRNG/hash/session primitives and existing distributed rate-limit/auth patterns. |
| Recipient identity                          | Integrate a production identity/delivery provider later | Build the authorization contract and adapters, not an email/SMS platform. Provider selection depends on customer geography and assurance needs.                                        |
| ZIP-321                                     | Reuse standard and existing Obliq implementation        | Canonical Zcash request format. Do not invent a proprietary payment URI.                                                                                                               |
| External signing                            | Reuse existing Zallet PCZT ceremony                     | Preserves non-custodial boundary and human `FullPrivacy` review. The link never calls Zallet.                                                                                          |
| Observation/reconciliation                  | Reuse existing librustzcash observer                    | UFVK-only, no spend API, exact normalized observation and idempotent persistence already exist.                                                                                        |
| Controlled receipt                          | Reuse evidence engine                                   | Add an appropriate minimal template/access policy; do not build a separate receipt truth model.                                                                                        |
| Notifications                               | Adapter, not core implementation                        | Email/SMS delivery is operational infrastructure. Store delivery state and safe provider IDs, not content/secrets.                                                                     |
| Refunds                                     | Reuse obligation lifecycle as a new obligation          | Zcash has no app-contract refund. Avoid hidden custody or a bearer escrow.                                                                                                             |

## Reference-repository reuse

### Xenia

- **Reuse as pattern:** explicit expiry, one-time consumption, domain separation,
  anti-front-running intent binding, and candid bearer/privacy documentation.
- **Do not reuse mechanically:** Cairo escrow, link private key, STRK20 action
  phases, open notes, fee sponsorship or claim/refund logic.
- **Direct code reuse:** none planned. If later used, MIT requires preservation
  of its copyright and permission notice.

### Erebus

- **Reuse as pattern:** durable operation IDs, reconcile-before-retry, explicit
  resume, scoped disclosure, capability declaration and privacy matrices.
- **Do not reuse mechanically:** pool/channel keys, salt-lane encoding,
  nullifiers, Starknet proving or agent autonomy.
- **Direct code reuse:** none planned. Apache-2.0 reuse would require license and
  notice compliance, change notices and patent-license review.

### Stake Wars

- **Reuse as pattern:** unprivileged automation, permissionless/deterministic
  maintenance, immutable terminal projections and preserving the last valid
  state until confirmed replacement.
- **Do not reuse mechanically:** auction/game contracts, keeper transaction
  code, Whisper capsules or winner logic.
- **Direct code reuse:** none planned. Apache-2.0 obligations apply if that
  changes.

## Why not use a claim-link protocol

A claim link deliberately grants whoever holds a secret the ability to move
parked funds. Private Payables Link has the opposite authority model: the
recipient may only attest to a destination, while the payer retains policy,
approval and signing authority. Reusing a bearer escrow would add custody,
refund, fee-sponsorship and recovery risk without solving an Obliq problem.

## Why not build a smart contract

The proposed workflow needs no programmable on-chain escrow. Zcash already
provides shielded value transfer; Obliq supplies off-chain business controls,
external signing, read-only observation and evidence. A cross-chain contract
would weaken the Zcash privacy thesis and create a new trust model.

## Dependency and license guardrails

- Preserve ZIP specifications as standards references; do not copy prose or
  test vectors beyond their license terms without attribution.
- Prefer maintained Zcash libraries already in the observer and pin exact
  versions/commits for qualification.
- Run license and supply-chain review before adding any identity, messaging or
  QR dependency.
- Do not incorporate AGPL components into hosted Obliq without explicit legal
  and architectural review.
- Retain a source/notice inventory for any copied code. Current plan copies no
  external reference code.

## Minimal implementation boundary

```text
recipient web route
  → recipient invitation application service
  → token/session/contact adapters
  → immutable destination version
  → existing policy/readiness engine
  → existing settlement intent + external signer
  → existing observer + evidence engine
```

The new module owns invitation and recipient-session semantics only. It does
not own obligations, approvals, signing, scanning or artifacts.

## Acceptance criteria

- No duplicated aggregate or settlement state machine.
- No new spend/view authority in the web application.
- No chain-specific reference code copied into the Zcash path.
- External libraries have immutable versions and reviewed licenses.
- Recipient module can be removed without corrupting canonical obligations,
  destinations, settlements or evidence.

## Open questions

- Which OIDC/magic-link provider can represent a non-member recipient without
  broad organization access?
- Should delivery be organization-owned SMTP or an Obliq service?
- Can wallet ownership proof be standardized without requiring a new wallet
  integration and without confusing it with identity?
- Does adding `RECIPIENT_CONFIRMED` require a new policy rule or a generalized
  destination-assurance enum?
