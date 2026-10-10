# Spec: Phase 6B Private Payables Link foundation

## Objective

Add a narrowly scoped recipient-confirmation boundary to Obliq so an intended
vendor or contractor can prove control of a pre-recorded contact channel and
confirm a proposed Zcash destination for one current obligation version.

The result must feed Obliq's existing immutable destination history,
authorization invalidation, policy evaluation, settlement intent, external
signing, reconciliation and evidence systems. It must not create payment,
approval, signing, viewing or organization-member authority.

This specification defines the implementation contract only. It authorizes no
product code, deployment, wallet creation, funding, signing or broadcast.

## Background and current reality

Obliq currently has:

- tenant-scoped vendors and obligations;
- versioned obligation snapshots and immutable destination identities;
- destination states `UNVERIFIED`, `VERIFIED_MANUALLY` and `SUPERSEDED`;
- deterministic policy evaluation that blocks an unverified destination;
- server-authorized approvals and readiness tied to obligation, policy and
  destination versions;
- destination-change invalidation of approvals and settlement intents;
- an organization-scoped SHA-256 audit chain;
- production OIDC sessions for organization members; and
- PostgreSQL-backed rate limiting.

It does not have a recipient identity, invitation, contact-challenge or scoped
recipient-session model. Existing organization sessions must not be reused for
recipients. Existing `VERIFIED_MANUALLY` means an authorized internal actor
recorded a verification method; it does not prove that a recipient controls a
Zcash address.

The Phase 6B assurance model therefore has two orthogonal facts:

1. **Recipient contact verified:** the person responding controlled the
   configured contact channel during a bounded session.
2. **Zcash address ownership:** not proved by Phase 6B. Supplying or confirming
   a Unified Address does not demonstrate possession of its spending key.

The UI, schema, audit events and policy inputs must never collapse these facts.

## Users and principals

### Organization member

An authenticated OIDC/development user with an active organization membership.
The server derives its organization and role from the session. Eligible roles
may create, revoke or supersede invitations according to explicit capabilities;
no role comes from form input.

### Recipient session

A non-member principal scoped to exactly one invitation. It has no `user_id`,
membership or organization navigation. Its organization, vendor, obligation,
purpose and permitted command are resolved from the invitation after token
verification; they are never accepted from the browser.

### System principal

An internal process may expire invitations or record delivery outcomes. It may
not confirm a contact, create a destination on behalf of a recipient or bypass
the normal destination-review policy.

## Goals

- Verify control of one pre-recorded recipient contact channel.
- Accept one shielded destination proposal for one current obligation version.
- Persist the destination as a new immutable version with truthful provenance.
- Consume invitations and recipient sessions exactly once under concurrency.
- Invalidate stale controls, approvals, readiness and settlement intents.
- Produce privacy-safe, chain-verifiable audit events.
- Make timeout/retry recovery idempotent and explainable.
- Preserve the existing requirement for authorized internal destination
  verification before settlement readiness.

## Non-goals

- Proving Zcash address ownership or spending-key possession.
- Creating a recipient organization account or persistent vendor portal.
- Approving an obligation, satisfying an approval requirement or changing a
  policy.
- Creating a quote or settlement intent.
- Preparing, proving, signing, extracting or broadcasting a PCZT.
- Giving the web application a seed, spending key, UFVK or signer credential.
- Automated refunds, escrow, claim links, payroll or new payment rails.
- Public-network qualification or changing the current readiness label.

## Terminology and assurance

Use these phrases consistently:

- `CONTACT_VERIFIED`: control of the configured contact channel was established
  for this invitation and session.
- `RECIPIENT_CONFIRMED`: a destination was submitted within a
  `CONTACT_VERIFIED` session. This is provenance, not the destination's
  settlement-readiness status.
- `VERIFIED_MANUALLY`: an authorized organization actor separately accepted the
  destination using a recorded method/note under the existing control model.
- `ADDRESS_OWNERSHIP_PROOF`: `UNAVAILABLE` in Phase 6B.

A recipient-confirmed destination is inserted with existing
`verification_status = UNVERIFIED`. The current policy engine must continue to
block it until an eligible internal actor performs manual verification. This
keeps recipient contact verification distinct from wallet ownership and avoids
silently weakening Phase 2 controls.

## Functional requirements

### 1. Invitation creation

An internal command creates an invitation only when all of the following hold:

- actor has an active membership and the explicit invitation-management
  capability;
- vendor and obligation belong to the actor's organization;
- obligation belongs to that vendor;
- obligation is not terminal (`SETTLED`, `REJECTED`, `CANCELLED` or `EXPIRED`);
- a supported, normalized recipient contact already exists on the vendor;
- requested disclosure is the fixed minimal invitation schema; and
- expiration is within the configured minimum/maximum window.

The command binds the invitation to:

- organization ID;
- vendor ID;
- obligation ID and current obligation version;
- current destination ID/version, or an explicit `NONE` generation;
- a keyed fingerprint of the normalized contact value;
- contact channel and verification method;
- purpose `CONFIRM_PAYMENT_DESTINATION`;
- network; and
- absolute expiry.

Only one non-terminal invitation for a vendor and purpose may be active at a
time in the initial slice. Creating a replacement transactionally supersedes
the prior invitation and revokes its challenges/sessions.

### 2. Token generation and hashing

- Invitation and recipient-session tokens contain at least 256 bits from the
  operating system CSPRNG and use unpadded base64url for transport.
- Raw tokens are shown/delivered once and are never stored.
- Tokens are sent in URL fragments, not query strings. The public GET route
  performs no mutation; client code explicitly submits the fragment token in a
  same-origin POST body.
- Persist a domain-separated HMAC-SHA-256 digest using a dedicated production
  secret, for example:

  ```text
  HMAC-SHA-256(
    OBLIQ_RECIPIENT_TOKEN_PEPPER,
    "obliq.recipient-invitation.v1\0" || raw_token
  )
  ```

- Contact verification codes are low entropy and must also be protected by a
  secret-keyed HMAC, bound to invitation ID and challenge ID. A plain hash is
  forbidden.
- The token pepper is at least 32 random bytes, is required outside test mode,
  never enters the database/client/logs, and is distinct from OIDC/session and
  rate-limit peppers.
- Error messages, audit payloads and telemetry contain no raw token, code,
  session token, full contact value or full destination.

### 3. Contact verification

Opening an invitation reveals only the fixed safe pre-authentication text. It
must not reveal invoice reference, amount, vendor legal name, destination or
organization-private metadata.

The recipient requests a bounded challenge sent to the contact snapshot bound
at invitation creation. Requirements:

- code expires in at most ten minutes;
- no more than five verification attempts;
- resend invalidates the previous challenge and is rate-limited by invitation,
  contact fingerprint, IP fingerprint and time window;
- challenge consumption is an atomic conditional update;
- successful consumption creates a fresh scoped recipient session and advances
  the invitation from `ACTIVE` to `CONTACT_VERIFIED`; and
- failures use a uniform response and operational metric rather than flooding
  the financial audit chain.

If the invitation and challenge are delivered through the same compromised
channel, the result is contact control—not independent multi-factor identity.
Product language must not claim otherwise.

### 4. Recipient authorization boundary

A recipient session authorizes only:

- reading the invitation's minimal post-verification summary;
- submitting one destination candidate for that invitation; and
- reading the terminal confirmation result for an idempotent retry.

It cannot list organizations, vendors, obligations or destinations; choose an
organization/vendor/obligation; access `/app`; create evidence; or invoke any
internal financial mutation. Public APIs must derive every resource identifier
from the verified invitation row.

Recipient cookies are `Secure`, `HttpOnly`, `SameSite=Strict`, host-only,
short-lived and rotated after contact verification. Session fixation is
prevented by issuing a new token and invalidating any pre-verification state.
Every mutation enforces same-origin/CSRF policy in addition to token scope.

### 5. Destination validation

The server performs runtime validation of:

- input length and canonical encoding;
- exact configured Zcash network;
- Unified Address structure;
- an acceptable shielded receiver composition for the supported flow;
- absence of transparent fallback under the intended policy; and
- normalized receiver fingerprint.

The recipient reviews a fingerprint/abbreviated representation before final
submission. The full receiver must not enter general analytics or audit
payloads. Validation proves syntax and policy compatibility, not ownership.

### 6. Atomic one-time consumption

Destination confirmation is one PostgreSQL transaction with this lock order:

1. organization audit/advisory lock, matching existing audit ordering;
2. invitation row `FOR UPDATE`;
3. vendor/current-destination rows needed to allocate the next version; and
4. scoped recipient-session row.

Within that transaction the command must:

1. resolve the invitation by token HMAC and session, not by browser-provided
   tenant/resource IDs;
2. recheck `CONTACT_VERIFIED`, session validity and absolute expiry;
3. recheck obligation organization, vendor and bound obligation version;
4. recheck the current destination generation equals the invitation's base
   generation;
5. validate the client idempotency key and canonical request hash;
6. supersede the previous current destination identity, if any;
7. insert exactly one new destination version with immutable receiver identity,
   `verification_status = UNVERIFIED` and recipient-confirmation provenance;
8. insert the immutable destination attestation;
9. invalidate affected approvals, approval requirements, readiness,
   settlement intents and non-terminal settlement preparation using the
   existing destination-change semantics;
10. move affected obligations back to `UNDER_REVIEW` where the existing domain
    rules require it;
11. consume the invitation and recipient session, recording the new
    destination ID and request hash; and
12. append ordered audit events.

Any failure rolls back all steps. There is no separately persisted
`DESTINATION_CONFIRMED` intermediate state: it is the successful domain outcome
of the atomic transition to `CONSUMED`. This prevents an invitation from saying
confirmed while destination creation or invalidation failed.

### 7. Concurrency and idempotent recovery

- A partial unique index prevents two open invitations for the same
  organization/vendor/purpose.
- A unique `(organization_id, vendor_id, version)` constraint allocates one
  destination version under the vendor lock.
- A unique invitation token hash and session token hash prevent aliasing.
- A unique `(invitation_id, operation_type, idempotency_key_hash)` receipt
  prevents duplicate command execution.
- The stored canonical request hash covers invitation ID, obligation/version,
  network and normalized destination fingerprint.
- Repeating the same key and request after success returns the existing
  destination/result.
- Reusing the key with different input returns `IDEMPOTENCY_CONFLICT`.
- If two distinct requests race, only the first valid transaction consumes the
  invitation. The loser receives a generic terminal/stale result and creates no
  destination.
- A client timeout after commit is recovered by retrying the same idempotency
  key. It must never submit a new destination merely because the response was
  uncertain.

### 8. Immutable destination versions

Add an explicit integer version and predecessor reference to destination
history. The tuple `(organization_id, vendor_id, version)` is unique. These
identity fields never change after insertion:

- organization;
- vendor;
- version and predecessor;
- network;
- receiver;
- fingerprint; and
- creation provenance.

Lifecycle/assurance metadata such as supersession and authorized manual
verification may be appended or transitioned, but must never rewrite receiver
identity. Historical settlement intents continue to reference the exact row.

Migration of existing destinations assigns deterministic versions ordered by
`created_at, id`, validates a single current row per vendor, and fails rather
than guessing if history is inconsistent.

### 9. Approval and intent invalidation

Recipient confirmation is a material destination change. The implementation
must reuse one shared transactional invalidation primitive rather than maintain
a second recipient-specific approximation.

At minimum it must:

- invalidate every current approval and approval requirement for affected
  non-terminal obligations;
- invalidate settlement readiness;
- invalidate every unexpired/prepared settlement intent tied to the old
  destination;
- prevent signing/broadcast receipt acceptance for a stale intent;
- move the obligation to the correct pre-control state; and
- require fresh policy evaluation after an authorized internal actor verifies
  the new destination.

The default policy still treats the new destination as unverified. Contact
verification alone can never make an obligation `READY_TO_SETTLE`.

### 10. Audit events

Required financial-chain events:

- `RECIPIENT_INVITATION_CREATED` — member actor; safe contact fingerprint,
  obligation version and expiry only;
- `RECIPIENT_INVITATION_SUPERSEDED` or `...REVOKED` — member/system actor and
  reason code;
- `RECIPIENT_CONTACT_VERIFIED` — recipient-session actor; method and contact
  fingerprint, no code/contact value;
- `RECIPIENT_DESTINATION_CONFIRMED` — recipient-session actor; destination ID,
  version and fingerprint;
- existing `VENDOR_DESTINATION_CHANGED`;
- existing approval/intent invalidation events; and
- `AUTHORIZATION_RESET` for every affected obligation.

Extend audit append semantics to accept a discriminated actor:

```text
USER(user_id) | RECIPIENT_SESSION(session_id) | SYSTEM(null)
```

Existing event hashes must remain verifiable. A migration must not recompute or
rewrite prior audit events. Failed code attempts and raw access logs remain
privacy-safe operational telemetry, not financial-chain events.

## Database schema proposal

Names are provisional but relationships and constraints are required.

### Changes to `vendor_destinations`

| Column                          | Type          | Constraint                                                                  |
| ------------------------------- | ------------- | --------------------------------------------------------------------------- |
| `version`                       | integer       | non-null; unique with organization/vendor                                   |
| `supersedes_destination_id`     | uuid nullable | self-reference; same organization/vendor enforced by repository transaction |
| `recipient_confirmation_status` | enum          | `NONE`, `CONTACT_CONFIRMED`; does not replace `verification_status`         |
| `origin`                        | enum/text     | `INTERNAL_MANUAL`, `RECIPIENT_INVITATION`                                   |

Add an index supporting current history lookup and a partial unique index so at
most one destination lacks `superseded_at` per organization/vendor.

### `recipient_invitations`

| Column                                                            | Purpose                                                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `id`, `organization_id`, timestamps                               | Opaque tenant-scoped identity                                                |
| `vendor_id`, `obligation_id`, `obligation_version`                | Fixed business scope                                                         |
| `base_destination_id`, `base_destination_version`                 | Stale/change detection                                                       |
| `purpose`, `network`                                              | Fixed command and chain scope                                                |
| `contact_channel`, `contact_fingerprint`                          | Contact provenance without duplicated plaintext                              |
| `token_hash`                                                      | Unique HMAC digest; never raw token                                          |
| `state`                                                           | `ACTIVE`, `CONTACT_VERIFIED`, `CONSUMED`, `EXPIRED`, `REVOKED`, `SUPERSEDED` |
| `expires_at`                                                      | Always checked at mutation time                                              |
| `created_by`                                                      | Internal member who issued it                                                |
| `consumed_destination_id`, `consumed_request_hash`, `consumed_at` | Idempotent terminal result                                                   |
| `revoked_by`, `revoked_at`, `reason_code`                         | Explicit terminal history                                                    |

Use a PostgreSQL partial unique index for one `ACTIVE`/`CONTACT_VERIFIED`
invitation per organization/vendor/purpose.

### `recipient_verification_challenges`

Contains organization/invitation IDs, challenge token/code HMAC, expiry,
attempt/max-attempt counts, consumed/locked timestamps, provider reference and
created timestamp. Provider references must not encode the email address.

### `recipient_sessions`

Contains organization/invitation IDs, unique session-token HMAC,
`contact_verified_at`, expiry, last-seen, consumed/revoked timestamps and
creation time. It has no `user_id` or membership foreign key.

### `destination_attestations`

Immutable rows containing organization/destination/invitation/session IDs,
attestation type `RECIPIENT_CONTACT_CONFIRMED`, contact fingerprint,
verification method and timestamp. It stores no claim of address ownership.

### `recipient_operation_receipts`

Contains organization/invitation ID, operation type, idempotency-key HMAC,
canonical request hash, status, result destination ID and timestamps. Unique on
invitation/operation/idempotency-key HMAC.

Every table carries `organization_id`, uses foreign keys, and has indexes that
start with organization scope where used by internal repositories. Recipient
lookups begin from globally unique token/session HMACs and then retain the
resolved organization throughout the transaction.

## State transitions

### Invitation

```text
ACTIVE ──contact challenge consumed──> CONTACT_VERIFIED
  │                                      │
  ├──expiry/revoke/replacement──> terminal states
  │                                      │
  └──────────────────────────────────────┴──destination transaction──> CONSUMED

terminal states: EXPIRED | REVOKED | SUPERSEDED | CONSUMED
```

No terminal state returns to active. Expiration is authoritative from
`expires_at` even before a cleanup job persists `EXPIRED`.

### Contact challenge

```text
ACTIVE → CONSUMED
  ├────→ LOCKED_OUT
  └────→ EXPIRED
```

### Recipient session

```text
ACTIVE → CONSUMED
  ├────→ REVOKED
  └────→ EXPIRED
```

### Destination assurance

```text
recipient_confirmation: NONE → CONTACT_CONFIRMED
verification_status:    UNVERIFIED → VERIFIED_MANUALLY → SUPERSEDED
address ownership proof: UNAVAILABLE
```

The first line records who submitted the address. The second controls current
settlement policy. They are not interchangeable.

## Privacy leakage analysis

| Observer                    | May learn                                                                                  | Must not learn                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Unauthenticated link opener | Obliq branding and generic invitation state                                                | Organization, vendor, invoice, amount, destination or contact                     |
| Contact provider            | Recipient contact, delivery timing and Obliq usage                                         | Obligation amount/details, destination, approvals or treasury data                |
| Obliq web/database          | Bound organization/vendor/obligation, contact fingerprint, destination and workflow timing | Wallet seed/spend key, UFVK, PCZT, raw transaction or signer credential           |
| Recipient                   | Minimal payer context after verification and its submitted destination                     | Other vendors, obligations, policy findings, approvals or treasury history        |
| Operational logs            | Event class, safe IDs/fingerprints, outcome and latency                                    | Raw token/code/session, full contact/destination, memo, UFVK or document contents |
| Network observer            | Endpoint, timing, sizes and IP metadata                                                    | TLS-protected request contents, assuming endpoints are not compromised            |

Residual risks:

- contact verification leaks the payer-recipient relationship to the delivery
  provider;
- exact invitation/payment timing can support off-chain correlation;
- a compromised contact channel can submit an attacker destination;
- recipient device malware can substitute displayed/entered addresses;
- revocation cannot erase already viewed information; and
- an internal database or web compromise exposes business metadata even though
  it does not yield spending authority.

Mitigations include minimal pre-auth disclosure, short expiry, fixed templates,
strict cache/referrer/CSP headers, redacted logs, rate limits, out-of-band
internal destination review and keeping the new destination unverified until
that review.

## Adversarial tests

### Token and identity

- random/short/malformed token returns a uniform response;
- raw token/code/session never appears in database, logs, errors or audit;
- expired, revoked and superseded invitations cannot verify or confirm;
- old challenge fails after resend;
- sixth code attempt is locked out atomically under concurrency;
- successful verification rotates session state and prevents fixation;
- same-channel delivery is labelled contact verification, not MFA.

### Authorization and tenant isolation

- recipient cannot choose or enumerate organization/vendor/obligation IDs;
- token for organization A cannot access or mutate B;
- internal user from B cannot create/revoke A's invitation;
- recipient routes cannot call organization mutations or evidence routes;
- client-provided role, organization or destination-verification status is
  ignored/rejected.

### Destination and versioning

- malformed, wrong-network and transparent-only candidates are rejected;
- a valid UA is not labelled ownership-verified;
- concurrent confirmations produce one version and one attestation;
- a current-destination change after invitation creation makes it stale;
- an obligation-version change after invitation creation makes it stale;
- historical receiver/network/fingerprint cannot be updated;
- deterministic migration versions existing destination history correctly and
  aborts inconsistent history.

### Invalidation and financial safety

- confirmation after approval invalidates approvals/readiness;
- confirmation after intent creation invalidates the intent and prevents
  signing/broadcast receipt acceptance;
- recipient confirmation alone remains blocked by destination policy;
- authorized manual verification plus fresh policy/approvals is required;
- stale invitation cannot revert the vendor to an older destination;
- all affected vendor obligations are handled consistently.

### Idempotency and failure recovery

- double-click, refresh and retry return one destination;
- same idempotency key with different destination is a conflict;
- kill/timeout after commit recovers the stored result;
- injected failure after each transactional step leaves no partial destination,
  consumed invitation or missing invalidation;
- database unavailable returns unknown/unavailable and never fabricates
  confirmation;
- audit chain remains valid after concurrent invitation and destination events.

### Web privacy

- GET/HEAD/OPTIONS never consume or disclose protected state;
- query strings, referrers, caches, indexers and analytics receive no token;
- CSRF/cross-origin confirmation fails;
- link-preview user agents cannot consume challenges;
- response bodies never disclose whether an arbitrary contact or organization
  exists.

## Minimal vertical-slice acceptance test

Run on isolated regtest with PostgreSQL and development-only contact delivery;
do not send or sign a Zcash transaction.

1. Create organization A, finance operator, treasury verifier, vendor, manual
   obligation version 1 and a pre-recorded vendor contact.
2. Finance creates one five-minute invitation. Assert only token HMAC/contact
   fingerprint are persisted and pre-auth GET reveals no business fields.
3. Recipient requests and correctly completes the contact challenge. Assert a
   scoped, rotated `CONTACT_VERIFIED` session with no membership.
4. In parallel, submit the same Orchard-capable regtest UA twice with the same
   idempotency key. Assert exactly one destination version, one attestation, one
   consumed invitation and one successful result.
5. Assert destination provenance is `RECIPIENT_CONFIRMED`, address-ownership
   proof is unavailable and `verification_status` remains `UNVERIFIED`.
6. Evaluate policy and assert readiness is blocked for unverified destination.
7. Have the authorized treasury actor manually verify the exact destination,
   then perform a fresh policy evaluation and required approvals using existing
   commands.
8. Before readiness, create a second recipient-confirmed destination through a
   replacement invitation. Assert the old destination is superseded and every
   prior decision, approval, readiness result and prepared intent is invalid.
9. Retry the first confirmation after a simulated lost response. Assert it
   returns its historical terminal result and does not restore or duplicate the
   destination.
10. Verify the organization audit chain and assert every audit/log/artifact is
    free of raw token, code, session, full contact and sensitive key material.
11. Repeat cross-tenant attacks from organization B and assert no existence or
    record leakage.

The slice passes only if all assertions hold and the existing formatting,
lint, strict TypeScript, unit/integration, migration, build and secret checks
remain green.

## Acceptance criteria

- Contact verification and address ownership are separate modeled facts.
- Raw invitation, challenge and session secrets are never persisted or logged.
- Recipient authority is limited to one invitation and one destination command.
- Expiry and state are rechecked inside the consuming transaction.
- Concurrent requests create no duplicate destination or partial state.
- Destination identity/version history is immutable and deterministic.
- Recipient confirmation invalidates all stale financial authorization.
- A recipient-confirmed destination remains policy-blocked until internal
  verification and fresh controls.
- Audit events preserve actor provenance without sensitive payloads.
- Retry after uncertainty returns the prior result rather than repeating work.
- Cross-tenant and cross-resource attacks fail server-side.
- No wallet, observer, signer or public-network behavior changes in Phase 6B.

## Constraints

- PostgreSQL is authoritative; no in-memory fallback.
- Every financial mutation remains a server-side command with runtime schemas.
- Current organization-level advisory lock ordering must be preserved until a
  reviewed finer-grained strategy replaces it.
- Preview deployment stays fail-closed with recipient and financial routes
  inaccessible.
- Existing audit history must remain verifiable after schema migration.
- Full receiver values may exist only where business operation requires them;
  output and telemetry use fingerprints/abbreviation.
- No AI participates in verification, authorization or destination acceptance.

## Stories needed

- Finance operator issues/revokes/replaces a scoped invitation.
- Recipient verifies the bound contact and confirms one destination.
- Treasury verifier reviews recipient provenance and manually verifies the
  destination.
- Control engine invalidates and re-evaluates affected obligations.
- Operator recovers safely after an uncertain confirmation response.
- Security reviewer verifies tenant isolation, secret handling and audit-chain
  integrity.
- Recipient sees accurate language distinguishing contact control from wallet
  ownership.

These stories should be expanded into BDD scenarios before implementation; this
specification is not the implementation plan.

## Open questions

1. Which production delivery provider and contact channel are acceptable for
   the first customer segment?
2. Which existing membership roles receive invitation-management capability,
   or should capability mapping be made explicit before the feature?
3. Must every recipient-confirmed change receive an out-of-band finance call,
   or only changes above policy thresholds?
4. Is one active invitation per vendor sufficiently usable, or should later
   versions scope uniqueness to vendor plus obligation after stronger conflict
   semantics exist?
5. Should obligation snapshots gain an explicit destination ID, or is the
   separately versioned policy decision plus destination reference sufficient?
6. How long may a recipient session remain readable after consumption?
7. What legal retention/deletion rules apply to contact-delivery metadata?
8. Which wallet capability could eventually provide real address-ownership
   proof without importing spending authority into Obliq?

## Source references

- [Product decision](./DECISION.md)
- [Product workflow research](./PRODUCT_SPEC.md)
- [Threat model](./THREAT_MODEL.md)
- [Zcash feasibility](./ZCASH_FEASIBILITY.md)
- [Build versus reuse](./BUILD_VS_REUSE.md)
- [Phase 2 control architecture](../../decisions/0005-phase-2-control-authorization.md)
- [Non-custodial settlement boundary](../../decisions/0007-non-custodial-zcash-settlement.md)
- [Controlled evidence boundary](../../decisions/0008-controlled-financial-evidence.md)
- [Production security architecture](../../decisions/0009-production-security-boundaries.md)
- [Current public-network evidence boundary](../../decisions/0011-public-zcash-ready-for-funded-test.md)
- [ZIP-316 Unified Addresses](https://zips.z.cash/zip-0316)
- [ZIP-321 payment requests](https://zips.z.cash/zip-0321)
