# Private payables link: unknown outcomes

Frontend only. No API route, repository function, schema, settlement code or
address-inspector code is changed.

The recipient page already kept one retry key and one exact address per
attempt, and recovered them after a reload (#23). This pass closes the gaps
that remained around a request whose result never came back.

## What changed

Recipient page (`recipient-flow.tsx`, `lib/recipient-flow.ts`):

- A retry sends the address that was locked to the key when the first request
  went out. It no longer reads the address from the form state, and a different
  address cannot be reviewed while one is locked.
- When a link or session closes after an unanswered submission, the page says
  it could not confirm whether the address was recorded. It used to show "This
  link cannot be used. Nothing was changed" or "No address was submitted".
- A reload that cannot load the session, or that finds no link, now says that
  an earlier submission from the tab is unresolved.
- A code request that gets no answer says a code may or may not have been sent.
  It used to say no code was requested.
- A failed code request on the session-ended screen is now shown. It was
  silently dropped.
- The remaining "nothing was changed" lines are scoped to the attempt they
  describe.

Finance invitation panel (`recipient-invitation-panel.tsx`,
`lib/recipient-invitations.ts`):

- A send that fails with a server fault is reported as unknown, not as "The
  invitation was not sent".
- A revoke that gets no answer, a server fault, or a success status without
  `REVOKED` is reported as unknown, not as "The invitation was not revoked".
- A refused or unanswered revoke can be tried again without reloading.

## How it was checked

Every outcome was driven in a browser at 390px and 1440px with the
private-payables API replies simulated, so no invitation, address or email was
created.

| Scenario                                                 | Asserted                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Server fault, then lost reply, then recovered result     | Address locked, no edit control, three byte-identical requests, recovered result shown |
| Unknown outcome, then reload                             | Lands on recovery with the same address, retry is the same request                     |
| Unknown outcome, then link or session closed             | Unresolved screen, no claim that nothing changed, new email check offered              |
| Unknown outcome, then reload with no session and no link | Missing-link page warns that a submission is unresolved                                |
| First attempt refused by a closed link                   | Closed screen, claim scoped to this attempt                                            |
| Address rejected by the inspector                        | Back on the form with an error, a new address uses a new key                           |
| Conflict with an earlier submission                      | Conflict screen                                                                        |
| Code request with no answer                              | Outcome reported as unknown                                                            |
| Finance send: 503, lost, 403, 502, 201                   | Unknown, unknown, refused, refused, accepted                                           |
| Finance revoke: lost, 503, 403, 200                      | Unknown and retryable, unknown, refused, revoked                                       |

Each state was also checked for sideways scroll, controls under 44px and
unlabelled fields. 108 assertions, all passing. The finance panel was checked
against a throwaway database holding one open invitation, removed afterwards.

Screenshots `01` to `09` in this folder show the new states on both widths.

## Backend improvements this needs

None of these are made here. They are the reasons the page can only say "we do
not know" in some cases.

1. **A recorded result cannot be read back once the 30-minute session ends.**
   `confirmRecipientDestination` returns the earlier result only when the same
   session is still unexpired, and a consumed invitation cannot start a new
   email check. After a lost reply and an expired session the recipient can
   never learn the outcome from the link. A read-only way to fetch the result
   for a consumed invitation after a fresh email check would close this.
2. **The session summary does not say whether an address was already
   recorded.** `GET /api/private-payables/session` answers the same for an
   active and a consumed session. A tab without the stored attempt shows an
   empty address form, and its submission then gets a 404. A field such as
   `submission: "NONE" | "RECORDED"` would let the page show the result
   instead.
3. **404 covers both "link or session closed" and "already recorded under
   another key".** Both raise `EXPIRED` or `UNAVAILABLE`. Behind a verified
   session these could be told apart without leaking anything to an unverified
   caller.
4. **Finance send and revoke have no idempotency key, and every unexpected
   failure is a 503.** A retried send creates a second invitation and replaces
   the first. An idempotency key on `POST /api/private-payables/invitations`
   would make a retry after an unknown outcome safe.

## Integrating backend fixes

The page reads replies only through the pure functions in
`lib/recipient-flow.ts` and `lib/recipient-invitations.ts`
(`destinationOutcome`, `summaryOutcome`, `parseRevokeReply`, `issueFailure`).
A new status code or field from the backend is a change to one of those
functions and its test, not to the components.
