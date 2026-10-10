# Product decision: make Private Payables Link the primary workflow

## Recommendation

**GO — Option B, with a deliberately narrow authority model.**

Add Private Payables Link as the primary recipient-facing workflow around the
existing obligation engine. Do not turn it into a bearer claim, wallet or
recipient-triggered payment. The link's defensible job is to bind an intended
counterparty's confirmed shielded destination to the exact controlled business
obligation, then deliver a minimal receipt after independent reconciliation.

This is an extension of Obliq's constitution, not a redesign:

```text
CAPTURE → CONTROL → SETTLE → RECONCILE → PROVE
            ↑ recipient-confirmed destination      ↓ scoped receipt
```

## Options scored

Scores are 1 (weak) to 5 (strong). “Operational cost” is scored for
favorability, so a higher score means lower incremental cost. Weights reflect
the first-product decision rather than company valuation.

| Criterion                  |   Weight | A. Continue unchanged | B. Private Payables Link | C. Settlement/reconciliation API |
| -------------------------- | -------: | --------------------: | -----------------------: | -------------------------------: |
| Customer problem           |      25% |                     3 |                        5 |                                3 |
| Zcash-specific advantage   |      20% |                     4 |                        5 |                                4 |
| Implementation feasibility |      15% |                     5 |                        4 |                                4 |
| Security risk              |      15% |                     4 |                        3 |                                4 |
| Differentiation            |      15% |                     2 |                        5 |                                3 |
| Operational cost           |       5% |                     4 |                        3 |                                5 |
| Demo credibility           |       5% |                     3 |                        5 |                                3 |
| **Weighted score**         | **100%** |              **3.55** |                 **4.45** |                         **3.60** |

### A. Continue unchanged

Lowest delivery risk, but the product remains payer-internal. It lacks a strong
recipient moment and still competes visually with generic finance operations
products. The existing lifecycle is necessary infrastructure, not by itself a
distinctive acquisition workflow.

### B. Add Private Payables Link

Best connection between a real AP problem and Zcash. It makes destination
provenance and post-payment evidence tangible while preserving treasury
control. It also creates a credible demo arc without fabricating settlement.
Security risk is higher because public links, external identity and destination
changes are high-consequence surfaces; the threat model makes those costs
explicit.

### C. Narrow to an API

Technically coherent and cheaper to host, but premature. There is no validated
distribution channel or integration buyer, and an API obscures the human
controls/destination-review experience that differentiates Obliq. Keep clean
internal boundaries so an API can emerge after product-market evidence; do not
pivot before learning from the workflow.

## Why this can be defensible

The link itself is not the moat—ZIP-321 and wallet address sharing already
exist. Defensibility can arise from the accumulated system around it:

- immutable obligation and destination provenance;
- deterministic controls and separation of duties;
- exact version/quote/receiver/memo binding into external signing;
- independently separated UFVK reconciliation;
- idempotent recovery from uncertain execution; and
- selectively disclosed, integrity-protected business evidence.

The product claim should be: **the counterparty, finance team, treasury signer
and observer all act on the same exact payable without any one component
gaining unrestricted treasury authority.** That is harder to reproduce than a
QR code, but remains an execution advantage to prove—not an established moat.

## Features explicitly rejected from the first slice

- bearer claims, escrowed links and recipient-triggered payment;
- wallet custody, embedded signing, automatic broadcast or autonomous AI;
- smart contracts, cross-chain mechanisms or Starknet ports;
- automated refunds or dispute adjudication;
- payroll, grants, marketplace, chat and broad vendor portal;
- arbitrary accounting integrations and multi-currency/live quote expansion;
- wallet ownership claims unsupported by an actual proof;
- public transaction explorer UX; and
- ZK-business-proof marketing.

## Minimal vertical-slice plan

1. Validate the problem with 12–15 evidence-based interviews and obtain three
   supervised-pilot commitments.
2. Write an ADR for recipient identity, invitation token lifecycle and the new
   `RECIPIENT_CONFIRMED` assurance state.
3. Implement one regtest-only invitation path for a persisted obligation:
   pre-existing contact + second factor + shielded UA + immutable destination
   version.
4. Prove cross-tenant denial, expiry, replay resistance, destination-change
   invalidation and safe link-preview behavior.
5. Run the existing Phase 2–5 path unchanged: fresh controls/approvals, exact
   intent, external Zallet human review, UFVK observation and minimal evidence.
6. Conduct an adversarial review and an external usability test with a finance
   operator, signer and recipient.
7. Only under separate owner approval, complete the already-defined funded
   public-testnet ceremony. Do not conflate this with customer validation.

## Go/no-go acceptance gates

The workflow may become the primary product only if:

- customer interviews meet the validation gates in
  [CUSTOMER_PROBLEM.md](./CUSTOMER_PROBLEM.md);
- a stolen link alone cannot change destination or authorize money movement;
- a confirmed destination version is enforced by policy/readiness and bound to
  the exact settlement intent;
- stale approvals/intents fail under every material change;
- the external signer remains the only spending authority;
- the UFVK observer independently reconciles the exact public-testnet payment;
- the recipient sees only deliberately disclosed evidence; and
- operational cost and support time fit a plausible pilot price.

If recipient authentication or external Zallet operation makes the workflow
too burdensome, do not weaken controls. Reassess Option C for a small number of
integrators with their own identity/signer operations.

## Evidence boundary

This GO is a product/research recommendation, not authorization to implement,
provision infrastructure or conduct a funded transaction. Public testnet is
still `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`; mainnet and production operations
are blocked. The commercial case remains unvalidated until interviews and a
paid or contractually committed pilot occur.

## Owner review questions

1. Approve or reject `RECIPIENT_CONFIRMED` as a distinct, non-cryptographic
   destination assurance state.
2. Choose the initial identity assurance target: verified contact only, or
   verified contact plus mandatory finance callback for every destination.
3. Approve customer discovery before implementation.
4. Decide whether the first slice remains regtest-only until Issue #5's funded
   public-testnet ceremony is independently complete.
