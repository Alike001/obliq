# Workspace completion: implementation notes

Finishes the scope of issue #3 that the first Obliq design change left
untouched: record pages, forms, policies, evidence, and the states around
them. The look is the same Obliq design in Zcash gold, black and grey; no new
colour, typeface or component style is introduced. The earlier notes are in
[`../landing/README.md`](../landing/README.md).

## What changed

| Area                   | Change                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell                  | "Skip to content" link; the content region can take focus                                                                                                |
| Overview               | The four state counts link to their list; a "Needs attention" queue lists what is waiting on a person, most urgent first                                 |
| Obligations list       | Accepts a state filter, shows which one is active, and has an empty state for it                                                                         |
| Obligation record      | Amount, vendor, due date and next step at the top; state tags for findings, requirements, readiness and observations; labelled approval and intent forms |
| Vendor record          | Destination history with state tags and the current destination marked; labelled verification form; obligation history with amount and state             |
| Invoice upload, review | Step count, labelled file field, seeded-extraction notice in the design's hatched style                                                                  |
| Policies               | Result messages, clearer empty and read-only states, active version marked in the history                                                                |
| Settlements            | Result messages; the record page leads with the shielded amount; labelled receipt forms; a statement that only observer evidence settles                 |
| Evidence               | Labelled fields; eligibility, expiry, already-issued and integrity-failure states; revoke explains its effect                                            |
| Errors                 | One page for a failed load or a failed submit that says how to check before retrying; a not-found page inside the workspace                              |
| Every form             | The submit button shows that it is working and cannot be pressed twice meanwhile                                                                         |

New shared pieces: `notice.tsx`, `submit-button.tsx`, `record.tsx`,
`lib/attention.ts` (with a unit test). `state-tone.ts` gains the words used
by destinations, requirements, findings, readiness and evidence packages.

## Result messages

The server actions already redirect with a flag after they succeed (for
example `?approval=recorded`). Only three of those flags were ever shown.
Every one now has a message on the page it lands on. Each message says what
was recorded and what has **not** happened, so none of them reads as payment:

| Flag                  | Message heading                                  |
| --------------------- | ------------------------------------------------ |
| `created` (vendor)    | Vendor created                                   |
| `destination=added`   | Destination saved as unverified                  |
| `verified`            | Manual verification recorded                     |
| `created`, `updated`  | Obligation created / Obligation updated          |
| `duplicate=blocked`   | Nothing new was created                          |
| `duplicate=resolved`  | Duplicate finding resolved                       |
| `controls=evaluated`  | Controls evaluated                               |
| `approval=recorded`   | Your decision was recorded                       |
| `readiness=evaluated` | Readiness evaluated                              |
| `created`, `version`  | Default policy created / New version published   |
| `prepared`            | Settlement intent prepared, nothing paid         |
| `signing=requested`   | Signing review started, nothing signed           |
| `signing=recorded`    | External authorization recorded, not yet settled |
| `signing=closed`      | Non-success outcome recorded                     |
| `broadcast=recorded`  | Broadcast outcome recorded, not yet settled      |
| `issued`, `revoked`   | Evidence issued / Package revoked                |

A flag is only a hint in the address. Where the record can confirm it (a
policy exists, the package is active or revoked) the message is shown only
when the record agrees. The state tag and the record below remain the truth.

## State tags

The rule from the first change holds and is still tested: only `SETTLED` is
"clear" among obligation and settlement states. Other records now use the
same tag instead of raw text:

| Tone    | Words                                                                              |
| ------- | ---------------------------------------------------------------------------------- |
| Clear   | Verified, verified manually, active, pass, resolved                                |
| Ready   | Ready (a gate passed, like an approved obligation; not a payment)                  |
| Hold    | Unverified, pending, preview, require approval, not ready, open, broadcast unknown |
| Stop    | Revoked, block                                                                     |
| Neutral | Superseded, inactive, not required, invalidated, and any unknown word              |

Every tag is a glyph, a tint and the word, so none depends on colour.

## Product behaviour

No server action, route handler, repository function, schema or migration is
modified. `apps/web/src/app/app/actions.ts` and `apps/web/src/app/auth` have
no diff. Form field names, hidden idempotency keys and bound arguments are
unchanged. Three page-level reads changed, all read-only and tenant-scoped as
before:

- The obligations list passes a `state` filter on only when it is one of the
  product's obligation states; an unknown value is ignored instead of reaching
  the query.
- The overview builds the attention queue from the obligations it already
  loaded.
- Pages read the result flags from the address.

Role checks in pages still only choose what to show, and are commented as
such. The server actions remain the authority.

## Tests

Run in Chromium driven by Playwright with axe-core 4, against the development
server and a throwaway local PostgreSQL with the migrations and seed applied.
The records were created through the workspace's own forms: one vendor, one
destination verified manually, four obligations, controls evaluated on three,
one approved, evaluated for readiness, prepared as an intent and taken to
"awaiting signature".

Pages checked (17): overview, vendors, new vendor, vendor record, obligations
filtered and filtered-empty, new obligation, edit obligation, invoice upload,
two obligation records, policies, approvals, settlements, settlement record,
evidence, not found.

| Check                | Result                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 320px, 390px, 1440px | No page scrolls sideways at any of the three widths                                                                                         |
| axe (WCAG 2.2 A, AA) | No violations on any of the 17 pages at any of the three widths                                                                             |
| Field names          | Every visible input, select and textarea has a label or an accessible name                                                                  |
| Keyboard             | "Skip to content" is the first stop in the workspace and moves focus to the content                                                         |
| Forms, end to end    | Vendor, destination, verification, obligation, controls, approval, readiness, intent, signing review: each completed and showed its message |
| Unit tests           | 140 pass, including the attention queue order and the new tag tones                                                                         |
| Lint, types, build   | `npm run lint`, `npm run typecheck` and `npm run build` pass                                                                                |

Not tested: a screen reader, physical devices, browsers other than Chromium,
an OIDC deployment, and a production build in the browser (the browser checks
ran on the development server). The evidence preview, issued-package and
revoke pages need a settled obligation, which needs the observer; they were
type-checked and read but not opened in a browser. The same holds for the
broadcast form and the expired-quote notice.

## Screenshots

Desktop is 1440px, mobile is 390px.

| Surface                          | Desktop                                                                        | Mobile                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Overview with attention queue    | [overview-desktop.png](./overview-desktop.png)                                 | [overview-mobile.png](./overview-mobile.png)                                 |
| Obligations, filtered            | [obligations-filtered-desktop.png](./obligations-filtered-desktop.png)         | [obligations-filtered-mobile.png](./obligations-filtered-mobile.png)         |
| Obligations, filter with no rows | [obligations-filter-empty-desktop.png](./obligations-filter-empty-desktop.png) | [obligations-filter-empty-mobile.png](./obligations-filter-empty-mobile.png) |
| Obligation, approval required    | [obligation-approval-desktop.png](./obligation-approval-desktop.png)           | [obligation-approval-mobile.png](./obligation-approval-mobile.png)           |
| Obligation, in settlement        | [obligation-settling-desktop.png](./obligation-settling-desktop.png)           | [obligation-settling-mobile.png](./obligation-settling-mobile.png)           |
| New obligation                   | [obligation-new-desktop.png](./obligation-new-desktop.png)                     | [obligation-new-mobile.png](./obligation-new-mobile.png)                     |
| Edit obligation                  | [obligation-edit-desktop.png](./obligation-edit-desktop.png)                   | [obligation-edit-mobile.png](./obligation-edit-mobile.png)                   |
| Invoice upload                   | [invoice-upload-desktop.png](./invoice-upload-desktop.png)                     | [invoice-upload-mobile.png](./invoice-upload-mobile.png)                     |
| Vendors                          | [vendors-desktop.png](./vendors-desktop.png)                                   | [vendors-mobile.png](./vendors-mobile.png)                                   |
| New vendor                       | [vendor-new-desktop.png](./vendor-new-desktop.png)                             | [vendor-new-mobile.png](./vendor-new-mobile.png)                             |
| Vendor record                    | [vendor-detail-desktop.png](./vendor-detail-desktop.png)                       | [vendor-detail-mobile.png](./vendor-detail-mobile.png)                       |
| Policies                         | [policies-desktop.png](./policies-desktop.png)                                 | [policies-mobile.png](./policies-mobile.png)                                 |
| Approvals                        | [approvals-desktop.png](./approvals-desktop.png)                               | [approvals-mobile.png](./approvals-mobile.png)                               |
| Settlements                      | [settlements-desktop.png](./settlements-desktop.png)                           | [settlements-mobile.png](./settlements-mobile.png)                           |
| Settlement record                | [settlement-detail-desktop.png](./settlement-detail-desktop.png)               | [settlement-detail-mobile.png](./settlement-detail-mobile.png)               |
| Evidence, nothing eligible       | [evidence-desktop.png](./evidence-desktop.png)                                 | [evidence-mobile.png](./evidence-mobile.png)                                 |
| Not found                        | [not-found-desktop.png](./not-found-desktop.png)                               | [not-found-mobile.png](./not-found-mobile.png)                               |

The records shown are sample data in a local database that existed only for
these checks. No real approval, payment or settlement took place.

## Open items

- A failed submit still goes to the error page, and what was typed is lost.
  Showing the error beside the field needs the server actions to return a
  result instead of throwing, which is a change to their contract and so is
  left for its own review.
- The list tables on obligations, vendors and approvals scroll sideways inside
  their card on a phone; the page itself does not. Stacking them is a possible
  follow-up.
- "Due in 14 days" and "Possible duplicates" on the overview are counts only,
  because the list has no filter for them yet.
