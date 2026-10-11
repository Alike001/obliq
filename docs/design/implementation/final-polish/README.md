# Product experience: demo walkthrough and screenshots

The landing page, the finance workspace, the proof page and the recipient page
in the Obliq design, checked at phone and desktop widths. This work changed
layout, wording, states and the presentation of existing evidence. It did not
change the backend, the address inspector, authorization, or anything that
signs or pays, and it adds no payment record or status that is not real.

## Demo walkthrough

About three minutes. Each step names the screenshot that shows it.

| Step | Where                    | What to show                                                                                                                   | Screenshot |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1    | `/`                      | The problem, who Obliq is for and how it works, in the first paragraph. The banner says settlement is verified on regtest only | 01         |
| 2    | `/` , "How a bill moves" | One bill, five steps, three authorities. Settle and Reconcile are hatched: proven on regtest, not on a public network          | 02         |
| 3    | `/app`                   | The workspace overview: what needs a person next                                                                               | 04         |
| 4    | `/app/obligations`       | The bills. On a phone each row is a labelled block, nothing scrolls sideways                                                   | 05         |
| 5    | An obligation record     | Amount, vendor, next step, controls and approvals. An approval is business authorization only                                  | 06         |
| 6    | Same record, lower down  | The private payables link: email the vendor's contact a one-time link. The panel says what a link does and does not prove      | 07         |
| 7    | `/payables/invitation`   | What the vendor contact sees: verify email, enter one shielded address, see the result. Same design, no workspace access       | 13         |
| 8    | The vendor record        | The submitted address arrives Unverified. Someone other than the sender must review it before anything can settle              | 08         |
| 9    | `/app/approvals`         | What is waiting on an approver                                                                                                 | 09         |
| 10   | `/app/policies`          | The rules behind the approvals, with immutable versions                                                                        | 10         |
| 11   | `/app/settlements`       | Settlement starts only from an approved, ready obligation. Obliq never holds the signer                                        | 11         |
| 12   | `/app/evidence`          | Evidence is issued only for a settled, observed payment                                                                        | 12         |
| 13   | `/proof`                 | What is proven and where. Public testnet and mainnet are shown as blocked or not verified                                      | 14, 03     |
| 14   | `/proof`, lower down     | The one real settlement, step by step: intent, external signature, broadcast, read-only observation, settled. Regtest only     | 17         |
| 15   | `/docs/vendors`          | The private payables link in the documentation, with its limits                                                                | 15         |

Things to say out loud, because they are easy to overstate:

- Shielded settlement is verified on regtest, an isolated test network. No
  public-testnet or mainnet settlement has been verified.
- The email check on a private payables link shows that someone could read the
  contact's mailbox. It is not proof of who controls the wallet.
- Sending a link needs a mail adapter supplied by the operator. Without one the
  send is refused.
- The local demo data has no settled payment, so steps 11 and 12 show their
  empty states. The settled payment in step 14 is the recorded regtest run, not
  a record in this workspace.
- A regtest transaction exists only on the machine that ran it. It cannot be
  looked up in a public block explorer.
- Ledger and Settings are planned and say so. They are not hidden.

## Screenshots

Every screen has a `-desktop.png` (1440 wide) and a `-mobile.png` (390 wide,
captured at 2x). All 36 were retaken after the last code change.

| File                        | Screen                                           |
| --------------------------- | ------------------------------------------------ |
| `01-landing`                | Landing page, top                                |
| `02-landing-lifecycle`      | Landing page, how a bill moves                   |
| `03-landing-proof`          | Landing page, what is proven and where           |
| `04-overview`               | Workspace overview                               |
| `05-obligations`            | Obligations list                                 |
| `06-obligation-record`      | Obligation record                                |
| `07-private-payables-panel` | Private payables link panel on the record        |
| `08-vendor-record`          | Vendor record with destination history           |
| `09-approvals`              | Approvals                                        |
| `10-policies`               | Payment policy                                   |
| `11-settlements-empty`      | Settlements, empty state                         |
| `12-evidence-empty`         | Evidence, empty state                            |
| `13-recipient-entry`        | Recipient page opened without an invitation link |
| `14-proof`                  | What is proven                                   |
| `15-docs-private-payables`  | Documentation, private payables link             |
| `16-not-found`              | Page not found                                   |
| `17-proof-settlement`       | The regtest settlement, step by step             |
| `18-planned-section`        | A planned section (Ledger)                       |

## What changed in the product experience pass

Landing page:

- The first paragraph now states the problem before the product: on a public
  blockchain every payment shows who you pay, how much and how often. It then
  names who Obliq is for and how a bill moves.
- "What a transparent payment reveals" says what each exposure costs a
  business, not only what is visible.

Proof page:

- A new section follows the one end-to-end regtest settlement in the order it
  happened, with the full intent hash and transaction ID, who held spending
  authority at each step, and the software used. Every value is read from the
  recorded evidence already in the repository.
- The same section says what the run does not show: public synchronization, a
  funded public payment, or mainnet.
- It replaces three small cards that held the same facts with truncated hashes.
- The introduction is worded from the enforced network status, like the rest of
  the page, and a loading state covers the page's database checks.

Workspace:

- Plain words in place of internal ones: the overview, obligations, vendors,
  approvals and obligation record no longer say "persisted", "server-validated
  role", "seeded" or "Phase 4".
- Approvals shows "Finance · 0 of 1 given" in place of "FINANCE · 0/1".
- A planned section says it is planned and not built, in one sentence.
- The "Planned" tag is readable on the selected navigation item.
- The side navigation footer names the network and says its coins have no
  value, in place of an internal phase label.

Security and documentation pages no longer describe the product by internal
phase numbers in their headers.

## What changed in the first polish pass

- Lists of obligations, vendors and approvals become one labelled block per row
  on a phone.
- A long reference, legal name or purpose wraps inside its card.
- On wider screens the same lists keep a gutter between columns, and an
  amount, a date or a state stays on one line.
- The phone tab row keeps the current section in view. Tabs, documentation
  menus and back links are at least 44px tall.
- Form fields in the workspace use 16px text on a phone, so iOS does not zoom
  the page when a field takes focus.
- Site-wide error and not-found pages.
- A skip link on the evidence verification page, and a page title on every
  workspace, proof, security and verification page.
- The landing page says what Obliq does in plainer words and lists the private
  payables link.
- On the proof page, public-network settlement is worded from the enforced
  network status instead of a fixed line.
- The documentation describes the private payables link and its limits.

## Checked

On 24 routes at 360px, 390px, 768px and 1440px (96 page views), covering the
landing page, proof, security, documentation, the recipient page, every
workspace list, record page, form and planned section:

- no page scrolls sideways and nothing runs off the screen
- every button, link and field is at least 44px tall on a phone
- every field has a label
- every page has one main heading and a title
- no page raises a script error

A crawl of every internal link from the public pages and the workspace reached
51 pages. None was broken, and every in-page anchor exists.

The settlement record (awaiting signature, signed and settled), the evidence
page, the evidence preview, the issued evidence record and the public
verification page were checked the same way, and at 1280px, against a separate
throwaway database holding one settled regtest-shaped payment. That database
was removed afterwards. No real settlement was run for this check.

## Remaining issues

- A workspace address that matches no record shows the right "not found"
  message, but the browser tab keeps the section's title.
- The documentation articles still refer to internal phase numbers in their
  body text. They are the project's own history and were left as written.
- The workspace has one loading skeleton for every page. It is not shaped to
  each page.
- The demo data has no settled payment, so the settlement record and issued
  evidence are not in the screenshots. Adding one would mean inventing a
  payment record.
- Dates are formatted by the server's locale, not the viewer's.
