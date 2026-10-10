# Customer problem and validation plan

## Research conclusion

Private Payables Link addresses a coherent workflow gap, but demand is still a
hypothesis. The target is not every small business and not every crypto user. It
is a crypto-native organization that already pays real vendors or contractors
from self-controlled treasury, considers counterparty/amount/cadence disclosure
material, and needs more control than a wallet transfer provides.

## Likely users and jobs

| Actor                   | Job                                                                                               | Current pain hypothesis                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finance/operations lead | Capture a bill, validate vendor details, obtain approvals, schedule payment and close the record. | Invoice, chat, spreadsheet, treasury proposal and accounting evidence are disconnected. Destination changes are hard to distinguish from fraud.               |
| Treasury signer         | Decide whether an exact transaction matches the authorized business payment.                      | Wallets show chain fields but not always the canonical invoice, policy decision, destination provenance and stale-approval status together.                   |
| Vendor or contractor    | Safely provide a shielded destination and know which invoice was settled.                         | Sending an address over email/chat is easy but weakly bound to identity and invoice context; a shielded transaction is not self-describing business evidence. |
| Accountant/auditor      | Reconcile a private payment without learning the whole treasury history.                          | Public explorers are insufficient for shielded outputs, while broad viewing authority discloses too much.                                                     |

These are proposed segments. Repository code and competitor pages do not prove
frequency, urgency, willingness to pay or acceptable onboarding friction.

## Current workflow and alternatives

A typical candidate flow is: invoice by email/PDF; vendor and address copied
into a spreadsheet or AP tool; approval in chat or a treasury product; wallet
transaction prepared and signed; transaction hash copied back; accountant
matches it manually. Some teams can instead use a mature AP platform.

[Request Finance](https://www.requestfinance.com/products/accounts-payable)
advertises invoice upload/email intake, OCR, vendor records, configurable
approvals, stablecoin/bank payment, accounting sync and audit-ready records.
[Ramp](https://support.ramp.com/bill-pay-approvals/) supports amount/vendor/entity
routing, separation of duties and a payment-release gate after bill approval.
[Safe](https://safe.global/wallet) provides self-custodial proposals, signer
approval and execution for on-chain treasury operations. These products validate
that the workflow categories exist; their marketing and customer stories do not
prove an unmet market for Zcash privacy.

The cheapest alternative is still email/spreadsheet plus an existing Zcash
wallet. ZIP-321 already represents address, amount and optional shielded memo so
a wallet can construct a requested transaction with human approval. Therefore,
“send a private payment link” alone is not a product moat.

## Why privacy could matter

For a crypto-native company, transparent settlement may expose a counterparty
relationship, amount, payment cadence and treasury graph to competitors,
employees, vendors and analysts. Shielded Zcash can hide transaction details
from public chain observers, but privacy is conditional:

- the company and recipient know their own relationship;
- the UFVK observer can learn the account's incoming/outgoing shielded activity;
- email, invitations, access logs, timing, amounts and endpoint operators create
  off-chain metadata;
- evidence recipients learn every deliberately disclosed claim; and
- a compromised recipient mailbox or link can expose or alter workflow data.

The value proposition is consequently operational privacy with controlled
disclosure—not invisibility.

## What Obliq adds beyond ZIP-321

ZIP-321 is a payment request, not an accounts-payable authorization protocol.
Obliq can add:

1. a canonical, tenant-scoped obligation and source document;
2. deterministic duplicate and completeness checks;
3. immutable policies, human approvals and separation of duties;
4. a recipient-confirmed destination version with explicit provenance;
5. an exact, expiring settlement intent reviewed by an external signer;
6. UFVK-only independent observation and idempotent reconciliation; and
7. a minimal, revocable evidence receipt derived from the settled record.

The proposed link is valuable only as the recipient-side bridge into that
controlled lifecycle. It must not be marketed as a novel payment rail.

## Strongest competition

- **Workflow incumbent:** Request Finance. It is closest on crypto-native AP,
  vendor-supplied wallet details, approvals, reconciliation and records.
- **Operational incumbent:** Ramp/Brex. They set expectations for excellent
  capture, roles, vendor onboarding, approval and failure-state UX.
- **Treasury incumbent:** Safe. It has strong organizational self-custody and
  signing workflows across public smart-contract networks.
- **Do-it-yourself substitute:** wallet + ZIP-321 + spreadsheet/chat.
- **Payment processor substitute:** BitPay and similar processors where custody,
  KYB, supported jurisdictions and transparent/non-Zcash rails are acceptable.

Obliq should not compete on generic OCR, broad multi-rail payout coverage,
cards, banking, payroll or accounting integrations in the first workflow.

## Customer interviews required

Recruit 12–15 interviews across at least four finance operators, four treasury
signers and four recurring vendors/contractors. At least half should have sent
or received crypto invoices in the prior 90 days. Ask for a walkthrough of the
last real payment rather than reactions to a pitch.

Validate:

- monthly vendor/contractor payment count and values;
- current tools and exact handoffs;
- whether public counterparty, amount or cadence exposure has caused a concrete
  restriction, incident or avoided transaction;
- who owns destination verification and how changes are authenticated;
- which errors/duplicates have occurred and their cost;
- signer review requirements and willingness to run external Zallet;
- whether vendors will open an authenticated link and use Zcash;
- evidence fields accountants/vendors actually need;
- acceptable confirmation time, support burden and pricing; and
- regulatory/accounting requirements by jurisdiction, to be reviewed by
  qualified counsel/accountants rather than inferred here.

### Validation gates

Proceed beyond a vertical slice only if:

- at least five qualified organizations report a recurring privacy-sensitive AP
  workflow, not merely general interest in Zcash;
- at least three will run a supervised pilot with a real recurring vendor;
- recipients accept the destination-confirmation ceremony;
- finance and treasury users value the obligation-to-receipt chain over simply
  sharing a UA; and
- one organization will pay or sign a scoped pilot agreement after the public
  testnet architecture is independently qualified.

Failure to meet these gates means narrow the product or segment; it must not be
papered over with demo traffic.

## Open questions

- Is confidentiality required often enough to justify ZEC price and wallet
  friction versus stablecoins or bank rails?
- Does the payer or vendor bear ZEC acquisition/accounting complexity?
- Will a vendor accept a Zcash receipt without transaction-level public proof?
- Is verified email plus secondary confirmation sufficient for destination
  changes, or do customers require contractual/KYB identity?
- Which currencies require live quotes first, and who accepts quote slippage?
- What retention and deletion rules apply to invoices and recipient identity?

## Acceptance criteria for problem validation

The problem is validated only by recorded, consented interview evidence and a
pilot commitment. Repository completeness, a polished link, public-testnet
success, grant interest and hackathon judging do not count as customer demand.
