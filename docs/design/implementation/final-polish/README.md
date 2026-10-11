# Final frontend polish: walkthrough and screenshots

The finance workspace and the recipient page in the Obliq design, checked at
phone and desktop widths. This pass changed layout, wording and states only. It
did not change the recipient flow's logic, the address inspector, the backend,
or anything that signs or pays.

## Demo walkthrough

About three minutes. Each step names the screenshot that shows it.

| Step | Where                    | What to show                                                                                                              | Screenshot |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1    | `/`                      | Who Obliq is for and what it does, in one sentence. The banner under it says settlement is verified on regtest only       | 01         |
| 2    | `/` , "How a bill moves" | One bill, five steps, three authorities. Settle and Reconcile are hatched: proven on regtest, not on a public network     | 02         |
| 3    | `/app`                   | The workspace overview: what needs a person next                                                                          | 04         |
| 4    | `/app/obligations`       | The bills. On a phone each row is a labelled block, nothing scrolls sideways                                              | 05         |
| 5    | An obligation record     | Amount, vendor, next step, controls and approvals. An approval is business authorization only                             | 06         |
| 6    | Same record, lower down  | The private payables link: email the vendor's contact a one-time link. The panel says what a link does and does not prove | 07         |
| 7    | `/payables/invitation`   | What the vendor contact sees: verify email, enter one shielded address, see the result. Same design, no workspace access  | 13         |
| 8    | The vendor record        | The submitted address arrives Unverified. Someone other than the sender must review it before anything can settle         | 08         |
| 9    | `/app/approvals`         | What is waiting on an approver                                                                                            | 09         |
| 10   | `/app/policies`          | The rules behind the approvals, with immutable versions                                                                   | 10         |
| 11   | `/app/settlements`       | Settlement starts only from an approved, ready obligation. Obliq never holds the signer                                   | 11         |
| 12   | `/app/evidence`          | Evidence is issued only for a settled, observed payment                                                                   | 12         |
| 13   | `/proof`                 | What is proven and where. Public testnet and mainnet are shown as blocked or not verified                                 | 14, 03     |
| 14   | `/docs/vendors`          | The private payables link in the documentation, with its limits                                                           | 15         |

Things to say out loud, because they are easy to overstate:

- Shielded settlement is verified on regtest, an isolated test network. No
  public-testnet or mainnet settlement has been verified.
- The email check on a private payables link shows that someone could read the
  contact's mailbox. It is not proof of who controls the wallet.
- Sending a link needs a mail adapter supplied by the operator. Without one the
  send is refused.
- The local demo data has no settled payment, so steps 11 and 12 show their
  empty states.

## Screenshots

Every screen has a `-desktop.png` (1440 wide) and a `-mobile.png` (390 wide,
captured at 2x). All 32 were retaken after the last code change in this pass.

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

## What changed

- Lists of obligations, vendors and approvals become one labelled block per row
  on a phone.
- A long reference, legal name or purpose wraps inside its card.
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

At 360px and 390px wide, on twenty routes covering the workspace lists, record
pages, forms, the recipient page, proof, security, documentation and the
landing page:

- no page scrolls sideways and nothing runs off the screen
- every button, link and field is at least 44px tall
- every field has a label
- every page has one main heading

The settlement record (awaiting signature, signed and settled), the evidence
page, the evidence preview, the issued evidence record and the public
verification page were checked the same way, and at 1280px, against a separate
throwaway database holding one settled regtest-shaped payment. That database
was removed afterwards. No real settlement was run for this check.

Known and left alone: a workspace address that matches no record shows the
right "not found" message, but the browser tab keeps the section's title.
