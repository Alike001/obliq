# Evidence, documentation, security and proof: implementation notes

Covers issue #4. The look is the same Obliq design in Zcash gold, black and
grey. This change is presentation only: what is disclosed, hashed, authorized
or claimed is exactly what it was. It builds on the workspace change in
[`../workspace/README.md`](../workspace/README.md), which already gave the
workspace evidence pages their labels, state tags and result messages.

## What changed

| Surface                | Change                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence preview       | A "will see / will not see" list above the receipt, read from the artifact that will be frozen, so the disclosure is exact before issuing              |
| Receipt                | Disclosed fields are a labelled list with a count; the status is a state tag; an integrity failure is in words and the stop colour                     |
| Public verification    | One verdict above the receipt for each state: current and intact, superseded, revoked, integrity failure, not found, temporarily unavailable           |
| Documentation          | The page being read is marked in the index; "On this page" is reachable on phones; previous and next links; a skip link; tables and code are focusable |
| Documentation callouts | Use the design's notice instead of the old amber and green boxes                                                                                       |
| Security               | Business approval, viewing authority and spending authority are three cards, each stating who holds it, what it can do and what it cannot              |
| Security limits        | The same sentences as before, as a list instead of one paragraph                                                                                       |
| Proof                  | A network section at the top, from the status the server enforces: regtest verified and tagged Regtest, public network and mainnet blocked             |
| Proof cards            | A fact proven on regtest only carries the Regtest tag; "Confirmed" is a word, not only an icon                                                         |

## Acceptance criteria

| Criterion                                                                    | How it is met                                                                                                                                                                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence creation makes the exact recipient disclosure clear before issuance | The preview lists every field the recipient will see and every field they will not, counted, from `artifactJson.disclosedFields`                                                                          |
| Public verification displays only fields already authorized by the server    | The page renders `artifactJson` and the package status, as before. No new field is read or shown; a status-change date was considered and left out because the public page did not show it before         |
| Receipt presentation derives from the canonical evidence model               | `EvidenceArtifact` still renders only `disclosedFields`, `claims`, `evidenceId` and the content hash, with labels from `evidenceFields`. The page says the JSON is canonical and the receipt adds nothing |
| Documentation is navigable and readable on desktop and mobile                | Current page marked, section list at every width, previous and next, 68-character measure, no sideways scroll at 320px                                                                                    |
| Security explains the three authorities distinctly                           | Three numbered cards with holder, "Can" and "Cannot"; a line showing how they connect; AI stated as holding none                                                                                          |
| Proof distinguishes REGTEST VERIFIED from PUBLIC NETWORK BLOCKED             | The network section uses `networkClaims`, the same source as the landing page: a solid stamp plus the hatched Regtest tag against a red-bordered "Blocked" stamp, each with a sentence                    |
| Revoked, superseded, invalid, unavailable and integrity-failure states       | Each has its own notice with a glyph, a heading in words and what to do next; failures use `role="alert"`                                                                                                 |
| Screenshots and accessibility notes                                          | Below                                                                                                                                                                                                     |

## Guardrails

No change to evidence disclosure permissions, canonicalization, integrity
hashes, tenant authorization, settlement verification, observer logic or proof
claims. `packages/` has no diff. The verify route, the JSON route, rate
limiting, access logging and every server action are untouched. Nothing
describes evidence as a zero-knowledge proof; the existing statement that it
is not one is kept on the receipt and the evidence page.

Wording on the security page: the three authority cards restate facts the
page and the proof page already made (the backend holds no spending authority,
the observer imports a UFVK as ViewOnly, only sanitized receipts return to
Obliq). The "Current limits" sentences are verbatim.

## Tests

Chromium driven by Playwright with axe-core 4, against the development server
and a throwaway local PostgreSQL. Evidence needs a settled obligation, which
needs the observer; for these checks one sample obligation was marked settled
directly in that throwaway database, the way the evidence integration test
does. Packages were then previewed, issued, superseded and revoked through
the workspace's own forms. For the integrity-failure state, one sample
package's stored hash was overwritten in the throwaway database with the
protecting trigger switched off for that statement.

Pages checked (15): public verification in five states (active, superseded,
revoked, integrity failure, not found), evidence create, preview, issued,
revoked and integrity failure in the workspace, three documentation pages
(one with a table), security, proof.

| Check                | Result                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 320px, 390px, 1440px | No page scrolls sideways on any of the 15 pages                                                                                               |
| axe (WCAG 2.2 A, AA) | No violations on any of the 15 pages at any of the three widths                                                                               |
| Verdicts             | Each public state showed its own heading: "Current and intact", "Superseded", "Revoked", "Integrity check failed", "No evidence at this link" |
| Documentation index  | The page being read is marked with `aria-current`                                                                                             |
| Keyboard             | "Skip to content" is the first stop on documentation, security and proof                                                                      |
| Lint, types, build   | `npm run lint`, `npm run typecheck` and `npm run build` pass                                                                                  |
| Unit tests           | 140 pass; none added, since this change has no new logic                                                                                      |

Not tested: a screen reader, physical devices, browsers other than Chromium,
the read-only preview deployment, the rate-limited state of the public page
(it needs 60 requests in a minute; its notice was read, not triggered), and
print output.

## Accessibility notes

- Status is never colour alone: every tag and notice has a glyph and a word.
- Verdicts on the public page are announced: `role="status"` for current and
  superseded, `role="alert"` for revoked, integrity failure and not found.
- The receipt's fields are a description list; the receipt heading is a
  second-level heading so each page keeps one first-level heading.
- Wide tables and code blocks scroll inside their own box, can take keyboard
  focus and are named, so the page never scrolls sideways.
- Documentation tables mark column and row headers.

## Screenshots

Desktop is 1440px, mobile is 390px.

| Surface                         | Desktop                                                                            | Mobile                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Evidence, create                | [evidence-create-desktop.png](./evidence-create-desktop.png)                       | [evidence-create-mobile.png](./evidence-create-mobile.png)                       |
| Evidence, mandatory preview     | [evidence-preview-desktop.png](./evidence-preview-desktop.png)                     | [evidence-preview-mobile.png](./evidence-preview-mobile.png)                     |
| Evidence, issued                | [evidence-issued-desktop.png](./evidence-issued-desktop.png)                       | [evidence-issued-mobile.png](./evidence-issued-mobile.png)                       |
| Evidence, revoked               | [evidence-revoked-desktop.png](./evidence-revoked-desktop.png)                     | [evidence-revoked-mobile.png](./evidence-revoked-mobile.png)                     |
| Evidence, integrity failure     | [evidence-integrity-failure-desktop.png](./evidence-integrity-failure-desktop.png) | [evidence-integrity-failure-mobile.png](./evidence-integrity-failure-mobile.png) |
| Public verification, active     | [verify-active-desktop.png](./verify-active-desktop.png)                           | [verify-active-mobile.png](./verify-active-mobile.png)                           |
| Public verification, superseded | [verify-superseded-desktop.png](./verify-superseded-desktop.png)                   | [verify-superseded-mobile.png](./verify-superseded-mobile.png)                   |
| Public verification, revoked    | [verify-revoked-desktop.png](./verify-revoked-desktop.png)                         | [verify-revoked-mobile.png](./verify-revoked-mobile.png)                         |
| Public verification, integrity  | [verify-integrity-failure-desktop.png](./verify-integrity-failure-desktop.png)     | [verify-integrity-failure-mobile.png](./verify-integrity-failure-mobile.png)     |
| Public verification, not found  | [verify-not-found-desktop.png](./verify-not-found-desktop.png)                     | [verify-not-found-mobile.png](./verify-not-found-mobile.png)                     |
| Documentation                   | [docs-overview-desktop.png](./docs-overview-desktop.png)                           | [docs-overview-mobile.png](./docs-overview-mobile.png)                           |
| Documentation, table            | [docs-table-desktop.png](./docs-table-desktop.png)                                 | [docs-table-mobile.png](./docs-table-mobile.png)                                 |
| Documentation, evidence         | [docs-evidence-desktop.png](./docs-evidence-desktop.png)                           | [docs-evidence-mobile.png](./docs-evidence-mobile.png)                           |
| Security                        | [security-desktop.png](./security-desktop.png)                                     | [security-mobile.png](./security-mobile.png)                                     |
| Proof                           | [proof-desktop.png](./proof-desktop.png)                                           | [proof-mobile.png](./proof-mobile.png)                                           |

The records shown are sample data in a local database that existed only for
these checks. No real payment, settlement or evidence was issued.

## Open items

- The documentation header and articles still say "Phase 5" while the content
  describes Phase 6. That is a content statement, so it is left for the owner.
- The public page still shows the receipt content under an integrity-failure
  verdict, as it did before. Hiding it would change what the page discloses,
  so it is left as is and flagged here.
- Native PDF is still not implemented; the page says so.
