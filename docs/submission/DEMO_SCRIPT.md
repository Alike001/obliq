# Obliq technical product-demo script

Target length: **2:40–2:58**; Colosseum limits this product-demo video to three minutes. Record locally against fixture-only PostgreSQL. Use the public preview only for public pages. Do not attempt a wallet ceremony during the recording.

This video demonstrates implemented product behavior and technical boundaries. The separate [founder presentation](./PITCH_SCRIPT.md) covers the customer, team, business model, and go-to-market plan.

The screen names below match the [final PR #27 walkthrough](../design/implementation/final-polish/README.md) now merged into `main`.

## Presenter setup

- Keep one finance workspace tab on a real persisted fixture obligation.
- Keep one recipient tab ready at the email-verification or address-entry step.
- Keep the vendor record ready for the independent reviewer.
- Keep `/proof` open at the historical regtest settlement timeline.
- Hide browser bookmarks, terminal history, environment values, mail-sink payloads, full receivers, invitation fragments, and local database identifiers.
- Use fixture names and explicitly call them demo records.

## Script

### 0:00–0:12 — Demonstration scope

**Screen:** landing page hero, then “How a bill moves.”

> Obliq turns a vendor or contractor bill into one controlled, privately settled financial record. I’ll show the live local finance workflow first, then the separately recorded Zcash settlement evidence.

Point to the three authorities.

> Business approval, external cryptographic signing, and read-only observation are separate. Approval never becomes a wallet signature.

### 0:12–0:42 — Capture a persisted obligation

**Screens:** workspace overview, obligations list, then obligation record.

> The workspace is backed by PostgreSQL. These are clearly labelled demo records, not blockchain activity. An obligation preserves the vendor, source, exact integer amount, reference, due date, version, and history. Duplicate detection and runtime validation happen on the server, and tenant scope applies to every read and write.

Show the control section on the obligation.

> Clients cannot assign financial states directly. Deterministic, versioned policy produces structured findings and approval requirements from the current record.

### 0:42–1:24 — Private Payables Link

**Screens:** private-payables panel, recipient flow, then vendor record in the independent reviewer session.

> An authorized finance administrator issues a 24-hour invitation bound to this obligation and the vendor’s recorded email. The raw token arrives in the URL fragment and is removed immediately; only its hash is persisted. The recipient verifies the email challenge and sees only this payable.

> The recipient submits one Orchard-capable Unified Address. This proves neither identity beyond mailbox access nor wallet ownership, and it cannot approve payment. The API returns `RECIPIENT_CONFIRMED`; destination verification remains `UNVERIFIED`.

Switch to the vendor record under a separate eligible finance identity.

> A different reviewer verifies the immutable destination version. Replacing it invalidates stale approvals and unsigned settlement preparation. The recipient can never approve, sign, broadcast, or issue evidence.

**Disclosure:** The recording uses the loopback development mail sink. External production email delivery has not been verified.

### 1:24–1:55 — Control and approval

**Screens:** approvals, policies, then return to the obligation record.

> Amount, vendor status, destination assurance, completeness, and duplicate findings determine the requirements. The server checks the approver’s organization and role, prevents one actor from satisfying a two-person requirement, and binds every approval to the current obligation and policy versions. Material changes force fresh evaluation.

### 1:55–2:22 — Settlement boundary

**Screen:** settlement empty/review surface, then the obligation settlement timeline if available.

> Only a current, approved obligation can produce an immutable settlement intent and ZIP-321 request. Treasury reviews the exact `FullPrivacy` transaction in external Zallet. The web backend never receives the seed, spending key, PCZT, raw transaction, or unrestricted signer credential. Broadcast is not settlement; the read-only observer is the reconciliation authority.

Do not click or imply a live signing action.

### 2:22–2:48 — Recorded regtest evidence

**Screen:** `/proof`, historical regtest settlement timeline.

> This timeline is historical evidence from a real end-to-end tracer, not a transaction created by this demo workspace. On isolated Z3 regtest, external Zallet signed a 25-million-zatoshi Ironwood payment. The UFVK-only observer, which cannot spend, matched the opaque memo and amount to the obligation, recorded one then three confirmations, and only then marked it settled.

Point to `REGTEST VERIFIED` and the exact transaction/intent evidence.

> A regtest transaction is local, so it cannot be looked up in a public explorer.

### 2:48–2:58 — Proof and status

**Screen:** `/proof` network boundary.

> An authorized issuer can later create a minimal, integrity-protected evidence package from a settled record. It is not a zero-knowledge business proof. Public-testnet read-only sync is demonstrated, but funded public settlement and mainnet remain unverified.

## Claims to avoid

Never say:

- “live on mainnet,” “public testnet verified,” or “production ready”;
- “AI processed this invoice” when showing the seeded extractor;
- “email delivered” when only adapter acceptance or the development sink ran;
- “wallet verified” for recipient contact confirmation or address parsing;
- “paid” at intent, signature, broadcast, or detected state;
- “zero-knowledge business proof” for Obliq evidence; or
- “customers use Obliq” without real consented customer evidence.

## Recording fallback

If the local app or database fails during recording:

1. stop; do not improvise a success state;
2. record the public product narrative using the approved PR #27 screenshots;
3. show the committed `/proof` historical regtest evidence separately;
4. state that the finance workspace footage is a recorded isolated local ceremony; and
5. include the CI and evidence links in the submission description.
