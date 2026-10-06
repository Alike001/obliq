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

Phase 3 proved a real shielded receiving account, UFVK-only import, output and memo decryption, obligation correlation, and one-to-three confirmation progression on official Z3 regtest. The active NU6.3 pool was Ironwood. The observer uses librustzcash with `AccountPurpose::ViewOnly`, a separate SQLite scan cache, and a Zebra-backed compact-block service. Its TypeScript contract has status and observe methods only.

PostgreSQL stores receiver and opaque-reference fingerprints, exact zatoshis,
normalized output evidence, sync status and audit history. It does not store the
UFVK or memo plaintext. Infrastructure failure is `UNAVAILABLE`, not unpaid.
Production mainnet/testnet operations, TLS, cache encryption and Ironwood
subtree-root compatibility at scale remain planned.

## Current source assumptions

Checked 2026-10-06 against current Zallet, librustzcash, lightwalletd, Zebra and Z3 sources. Zallet `v0.1.0-beta.3` exports UFVK/UIVK values but does not implement the required Orchard/Unified watch-only import. The observer therefore uses `zcash_client_backend 0.24.0` and `zcash_client_sqlite 0.22.0`. See ADR 0006 for exact commits and rejected architectures.
