# Reference Repositories

Use references for patterns, not wholesale copying.

High priority:
1. Alike001/zecceipt
   - Prior team knowledge: invoice lifecycle, exact zatoshi arithmetic, confirmations, failure semantics, receipts.
   - Do NOT copy transparent-only architecture into shielded Obliq.

2. zcash/librustzcash
   - Reference implementation material for current Zcash protocol/wallet primitives.

3. zcash/zips
   - Normative ZIP status and specifications.

4. Zallet documentation/source
   - Current wallet/RPC behavior. Verify method-by-method.

5. Zcash Foundation FROST
   - Study only for real advanced organizational signing work.

6. zodl-inc/slipstream
   - Study sync architecture only.
   - AGPL-3.0-only at reference-pack creation. Do not incorporate casually.

Product/UX references:
- Ramp / Brex: AP controls and separation of bill approval/payment release.
- Request Finance: crypto financial operations and privacy competition.
- CipherPay: shielded merchant matching prior art; Obliq must not become a checkout clone.
- Konclave: Zcash treasury/signing/documentation benchmark.

Before copying any code:
- identify license,
- identify exact file,
- justify dependency/reuse,
- record decision.
