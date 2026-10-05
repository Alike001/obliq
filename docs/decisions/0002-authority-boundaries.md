# ADR 0002: Authority separation

**Status:** Accepted — 2026-10-05

Obliq stores business intent but never unrestricted treasury spending authority. Wallet/signing is an external port. Viewing/reconciliation is a separate, minimum-capability server-side port. AI has suggestion authority only. This remains true even if a weaker architecture would make a demo easier.
