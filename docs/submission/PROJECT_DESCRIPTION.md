# Obliq project description

## One sentence

Obliq is private accounts-payable software that binds vendor bills, deterministic controls, human approvals, external Zcash signing, read-only reconciliation, and selectively disclosed receipts into one financial record.

## Short description

Crypto businesses should not have to publish who they pay. Obliq helps finance teams manage vendor and contractor bills, confirm shielded destinations, enforce approvals, settle through an external Zcash signer, independently reconcile with read-only authority, and issue minimal evidence—without giving the application control of treasury funds.

## Founder description

Crypto-native organizations often run accounts payable across email, spreadsheets, chat, treasury tools, and wallets. The finance operator understands the invoice. An approver understands the business policy. A treasury signer controls the funds. An accountant needs evidence afterward. Today, those people frequently work from different records, while a transparent payment can expose the counterparty, value, cadence, and treasury graph to the public.

Obliq gives them one canonical object: the **Obligation**.

A finance operator captures a vendor or contractor bill and its source. Obliq checks exact-money fields and duplicates, applies deterministic versioned policy, and collects eligible human approvals with separation of duties. The vendor receives a Private Payables Link scoped to that obligation, verifies access to the recorded email channel, and confirms an Orchard-capable Unified Address. That address remains unverified until a different authorized finance reviewer accepts it.

Once the exact obligation version is ready, Obliq creates an immutable settlement intent and ZIP-321 payment request. A human-operated external Zallet environment—not the web application—reviews and signs the shielded transaction. A separate UFVK-only observer detects the output, matches its amount and opaque reference, tracks confirmations, and reconciles it to the obligation. An authorized issuer can then share an immutable receipt containing only the fields the recipient or accountant is permitted to see.

This separation is the product. Business approval does not become a blockchain signature. Read access does not become spending access. A payment link does not become payment authority. A receipt does not reveal the rest of the treasury.

## Why Zcash matters

Zcash is not a decorative integration in Obliq. Its shielded pool supplies the privacy property the product is organized around: vendor, amount, and payment cadence do not need to be published as transparent chain data.

Obliq uses Zcash-specific primitives deliberately:

- Unified Addresses and shielded receivers;
- ZIP-321 payment requests;
- `FullPrivacy` transaction-policy review;
- PCZT-based external Zallet authorization in the proven regtest path;
- opaque shielded memos for business correlation; and
- Unified Full Viewing Key observation without spending authority.

There is no transparent fallback presented as private.

## What is different

A wallet can make a private payment, but it does not know whether the invoice is duplicated, whether the destination changed after approval, or which business record the payment closes. A generic payment link can collect an address, but it does not provide separation of duties, immutable destination provenance, independent reconciliation, or selective post-payment evidence.

Obliq connects four parties to the same exact payable:

1. the vendor confirms where it expects to receive funds;
2. finance confirms the business record and policy;
3. treasury independently authorizes the exact transaction; and
4. the observer independently confirms what the chain shows.

No one of those components gains every authority.

## Initial customer and wedge

The initial user is a small crypto-native organization that pays recurring vendors or contractors from a self-controlled treasury and considers public counterparty, amount, or cadence disclosure material. Likely users include finance/operations leads, treasury signers, vendors, contractors, accountants, and auditors.

The wedge is vendor and contractor accounts payable. The longer-term category is private financial operations.

This customer thesis is not validated traction. Obliq has no claimed customers, revenue, or production volume. The next commercial gate is structured interviews and supervised pilots with organizations that have recently made privacy-sensitive crypto payments.

## Current evidence and limitations

The complete lifecycle was demonstrated using a real shielded transaction on isolated Z3 regtest. The external Zallet signer paid 25,000,000 zatoshis through Ironwood; the UFVK-only observer detected it, recorded confirmation progression, correlated it to an obligation, and settled the canonical record. This proves the architecture, not public-network readiness.

On public testnet, Obliq has demonstrated correct chain identity, current Ironwood subtree data, a synchronized UFVK-only observer, and no observer spending authority. A funded shielded public-testnet settlement has not been demonstrated. Current Zallet/NU7 signer compatibility remains an operational qualification blocker, and mainnet is blocked.

The Private Payables Link has passed an isolated browser ceremony with migrated PostgreSQL, separate finance and Treasury identities, the real address inspector, and a loopback memory-only mail sink. Production email delivery remains unverified. The AI extraction provider is a labelled development fixture. Live pricing and native PDF receipts remain planned.

## Business direction

Obliq should earn adoption first through a supervised private-payables workflow, then charge organizations for controlled seats, policy and evidence workflows, and privacy-sensitive operational infrastructure. Pricing, willingness to pay, and onboarding tolerance remain customer-discovery questions—not established facts.

## Suggested submission fields

- **Name:** Obliq
- **Category:** Private financial operations / accounts payable
- **Tagline:** Pay your business bills without publishing your business.
- **Repository:** https://github.com/Alike001/obliq
- **Public preview:** https://obliq-7xh9.onrender.com
- **Preview limitation:** Read-only presentation surface; authenticated product and financial mutations are deliberately disabled.
