# Obliq three-minute demo script

Target length: **2:50–3:00**. Record locally against fixture-only PostgreSQL. Use the public preview only for public pages. Do not attempt a wallet ceremony during the recording.

The screen names below match PR #27’s final-polish inventory. If that PR changes a label or navigation location before merge, update this script after the owner accepts the UI—not by changing Prudent’s branch here.

## Presenter setup

- Keep one finance workspace tab on a real persisted fixture obligation.
- Keep one recipient tab ready at the email-verification or address-entry step.
- Keep the vendor record ready for the independent reviewer.
- Keep `/proof` open at the historical regtest settlement timeline.
- Hide browser bookmarks, terminal history, environment values, mail-sink payloads, full receivers, invitation fragments, and local database identifiers.
- Use fixture names and explicitly call them demo records.

## Script

### 0:00–0:22 — Problem and customer

**Screen:** landing page hero.

> Crypto businesses should not have to publish who they pay. But their bills are also scattered across email, spreadsheets, approval chats, and wallets. Obliq is private accounts payable for crypto-native teams: it turns a vendor or contractor bill into one controlled financial record, without taking custody of the treasury.

### 0:22–0:42 — Lifecycle and differentiation

**Screen:** “How a bill moves.”

> The workflow is Capture, Control, Settle, Reconcile, Prove. A wallet can send Zcash. Obliq adds the obligation, duplicate checks, deterministic policy, human approvals, destination history, independent observation, and a receipt that reveals only what the recipient needs.

Point to the three authorities.

> Business approval, cryptographic signing, and read-only observation are separate authorities. Approval never becomes a wallet signature.

### 0:42–1:12 — Persisted finance record

**Screens:** workspace overview, obligations list, then obligation record.

> This is the persisted finance workspace. The demo data is labelled fixture data; the workflow itself uses PostgreSQL. Here is a vendor invoice with exact integer money, its source, due date, controls, and approvals. Clients cannot set financial state directly—the server rechecks the current obligation, policy, destination, and approvals at each transition.

Show a structured control and approval state. Do not claim the fixture is paid.

### 1:12–1:53 — Private Payables Link

**Screens:** invitation panel, recipient flow, then vendor record in the independent reviewer session.

> Finance can send this vendor contact a 24-hour link for this obligation. The token is removed from the URL immediately and stored only as a hash on the server. The recipient verifies access to the recorded email and sees only this payable.

> They submit one Orchard-capable Unified Address. That does not prove wallet ownership, and it does not authorize payment. The result is contact-confirmed and still unverified.

Switch to the separate reviewer.

> A different eligible finance reviewer must verify the new immutable destination version. A destination change invalidates stale approvals and unsigned preparation. The recipient can never approve, sign, broadcast, or issue evidence.

**Disclosure:** The recording uses the loopback development mail sink. External production email delivery has not been verified.

### 1:53–2:23 — Control and settlement boundary

**Screens:** approvals, policies, then settlement empty/review surface.

> Versioned policy determines who must approve based on amount, vendor, destination, completeness, and duplicates. Once every current requirement passes, Obliq can prepare an immutable intent and ZIP-321 request. Treasury then reviews and signs the exact `FullPrivacy` transaction in external Zallet. Obliq’s web backend never receives the seed, spending key, PCZT, raw transaction, or unrestricted signer credential.

Do not click or imply a live signing action.

### 2:23–2:48 — Real regtest evidence

**Screen:** `/proof`, historical regtest settlement timeline.

> This is recorded evidence from the real end-to-end tracer—not a transaction created by this demo workspace. On isolated Z3 regtest, external Zallet signed a 25-million-zatoshi Ironwood payment. The UFVK-only observer, which cannot spend, detected it, matched the opaque memo and amount to the obligation, recorded one then three confirmations, and only then marked it settled.

Point to `REGTEST VERIFIED` and the exact transaction/intent evidence.

> A regtest transaction is local, so it cannot be looked up in a public explorer.

### 2:48–3:00 — Honest status and close

**Screen:** `/proof` network boundary or landing proof section.

> Public-testnet read-only synchronization is qualified, but funded public settlement and mainnet are not verified. Obliq proves that private payment can remain accountable without giving one system every authority. Pay your business bills without publishing your business.

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
