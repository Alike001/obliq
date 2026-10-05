# Obliq Implementation Reference

Purpose: current, implementation-critical Zcash constraints for Obliq.

This folder is narrower and more authoritative than the broad research archive. Codex must:
1. Treat official ZIPs, protocol docs, and current wallet docs as authoritative over summaries here.
2. Re-verify any behavior that could have changed before implementing it.
3. Never infer a wallet/RPC capability from a conceptual protocol capability.
4. Never make Draft ZIPs critical to the competition path.
5. Record exact implementation choices and evidence in ADRs.

Competition-critical chain:
obligation -> deterministic controls -> human approval -> non-custodial signing -> real shielded Zcash settlement -> read-only reconciliation -> evidence.

If real shielded observation cannot be proven in Phase 3, STOP rather than fake it.
If real shielded settlement cannot be proven in Phase 4, STOP rather than fake it.
