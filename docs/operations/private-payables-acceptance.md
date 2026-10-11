# Private Payables Link acceptance contract

Status: **IMPLEMENTED backend and recipient/finance integration**

This is the reproducible acceptance contract for the Phase 6B backend and Phase
6C recipient experience. It does not claim that a recipient owns a submitted
Zcash address or that a public-network settlement has occurred.

## Assurance and authority boundary

- Email-code verification proves control of the invitation's recorded email
  channel for a bounded session. It is not identity proof, multi-factor
  authentication, or Zcash address-ownership proof.
- A recipient can read one scoped obligation summary and submit one destination
  candidate. A recipient cannot approve, verify a destination, make an
  obligation ready, create a settlement intent, sign, broadcast, reconcile, or
  issue evidence.
- A submitted destination is a new immutable version with
  `recipientConfirmationStatus=CONTACT_CONFIRMED` and
  `verificationStatus=UNVERIFIED`. An independent eligible organization member
  must review it before fresh controls and approvals can reach
  `READY_TO_SETTLE`.
- Render preview denies all routes in this document. Public-testnet settlement
  remains unverified; the live preview remains `PUBLIC_NETWORK_BLOCKED`.

## Implemented backend inventory

| Stage                          | Public/server contract                                            | Repository command                                          | Authority                                                       |
| ------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| Obligation capture/edit        | authenticated server actions in `apps/web/src/app/app/actions.ts` | `createObligation`, `updateObligation`                      | active finance membership; server-derived tenant                |
| Invitation issue               | `POST /api/private-payables/invitations`                          | `createRecipientInvitation`                                 | `OWNER`, `CFO`, or `FINANCE`                                    |
| Invitation revoke              | `DELETE /api/private-payables/invitations/{id}`                   | `revokeRecipientInvitation`                                 | same invitation-administrator roles and tenant                  |
| Email challenge                | `POST /api/private-payables/challenges`                           | `getRecipientChallengeContext`, `createRecipientChallenge`  | valid opaque invitation token; uniform public response          |
| Contact verification           | `POST /api/private-payables/verify-contact`                       | `getRecipientVerificationContext`, `verifyRecipientContact` | valid invitation and one active email challenge                 |
| Scoped summary                 | `GET /api/private-payables/session`                               | `getRecipientSessionSummary`                                | unexpired recipient session cookie only                         |
| Destination confirmation       | `POST /api/private-payables/destination`                          | `confirmRecipientDestination`                               | same-origin, unexpired one-invitation session                   |
| Independent destination review | authenticated `verifyDestinationAction`                           | `verifyDestinationManually`                                 | `OWNER`, `CFO`, or `TREASURY`; invitation issuer excluded       |
| Control evaluation             | authenticated `evaluateControlsAction`                            | `evaluateObligationControls`                                | `OWNER`, `CFO`, or `FINANCE`                                    |
| Approval                       | authenticated `approvalDecisionAction`                            | `decideApproval`                                            | server-checked eligible membership and separation of duties     |
| Readiness                      | authenticated `readinessAction`                                   | `evaluateSettlementReadiness`                               | control operator; current decision/version/destination required |
| Settlement preparation/signing | authenticated server actions; external signer handoff             | settlement repository commands                              | internal authorized roles only; never recipient authority       |
| Reconciliation                 | isolated observer ingestion                                       | `ingestShieldedObservation`                                 | read-only observer authority; no signer method                  |

The recipient routes accept no organization ID, vendor ID, role, approval
state, destination verification status, settlement state, or evidence-release
instruction from the browser. Tenant and resource relationships are resolved
from the invitation/session or the authenticated organization membership.

The integrated browser route is `/payables/invitation#token={opaque-token}`.
The fragment is removed with `history.replaceState` during initialization and
the token remains in a component ref only. The protected summary and
destination calls use the server-issued HttpOnly cookie with same-origin
credentials. Render preview blocks both this page and every recipient API.

### Recipient response contract

| Response                             | Browser behavior                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `202 IF_VALID_CODE_SENT`             | neutral code-sent language; never confirms that an invitation or contact exists |
| `200 CONTACT_VERIFIED`               | fetch scoped session; never treat as address ownership                          |
| `200 RECIPIENT_CONFIRMED`            | show `UNVERIFIED`, `UNAVAILABLE`, and independent-review-required               |
| `404 RECIPIENT_WORKFLOW_UNAVAILABLE` | terminal neutral state without existence detail                                 |
| `409 RECIPIENT_WORKFLOW_UNAVAILABLE` | idempotency conflict; do not create a new request silently                      |
| `422 DESTINATION_INVALID`            | correct the network/receiver; no destination was stored                         |
| `503 RECIPIENT_WORKFLOW_UNAVAILABLE` | uncertain infrastructure state; retry the same receiver and idempotency key     |

The address inspector reports `422` only when its isolated process explicitly
rejects the input. A missing or malformed inspector remains `503`; the browser
must not describe infrastructure failure as an invalid financial destination.

## Backend acceptance matrix

`DB` cases require migrated PostgreSQL and run through `npm run
test:integration`. Unit cases run through `npm test` without PostgreSQL.

| ID     | Scenario                                                                   | Expected result                                                                            | Automated evidence                                                       |
| ------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| PPL-01 | Finance issues invitation for its obligation/vendor/contact                | 24-hour `ACTIVE` invitation; only token HMAC and contact fingerprint persist               | recipient integration: atomic workflow                                   |
| PPL-02 | Correct email code is consumed                                             | one 30-minute recipient session; invitation becomes `CONTACT_VERIFIED`; replay fails       | recipient integration: atomic workflow + replay assertion                |
| PPL-03 | Recipient confirms an Orchard-capable network-correct UA                   | one immutable destination and attestation; destination remains `UNVERIFIED`                | recipient integration: atomic workflow                                   |
| PPL-04 | Same request/key is retried after response loss                            | same destination returned with `recovered=true`; no duplicate event/version                | recipient integration: bounded receipt recovery                          |
| PPL-05 | Independent reviewer verifies exact destination                            | issuer is rejected; eligible independent reviewer succeeds                                 | recipient integration: atomic workflow                                   |
| PPL-06 | Controls run before internal review                                        | structured `DESTINATION_UNVERIFIED` block; no readiness                                    | recipient integration: atomic workflow                                   |
| PPL-07 | Controls run after internal review                                         | fresh approval requirements; recipient session satisfies none                              | recipient integration: atomic workflow; control integration              |
| PPL-08 | Invitation/session expires or invitation is revoked/superseded             | verification/confirmation unavailable; no recovery disclosure                              | recipient integration: expiry and bounded recovery                       |
| PPL-09 | Challenge or destination token is replayed                                 | consumed challenge fails; destination retry is recovery only for identical unexpired scope | recipient integration: atomic workflow and bounded recovery              |
| PPL-10 | Organization B uses A's IDs                                                | no mutation or existence-bearing record                                                    | recipient/control/settlement integration tenant tests                    |
| PPL-11 | Two confirmations race                                                     | exactly one current destination/version                                                    | recipient integration: concurrent one-time confirmation                  |
| PPL-12 | Same idempotency key carries changed input                                 | `IDEMPOTENCY_CONFLICT`; prior result unchanged                                             | recipient integration: bounded recovery                                  |
| PPL-13 | Destination changes after approvals/preparation                            | approvals, requirements, readiness, unsigned intent and settlement invalidate              | recipient integration: atomic and shared-vendor invalidation             |
| PPL-14 | Signed, unbroadcast transaction exists                                     | destination replacement fails closed; signed state remains intact                          | recipient integration: signed transaction guard                          |
| PPL-15 | Broadcast transaction exists when vendor destination changes               | historical intent/target preserved; observer may reconcile it                              | recipient integration: broadcast reconciliation preservation             |
| PPL-16 | Recipient attempts to supply tenant, role, approval, or verification state | strict runtime schemas reject extra authority fields                                       | domain recipient contract test                                           |
| PPL-17 | Raw token/code/session/contact/destination appears in audit                | fail; audit stores safe IDs/fingerprints only                                              | recipient integration: audit leakage assertion                           |
| PPL-18 | Preview receives any recipient route or financial mutation                 | 404/denied; no private runtime configured                                                  | public-preview and runtime-security tests                                |
| PPL-19 | Email verification is interpreted as wallet ownership                      | fail; all responses say `addressOwnershipProof=UNAVAILABLE`                                | domain/API contract plus recipient integration                           |
| PPL-20 | Recipient attempts approval or settlement authorization                    | impossible through recipient contract; internal commands require active membership         | strict schemas, repository authorization tests, manual browser checklist |

## Safe frontend fixture

Use [`private-payables-link-v1.json`](./fixtures/private-payables-link-v1.json)
only as a shape fixture. Its IDs, token, receiver, amounts, and responses are
synthetic and must be labelled `SEEDED` in a design/development environment.
It is not executable evidence and must never be displayed as a real financial
success.

## Frontend integration rules

1. Read the invitation token from `location.hash`, immediately remove the
   fragment with `history.replaceState`, and retain it only in page memory.
   Never send it to analytics, error reporting, logs, query strings, local
   storage, or rendered markup.
2. Request the challenge with `POST /api/private-payables/challenges`. Always
   show neutral delivery language because `202 IF_VALID_CODE_SENT` is uniform.
3. Submit the six-digit code and invitation token to
   `POST /api/private-payables/verify-contact`. Do not attempt to read the
   HttpOnly session cookie.
4. After verification, fetch `GET /api/private-payables/session`. Render only
   the returned obligation. Do not add organization/vendor discovery calls.
5. Generate one cryptographically random idempotency key for destination
   submission. Retain it in page memory across uncertain retries and submit the
   same receiver/key pair again. A `409` means the key was reused for different
   content; do not silently create another request.
6. Label the result exactly as contact-confirmed and awaiting independent
   finance review. Never say wallet verified, address owner verified, approved,
   ready to pay, paid, or settled.
7. Treat `404 RECIPIENT_WORKFLOW_UNAVAILABLE` as a terminal or unavailable
   scoped workflow without revealing whether the invitation existed. Treat
   `503` as infrastructure uncertainty, not success or rejection.
8. Do not add recipient controls for approval, settlement, signing, broadcast,
   reconciliation, or evidence issuance.

## Eventual browser acceptance checklist

Run this against an isolated migrated test environment—not Render preview and
not public Zcash. Real email delivery remains environment-dependent; fixture
values are for test setup only and are never product evidence.

- [ ] Fragment token disappears from the address bar/history before any
      third-party resource, telemetry, or error reporter can observe it.
- [ ] Unauthenticated GET, HEAD, link preview, refresh, and malformed token do
      not disclose payer, vendor, amount, reference, contact, or destination.
- [ ] Challenge request has a uniform success screen for valid and invalid
      tokens; resend invalidates the prior code.
- [ ] Code expiry, attempt exhaustion, invitation revocation, and session expiry
      have neutral, accessible terminal states.
- [ ] Verified summary contains only the invited obligation and cannot navigate
      into `/app`, another invitation, evidence, or organization records.
- [ ] Destination entry states that email control is not address ownership;
      network and shielded-receiver validation errors are accessible.
- [ ] Double-click and refresh do not create a second destination; timeout retry
      reuses the same idempotency key.
- [ ] Confirmation shows `UNVERIFIED` and independent-review-required language,
      never approval/payment success.
- [ ] Revocation and expiry invalidate open tabs; browser back does not recover
      protected content from cache.
- [ ] Keyboard flow, focus movement, labels, error association, status text,
      narrow viewport, reduced motion, and non-color status cues pass review.
- [ ] Network inspector, analytics, console, server logs, response bodies,
      referrers, and cached documents contain no raw invitation token, code,
      session cookie, full receiver, or private contact value.
- [ ] Render preview continues to return 404 for every recipient route and every
      mutation.

## Reproducible commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test

docker compose up -d postgres
DATABASE_URL=postgresql://obliq:obliq@127.0.0.1:5433/obliq npm run db:migrate
TEST_DATABASE_URL=postgresql://obliq:obliq@127.0.0.1:5433/obliq npm run test:integration

npm run security:secrets
npm run build
```

No command above creates a wallet, signs, broadcasts, moves funds, or changes
the public-network qualification state.
