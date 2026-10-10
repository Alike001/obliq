# Private Payables Link backend contract

Status: **IMPLEMENTED — backend vertical slice**

This document is the integration contract for the recipient-facing frontend.
It does not authorize a new visual direction and does not change any existing
workspace page.

## Assurance boundary

- `CONTACT_VERIFIED` means a recipient supplied a valid code delivered to the
  vendor email address already recorded by the organization.
- `RECIPIENT_CONFIRMED` means that contact-verified session submitted the
  destination.
- The destination remains `UNVERIFIED` until a different authorized internal
  finance reviewer records `VERIFIED_MANUALLY`.
- `ADDRESS_OWNERSHIP_PROOF` remains `UNAVAILABLE`. A Unified Address submission
  is not proof that the recipient controls its spending key.
- Evidence is never released automatically. A separate authorized internal
  evidence action remains required after observer-confirmed settlement.

## Fixed V1 policy

| Property                               | Value                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Contact channel                        | Email only                                                                     |
| Invitation lifetime                    | 24 hours                                                                       |
| Verified session lifetime              | 30 minutes                                                                     |
| Invitation administrators              | Active `OWNER`, `CFO`, or `FINANCE` members                                    |
| Destination reviewer                   | Existing `OWNER`, `CFO`, or `TREASURY` verifier, but not the invitation issuer |
| Recipient scope                        | One invitation and its bound obligation version                                |
| Destination assurance after submission | `UNVERIFIED` / `CONTACT_CONFIRMED`                                             |

## Browser flow

The mail adapter receives an invitation URL whose token is in the fragment:

```text
https://app.example/payables/invitation#token=<one-time-token>
```

Fragments are not sent in HTTP requests. The frontend must read it locally,
remove it from visible browser history with `history.replaceState`, and submit
it only in the same-origin challenge/verification POST bodies. It must never
place the token in a query string, analytics event, error report, local storage
or rendered markup.

The frontend must use the exact language above. In particular, it must not say
that Obliq verified wallet ownership.

## API contracts

All responses use `Cache-Control: private, no-store`, `Referrer-Policy:
no-referrer`, `X-Content-Type-Options: nosniff`, and anti-indexing headers.
Mutation requests must be same-origin. Public-preview middleware returns 404
for every endpoint below.

### Internal invitation creation

`POST /api/private-payables/invitations`

```json
{ "obligationId": "uuid" }
```

The authenticated member's organization and role are derived from the server
session. The response contains only invitation ID, state and expiry. The raw
token is delivered directly through the configured private mail adapter and is
never returned to the workspace client.

### Internal revocation

`DELETE /api/private-payables/invitations/{id}`

```json
{ "reasonCode": "CONTACT_CHANGED" }
```

Allowed reason codes are `CONTACT_CHANGED`, `SENT_IN_ERROR`,
`SECURITY_CONCERN`, and `OTHER`. Cross-tenant IDs and unauthorized roles
produce no mutation.

### Request email challenge

`POST /api/private-payables/challenges`

```json
{ "invitationToken": "fragment token" }
```

The response is always `202 {"status":"IF_VALID_CODE_SENT"}` so an attacker
cannot enumerate invitations or contacts. Resending revokes the previous code.

### Verify contact

`POST /api/private-payables/verify-contact`

```json
{ "invitationToken": "fragment token", "code": "123456" }
```

Success rotates authority into a 30-minute, host-only, HttpOnly,
SameSite=Strict recipient cookie and returns:

```json
{
  "status": "CONTACT_VERIFIED",
  "addressOwnershipProof": "UNAVAILABLE"
}
```

### Read scoped summary

`GET /api/private-payables/session`

Returns only the bound obligation ID, reference, exact integer minor-unit
amount, currency, due date, network and expiry. It cannot list other records.

### Confirm destination

`POST /api/private-payables/destination`

```json
{
  "receiver": "network-correct Unified Address",
  "idempotencyKey": "client-generated random value"
}
```

The server passes the address over stdin to the pinned Rust address inspector.
The inspector requires an Orchard receiver and rejects transparent receivers.
Successful consumption returns the immutable destination ID/version,
`verificationStatus: "UNVERIFIED"`, `addressOwnershipProof: "UNAVAILABLE"`
and whether the response was recovered from an idempotency receipt.

The frontend must retain and reuse the same idempotency key after timeouts. It
must not create a new key merely because the response was uncertain.

## Delivery adapter

Production startup requires:

- `OBLIQ_RECIPIENT_TOKEN_PEPPER`: a dedicated secret of at least 32 characters;
- `OBLIQ_RECIPIENT_EMAIL_ENDPOINT`: private HTTPS mail-adapter endpoint; and
- `OBLIQ_RECIPIENT_EMAIL_TOKEN`: bearer credential for that adapter.

The adapter accepts only the `INVITATION` and `VERIFICATION_CODE` message
shapes implemented by the server. These values are necessarily disclosed to
the mail provider, but are never logged or persisted in plaintext by Obliq.
Provider delivery evidence must use an opaque reference and must not encode an
email address.

## Failure and recovery

- Expired, revoked, superseded and consumed authority uses a uniform unavailable
  response.
- Five invalid code attempts lock the challenge. Resend creates a new bounded
  challenge and revokes the old one.
- Invitation/session state, destination insertion, invalidation, operation
  receipt and audit events commit atomically.
- A retry with the same idempotency key and request returns the original result.
- Reusing a key for a different request returns an idempotency conflict.
- Two distinct concurrent confirmations can produce only one destination.
- Database or address-inspector uncertainty cannot fabricate confirmation.

## Still unavailable

- recipient frontend page;
- address-ownership proof;
- automatic destination verification;
- recipient organization membership or portal navigation;
- automatic evidence receipt release;
- wallet creation, signing, broadcast or payment execution; and
- public-network settlement verification.
