# Issue 5 research: public Zcash qualification

Date: 2026-10-07

## Question

Can Obliq's UFVK-only observer move beyond isolated regtest without weakening
shielded privacy or introducing spend authority?

## Facts

- Current public testnet and mainnet data services identify their networks and
  expose the lightwalletd v0.5 protocol with the Ironwood pool enum.
- Both probed networks returned real Ironwood subtree root index 0.
- Current Zaino 0.10.1 represents Ironwood as a distinct pool and supports
  `GetSubtreeRoots` for it.
- Current librustzcash 0.24.0 sync imports all three subtree-root sets, verifies
  recent ranges, detects continuity errors, truncates and rescans.
- Current Zallet exports UFVK/UIVK, but its view-key import remains Sapling-only.
  Export capability does not establish Unified/Orchard watch-only import.
- Zallet remains useful as an external spending authority. It is not used by
  Obliq's read-only process.
- A fresh, unfunded public-testnet qualification account synchronized from
  height 4,472,945 through 4,472,968 using only its UFVK. The result reported no
  spend authority and no observations.
- A public endpoint is suitable for compatibility evidence, not production:
  query patterns leak wallet interests and availability/trust are external.

## Unknowns and limits

- No public shielded output has yet been received and decrypted by Obliq.
- No naturally occurring reorg happened during the short qualification run.
- An Obliq-operated public Zebra/Zaino service has not been provisioned.
- Public settlement, external signing and broadcast have not been repeated.
- Mainnet must remain blocked until public-network verification is complete.

## Classification

`PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`.

The sync architecture is executable and Ironwood-compatible. A deliberate,
externally funded shielded testnet payment is the remaining observation gate.
