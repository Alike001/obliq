# ADR 0010: Public Zcash requalification remains blocked

Status: Accepted — Phase 6

## Current implementation reality

The Phase-3/4 observer is pinned to librustzcash components and intentionally
hard-coded to Z3 regtest `LocalNetwork`. It has one read-only operation and
imports a UFVK as `AccountPurpose::ViewOnly`. The external human-operated Zallet
signer remains outside the application.

Phase 6 rechecked the current official/upstream stack. Zaino 0.10.1 was released
on 2026-09-29. The earlier Ironwood subtree-root defect described in ADR 0006
was corrected in Zaino Serve 0.7.0, and current protocol definitions include
Ironwood subtree roots. Current librustzcash is 0.24.0. This removes the precise
upstream defect encountered by the old tracer, but it does not make Obliq's
regtest-only observer a tested public observer.

Sources:

- [Zaino releases](https://github.com/zingolabs/zaino/releases)
- [Zaino Serve changelog](https://github.com/zingolabs/zaino/blob/dev/zaino-serve/CHANGELOG.md)
- [librustzcash releases](https://github.com/zcash/librustzcash/releases)
- [Zebra wallet integration](https://zebra.zfnd.org/user/using-zebra.html)

## Classification

`PUBLIC_NETWORK_BLOCKED`.

Obliq has not implemented public consensus parameters/birthdays, validated a
complete authenticated public sync, exercised restart/reorg recovery at public
chain scale, or observed and settled a funded shielded public transaction. A
direct Zebra wallet interface also remains experimental and unauthenticated;
official Zebra guidance continues to recommend a wallet service and requires a
TLS/authenticated private boundary for remote access.

## Executable safeguards

- TypeScript and Rust adapters reject testnet/mainnet.
- Runtime configuration requires application and observer network equality.
- A public network is rejected while status is BLOCKED.
- Sidecar output contains its network identity and a mismatch fails closed.
- UI/proof persists `REGTEST VERIFIED` separately from public readiness.

No funded action is requested because architecture and synchronization are not
yet ready for a funded test. Transparent Zcash is not an alternative.
