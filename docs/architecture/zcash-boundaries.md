# Zcash, signing and viewing boundaries

## Payment request

ZIP-321 is the implemented canonical request format. Obliq supports a single shielded Unified Address payment with an exact zatoshi-derived decimal amount and opaque memo reference. Vendor names, invoice prose, categories, approvals, and secrets do not enter requests.

## Signing

The implemented regtest boundary is:

```text
readiness checks → version-bound intent → external signer → signed transaction → broadcast
```

The backend never holds unrestricted spending authority. Business approval is not cryptographic authorization. A separate human-operated Zallet v0.1.0-beta.3 creates, inspects, proves, signs and extracts a PCZT under `FullPrivacy`; only sanitized receipt metadata returns to Obliq. The privileged plaintext wallet RPC is never connected to the application. FROST is not implemented.

## Viewing and reconciliation

Phase 3 proved a real shielded receiving account, UFVK-only import, output and memo decryption, obligation correlation, and one-to-three confirmation progression on official Z3 regtest. The active NU6.3 pool was Ironwood. The observer uses librustzcash with `AccountPurpose::ViewOnly`, a separate SQLite scan cache, and a Zebra-backed compact-block service. Its TypeScript contract has status and observe methods only.

PostgreSQL stores receiver and opaque-reference fingerprints, exact zatoshis,
normalized output evidence, sync status and audit history. It does not store the
UFVK or memo plaintext. Infrastructure failure is `UNAVAILABLE`, not unpaid.
Production mainnet/testnet operations, TLS, cache encryption and Ironwood
subtree-root compatibility at scale remain planned.

## Quote, intent and execution state

The only current quote source is `REGTEST_FIXED` / `CONTROLLED_REGTEST`; it is
not market pricing. A quote binds exact business minor units and zatoshis and
expires. A settlement intent immutably binds the current obligation, policy
decision, destination receiver, quote, network, privacy mode and opaque memo.
Signing and broadcast commands recheck these values under an organization lock.
Retries use database uniqueness constraints. `BROADCAST_UNKNOWN` preserves
timeout uncertainty, and only the Phase-3 observer may advance a broadcast to
`DETECTED`, `CONFIRMING`, and `SETTLED`.

## Current source assumptions

Checked 2026-10-06 against current Zallet, librustzcash, lightwalletd, Zebra and Z3 sources. Zallet `v0.1.0-beta.3` exports UFVK/UIVK values but does not implement the required Orchard/Unified watch-only import. The observer therefore uses `zcash_client_backend 0.24.0` and `zcash_client_sqlite 0.22.0`. See ADR 0006 for exact commits and rejected architectures.
