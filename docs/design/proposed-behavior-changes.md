# Proposed behaviour changes (not implemented)

The design work identified a small number of improvements that cannot be made
in presentation alone. They are listed here so they can be reviewed and
scheduled separately. **None of them is implemented by the design pull request
or by the landing-page pull request.**

Each would need its own issue, review and tests.

| #   | Change                                                                                                  | Why the design wants it                                                                                      | What it touches                                                                     | What it must not change                                                    |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P1  | Server actions return validation errors to the form instead of throwing                                 | Today every failure, including a mistyped amount, lands on a generic error page and the form's input is lost | The return type of the actions in `apps/web/src/app/app/actions.ts` and their forms | What each action accepts, validates, authorizes or writes                  |
| P2  | After a settlement intent is prepared, redirect to that settlement's signing review instead of the list | The user must otherwise find the new row in the list                                                         | One redirect target in `createSettlementIntentAction`                               | Intent creation, idempotency, quote handling                               |
| P3  | A sign-in page between `/app` and the identity provider, and authentication failures rendered as pages  | An unauthenticated visit jumps straight to the provider, and failures are bare text with no way back         | The response bodies of `/auth/login` and `/auth/callback`; a new public route       | Status codes, PKCE, state and nonce validation, rate limits, session logic |
| P4  | Sorting and paging for lists                                                                            | Lists return every row                                                                                       | Repository list functions and their callers                                         | Tenant predicates                                                          |

## What needs no behaviour change

For clarity, these design requirements are presentation only:

- Success notices. Actions already redirect with a flag such as
  `?approval=recorded`; pages only need to read it.
- Confirmation steps. The same form is submitted after the user confirms.
- Pending states on buttons.
- Explaining a disabled action, and showing the signed-in person's role.
- State labels, the authority track, the network scope tag and the dashboard
  grouped by whose turn it is. All derive from values the pages already load.
- Filtering the obligations list by state, which the list already supports
  through its `state` query parameter.
