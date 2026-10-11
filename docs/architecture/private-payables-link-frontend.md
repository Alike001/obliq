# Private Payables Link frontend

Status: **IMPLEMENTED — Phase 6C integrated vertical slice**

This is the browser side of the contract in
[Private Payables Link backend](./private-payables-link-backend.md) and
[ADR 0012](../decisions/0012-private-payables-recipient-boundary.md). The
recipient remains restricted to the existing scoped APIs. The authenticated
workspace reads invitation status through a tenant-scoped server repository;
no invitation token or contact fingerprint is selected.

## What was added

| Surface                | Where                                      | Uses                                                                          |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| Recipient page         | `/payables/invitation`                     | `challenges`, `verify-contact`, `session`, `destination`                      |
| Invitation panel       | Obligation record, "Private payables link" | tenant-scoped persisted status, `POST invitations`, `DELETE invitations/{id}` |
| Destination provenance | Vendor record, destination history         | Existing `listVendorDestinations` columns                                     |

Decision logic lives in two pure modules with unit tests,
`apps/web/src/lib/recipient-flow.ts` and
`apps/web/src/lib/recipient-invitations.ts`. The components only render what
those modules return.

## Recipient journey

1. **Entry.** The same fixed text for every visitor. Nothing about the payer,
   the obligation or the contact is shown before the email check.
2. **Email check.** The page says a code was sent _if the link is still valid_,
   because the server answers every challenge request the same way. A refused
   code gets one uniform message. After five refusals the page says the code
   can no longer be used and offers a new one.
3. **Address.** After verification the page shows only what the session
   endpoint returns: reference, amount, due date and network. The recipient
   enters a Unified Address, reviews it in groups of four and ticks a
   confirmation before submitting.
4. **Outcome.** Shown only on an explicit `200` whose body says
   `RECIPIENT_CONFIRMED`, `UNVERIFIED` and `addressOwnershipProof: UNAVAILABLE`.
   A reply claiming anything else is treated as not confirmed.

| Server reply to the address submission | What the recipient sees                                               |
| -------------------------------------- | --------------------------------------------------------------------- |
| `200`, well formed                     | "Address submitted. Not yet verified."                                |
| `200` with `recovered: true`           | The same, noted as the result of the earlier submission               |
| `409`                                  | An address was already submitted from this link; the first stands     |
| `422`, exact rejection envelope        | The decoded address was rejected and may be corrected                 |
| `404`                                  | The link cannot be used (expired, revoked, replaced or used)          |
| `404` after the session's expiry time  | The verified session has ended                                        |
| `503`, timeout, unreadable reply       | "We do not know whether your address was recorded", with a safe retry |

## Token handling

- The token is read from the URL fragment in the browser and held in memory
  only. The fragment and any query string are removed with
  `history.replaceState` before the first request.
- It is sent only in the body of the same-origin `challenges` and
  `verify-contact` requests, and dropped from memory once verification
  succeeds.
- It is never written to storage, markup, a URL, a log or an analytics call.
  The page loads no third-party script. A browser run confirmed the token
  appears in no request URL, in no storage and nowhere in the document.
- `/payables/*` is served `no-store`, `no-referrer` and `noindex`, and is
  disallowed in `robots.txt`.
- Before the first destination POST, the exact receiver and idempotency key are
  bound together in `sessionStorage` for the life of that tab. A reload can
  retry the same operation but cannot substitute a different receiver while
  the result is uncertain. Neither value grants authority without the HttpOnly
  session cookie. The invitation token and session secret are never stored.

## Language rules the interface follows

- Email verification is described as access to the contact's mailbox. It is
  never described as proof of who controls the wallet.
- A recipient-submitted destination is labelled **Unverified** everywhere,
  with the note that a member other than the sender of the link must review it.
- Nothing says or implies that the recipient can approve, sign, schedule or
  start a payment.
- The address check in the browser is called a first look, not validation.

## Public preview

Unchanged. The preview proxy still blocks `/payables/invitation` and every
`/api/private-payables/*` path, the page calls `notFound()` in preview mode as
a second check, and the preview boundary test now covers both.

## Gaps in the contract, and what is requested

None of these is worked around with invented data.

1. **Later invitation events are not tied to the obligation.** Revoked,
   superseded, expired, contact-verified and destination-confirmed events carry
   no `obligationId`, so the obligation's activity history shows that a link
   was created and nothing after.
   **Request:** include `obligationId` in those audit payloads.
2. **Create and revoke refuse without a reason.** Every failure is
   `400 INVITATION_UNAVAILABLE`: wrong role, no contact email, closed
   obligation, rate limit or failed email delivery. A failed delivery also
   leaves a created-then-revoked invitation in the audit history.
   **Request:** reason codes on these authenticated internal endpoints.
3. **The session summary does not say whether an address was already
   recorded.** After a reload the page cannot show the outcome until the
   recipient enters the same address again.
   **Request:** invitation state, and the recorded destination version when
   consumed, in `GET /api/private-payables/session`.
4. **A lapsed verified session strands the invitation.** A code can only be
   requested while the invitation is `ACTIVE`. Once it is `CONTACT_VERIFIED`,
   a recipient whose 30-minute session ends, or whose verification reply was
   lost before the cookie arrived, cannot verify again and needs a new
   invitation. The page says exactly that.
   **Request:** allow a new challenge for a `CONTACT_VERIFIED` invitation,
   revoking the earlier session.
5. **A vendor's contact email cannot be changed after creation.** When it is
   missing the panel explains why no link can be sent but cannot offer a fix.
   **Request:** an authorized vendor-contact edit, which must also supersede
   open invitations.
6. **The independent-reviewer rule surfaces as a generic error.** When the
   member who sent the link tries to record manual verification, the existing
   server action throws and the workspace error page appears. The vendor
   record now states the rule beside the form.
   **Request:** a typed result from the verification action.

## Verification

- Unit tests: `recipient-flow.test.ts`, `recipient-invitations.test.ts`, the
  address-error boundary, database tenant isolation, and the extended preview
  boundary.
- A browser run against the real endpoints on an isolated regtest
  configuration with PostgreSQL, the pinned address inspector and a
  development-only mail sink. It covered send, email check with a refused and
  an accepted code, an address the server rejected, a recorded address, reload
  with conflict and with recovery, revocation during a verified session,
  revoking twice, and a failed email delivery. No transaction was created,
  signed or sent.
- Screenshots from that run are in `docs/design/screens/private-payables/`.
  The amounts, names and addresses in them are test data.
