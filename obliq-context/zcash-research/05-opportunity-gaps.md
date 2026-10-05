# Five Startup Opportunity Gaps

These are research candidates, not final product decisions.

## Gap 1: Private Business Finance Operations

Problem: Receiving shielded ZEC is becoming easier, but a business still
needs invoices, reconciliation, categorization, permissions, books,
reporting, treasury controls, and selective disclosure.

Product direction: A private finance operating system for businesses
using shielded money.

Possible product surface: - business workspace - private
invoices/payment requests - automatic payment matching -
counterparty/reference metadata - payable and receivable workflows -
private ledger - role-based read access - accountant/auditor exports -
selected-payment disclosure - treasury approvals - recurring/batch
payouts - audit trail of who was granted disclosure access

Why Zcash: Public chains expose business cash flow, counterparties and
treasury behavior. Zcash can keep operations private while enabling
deliberate disclosure.

Business model: SaaS per organization, usage-based
payment/reconciliation fees, higher tiers for treasury/audit controls.

Risk: Accounting alone has hackathon prior art. The startup needs to own
the larger operational-finance workflow, not merely export CSV from a
viewing key.

## Gap 2: Private B2B Settlement Network

Problem: Businesses may want to pay suppliers, contractors or partners
without publicly exposing vendor relationships, transaction sizes,
treasury balances or commercial cadence.

Product direction: Private accounts payable/receivable and settlement
network built around shielded ZEC.

Possible product surface: - supplier directory - invoices - payment
requests - approval policies - scheduled settlement - batch payouts -
proof of payment - optional designated disclosure - reconciliation -
treasury dashboard

Why Zcash: Commercial privacy is a direct fit for shielded payments.

Business model: B2B SaaS plus settlement fee.

Risk: ZEC price volatility may be a business obstacle. The product
thesis needs a clear policy for denomination, conversion, treasury
exposure, or target users who already hold/use ZEC.

## Gap 3: Programmable Selective Disclosure Layer

Problem: Privacy products often force an ugly choice between public data
and total secrecy. Businesses need to disclose specific financial facts
to specific people for specific periods without handing over spending
power.

Product direction: Permissioned disclosure and financial evidence
infrastructure for Zcash applications.

Possible capabilities: - scoped viewing access - time-bounded data
rooms - selected transaction receipts - accountant/auditor roles - proof
packages - access logs - revocation/rotation model where technically
possible - APIs for other Zcash businesses

Why Zcash: Viewing authority and shielded transaction data make
selective disclosure a native design space.

Business model: Developer/API platform plus enterprise plans.

Risk: Must be precise about what Zcash viewing keys can and cannot
cryptographically restrict. Do not promise arbitrary scope or revocation
that the underlying key type cannot enforce.

## Gap 4: Private Payout and Contractor Operations

Problem: Organizations paying many contributors leak compensation,
wallet relationships and treasury activity on transparent rails.
Collecting addresses, matching payouts and handling failures is
operationally messy.

Product direction: Private payroll-like and contractor payout operations
for crypto-native organizations.

Possible capabilities: - recipient onboarding - reusable private payment
identity - batch payout planning - approval workflow - encrypted
remittance detail - payout status - retries/recovery - downloadable
recipient statements - treasury reconciliation - selective accounting
visibility

Why Zcash: Shielded payouts directly protect compensation and recipient
relationships.

Business model: organization subscription plus payout fee.

Risk: "shielded payouts" is already a known ecosystem need and had prior
hackathon success. We need a larger operational wedge and excellent UX,
not a batch-send page.

## Gap 5: Privacy-Preserving Commerce Operations

Problem: Checkout is only one small part of commerce. Merchants need
orders, refunds, receipts, fulfillment, reconciliation, customer support
and accounting without building a surveillance database.

Product direction: Commerce back office where payment and order linkage
can remain private by default.

Possible capabilities: - payment requests - unique order receivers -
private order references - payment monitoring - refunds - receipts -
merchant reconciliation - support proofs - selective business
reporting - plugins/API

Why Zcash: Shielded payment + encrypted metadata + selective viewing can
reduce unnecessary financial surveillance.

Business model: merchant SaaS and transaction fees.

Risk: CipherPay and POS projects cover checkout. The differentiation
must be the operational layer after checkout or a specific high-value
commerce segment.

# Current research preference

The strongest cluster is not one isolated feature. It is:

PRIVATE BUSINESS MONEY OPERATIONS

A product could combine the strongest parts of gaps 1, 2, 3 and 4 into
one coherent company: - get paid privately - know what the payment is
for - reconcile it - manage payables - approve and pay privately - prove
selected facts when necessary - keep public observers out of the
company's financial graph

This is broad enough for a startup while still having a sharp first
customer and core loop.

Do not commit to this until we validate: - exact technical feasibility
of selective disclosure - current competing accounting products -
ZEC-denomination/volatility assumptions - wallet integration model -
Colosseum track requirements and judging - user segment with urgent
demand
