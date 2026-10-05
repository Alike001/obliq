# Current Zcash Stack Baseline

Use current Zcash documentation at implementation time.

Baseline:
- Shielded ZEC is the settlement asset for Obliq's critical path.
- Unified Addresses are account/address containers that may contain multiple receiver types.
- Modern wallet semantics are account/full-viewing-key oriented rather than treating every diversified address as an independent balance.
- Zallet is useful as a current wallet/RPC reference, but individual RPC support must be checked exactly.
- librustzcash/protocol crates are preferred normative/reference implementation material for protocol construction logic.
- Slipstream may be studied for sync architecture, but its AGPL-3.0-only license means it must not be casually incorporated into Obliq.

Do not assume:
- EVM/Solidity/MetaMask semantics.
- Native shielded USDC/custom assets.
- A particular wallet exposes every protocol capability through RPC.
- A Draft ZIP is stable production infrastructure.
