# Zcash, signing and viewing boundaries

## Payment request

ZIP-321 is the canonical future request format where compatible. Requests must use exact amounts. Only an opaque obligation reference may be included in encrypted memo data; vendor names, invoice prose, categories, approvals, and secrets must not enter shareable URIs or plaintext metadata.

## Signing

The intended boundary is:

```text
readiness checks → version-bound intent → external signer → signed transaction → broadcast
```

The backend never holds unrestricted spending authority. Business approval is not cryptographic authorization. PCZT and FROST may influence interfaces but remain draft, non-critical dependencies until proven end to end.

## Viewing and reconciliation

Phase 3 must prove a real shielded receiving account, exact read-only mechanism, real shielded payment observation, obligation correlation, and confirmation evidence. The team must not infer Orchard scan support from conceptual key export support. If the chosen stack cannot demonstrate the path, work stops for redesign rather than using a transparent fallback.

## Current source assumptions

Checked 2026-10-05 against the official ZIP-321, ZIP-374, ZIP-312 and Zallet RPC documentation linked from the implementation reference. ZIP-321 is the payment-request specification; ZIP-374 and ZIP-312 remain draft-oriented architecture inputs, not Phase-0 runtime dependencies. Exact Zallet method behavior is intentionally unresolved until Phase 3.
