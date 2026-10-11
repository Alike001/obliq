# Phase 6C feature-preservation audit

Date: 2026-10-11  
Comparison: `origin/main` at `0bcadecf` to PR #23  
Verdict: **PASS** — the integration adds the Private Payables Link surfaces and
hardens address inspection without removing an implemented product capability.

## Evidence reviewed

- `Obliq_Master_Context.docx`, the lifecycle and security invariants, and the
  repository implementation-status vocabulary;
- the Private Payables Link product specification, Phase 6B implementation
  contract, ADR 0012, acceptance matrix and backend/frontend boundary docs;
- the complete `origin/main...HEAD` diff, exported routes, repository modules,
  database schema/migrations, and relevant automated tests; and
- the pinned Xenia, Erebus and Stake Wars research and license assessment.

The comparison contains no deleted files and no migration changes. It does not
remove or replace the policy, approval, settlement, reconciliation, evidence,
observer or audit implementations. The only Zcash adapter change adds a
read-only address-inspection command with sanitized failure classes and a
bounded process timeout; observer and external-signer authority are unchanged.

## Capability inventory

Status describes usable repository behavior, not deployment or public-network
proof. `IMPLEMENTED` does not by itself mean public Zcash verification.

| Product capability                                                                              | Status      | Preservation evidence / boundary                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organization identity, membership and server-side capabilities                                  | IMPLEMENTED | Existing OIDC/session and repository authorization paths are unchanged. Production provider configuration is still operational work.                                                    |
| Tenant-scoped vendors and immutable destination versions                                        | IMPLEMENTED | Existing vendor repository remains canonical; recipient confirmation appends an `UNVERIFIED` destination rather than overwriting history.                                               |
| Manual obligation and invoice-source capture                                                    | IMPLEMENTED | Existing obligation, upload and storage paths are unchanged.                                                                                                                            |
| Schema-validated extraction suggestions                                                         | SEEDED      | The labelled development fixture remains; no live AI provider or autonomous authority was added.                                                                                        |
| Exact integer money and deterministic duplicate checks                                          | IMPLEMENTED | Domain/repository behavior and tests are unchanged.                                                                                                                                     |
| Versioned policy decisions and structured control findings                                      | IMPLEMENTED | No policy-engine files are removed or weakened.                                                                                                                                         |
| Role-authorized approvals, separation of duties and stale-approval invalidation                 | IMPLEMENTED | Existing control repository remains canonical; a recipient destination change invokes its shared invalidation boundary.                                                                 |
| Explainable `READY_TO_SETTLE` evaluation                                                        | IMPLEMENTED | Recipient confirmation cannot advance readiness and the unverified destination remains blocking.                                                                                        |
| Quotes, immutable settlement intents, ZIP-321 and execution idempotency                         | IMPLEMENTED | Available for the controlled regtest path; live pricing remains `PLANNED`. No settlement repository behavior is removed.                                                                |
| External Zallet PCZT review/signing and shielded broadcast                                      | IMPLEMENTED | Demonstrated only on isolated regtest. Spending authority remains external; no signer method is exposed to recipients or the web backend.                                               |
| UFVK-only observation, confirmation progression and reconciliation                              | IMPLEMENTED | Regtest end-to-end evidence exists; public-testnet read-only synchronization evidence is separate from a funded settlement. Observer code and reconciliation persistence are preserved. |
| Funded public-testnet shielded settlement                                                       | BLOCKED     | Current classification remains `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`; no funded public output has been observed and no `PUBLIC_NETWORK_VERIFIED` claim is made.                        |
| Mainnet settlement readiness                                                                    | BLOCKED     | Requires the public qualification gate and production infrastructure. Transparent fallback remains unavailable.                                                                         |
| Settlement ledger accounting entries                                                            | PLANNED     | The obligation remains the business object; no ledger settlement capability is claimed.                                                                                                 |
| Immutable audit hash chain                                                                      | IMPLEMENTED | Recipient events extend the existing chain without rewriting prior events. Independent external anchoring remains `PLANNED`.                                                            |
| Controlled evidence preview, issuance, JSON artifact, verification, revocation and supersession | IMPLEMENTED | Evidence repositories and routes are unchanged. Issuance still requires canonical observer-confirmed settlement and an authorized internal action.                                      |
| Native PDF and zero-knowledge business proof                                                    | PLANNED     | Printable canonical receipts exist; native PDF and arbitrary ZK business assertions are not claimed.                                                                                    |
| Finance-issued/revoked 24-hour recipient invitations                                            | IMPLEMENTED | Current status comes from the tenant-scoped invitation repository, not audit-history inference.                                                                                         |
| Email contact challenge and 30-minute scoped recipient session                                  | IMPLEMENTED | API/session boundary is implemented; production mail delivery requires configured external infrastructure. Email control is explicitly not identity or wallet ownership proof.          |
| Fragment-only invitation entry and recipient disclosure minimization                            | IMPLEMENTED | The browser removes the fragment immediately and keeps the token in memory; recipient reads remain bound to one invitation/obligation.                                                  |
| Orchard-capable Unified Address inspection                                                      | IMPLEMENTED | Confirmed invalid input maps to 422; process failure, malformed output and timeout map to sanitized 503. This is address-shape/network evidence, not ownership proof.                   |
| Atomic one-time destination confirmation and uncertain-response recovery                        | IMPLEMENTED | The receiver and idempotency key remain bound until an API-grounded result; conflicting retries cannot create another destination.                                                      |
| Independent finance review after recipient confirmation                                         | IMPLEMENTED | Recipient output remains `RECIPIENT_CONFIRMED` / `UNVERIFIED`; an eligible different internal actor must perform manual verification.                                                   |
| Recipient approval, signing, broadcasting or evidence issuance authority                        | UNAVAILABLE | Intentionally absent by architecture. Recipient routes cannot exercise organization or treasury authority.                                                                              |
| Zcash address-ownership proof                                                                   | UNAVAILABLE | Neither email verification nor address parsing proves control of a wallet.                                                                                                              |
| Automatic recipient evidence release                                                            | UNAVAILABLE | A separate authorized internal issue action after confirmed settlement is required.                                                                                                     |
| FROST, embedded custody, transparent fallback and autonomous AI payments                        | UNAVAILABLE | Out of scope and absent; PR #23 adds none of these authorities.                                                                                                                         |
| Read-only Render preview                                                                        | IMPLEMENTED | Preview route denials remain fail-closed, including the recipient route; runtime public-network status remains `PUBLIC_NETWORK_BLOCKED`.                                                |

## Reference-pattern preservation

The implementation retains attributed architectural lessons from the three
STRK20 research references without porting their contracts or products:

- **Xenia:** explicit invitation expiry, one-time consumption, domain-separated
  token hashing and exact-subject binding appear in the recipient workflow.
  Obliq did not import Xenia's Cairo escrow, link private key, STRK20 phases,
  fee sponsorship, open notes or claim/refund mechanism.
- **Erebus:** durable idempotency keys, reconcile-before-retry behavior,
  explicit uncertain-result recovery and narrowly scoped disclosure appear in
  destination confirmation. Obliq did not import channel keys, salt lanes,
  nullifiers, Starknet proving or autonomous agent authority.
- **Stake Wars:** unprivileged automation, immutable historical state and
  preserving an already signed/broadcast settlement while recording a
  destination change appear in the invalidation design. Obliq did not import
  auction/game contracts, keeper transactions, Whisper capsules or winner
  logic.

No source code from those repositories is incorporated. Their pinned research
revisions and MIT/Apache-2.0 obligations remain documented in
`docs/research/private-payables/`.

## Residual gaps and decision

The product still needs real provider deployment, live email delivery, the
owner-approved funded public-testnet ceremony and later mainnet qualification.
Those are existing operational or protocol gates, not regressions introduced
by PR #23. The integration is suitable for merge once its required CI checks
pass and owner review confirms the documented boundaries.
