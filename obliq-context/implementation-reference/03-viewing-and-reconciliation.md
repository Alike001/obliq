# Viewing and Reconciliation

Goal: Obliq can observe and reconcile relevant shielded settlement without possessing spending authority.

Security model:
- Spending authority and viewing authority are separate.
- Viewing material is still highly sensitive because compromise can expose financial privacy.
- Never expose viewing keys client-side.
- Store only the minimum viewing capability needed for the chosen reconciliation architecture.

Important implementation caveat:
- Current Zallet docs expose z_exportviewingkey and can return a Unified Full Viewing Key or Unified Incoming Viewing Key for a unified account.
- Current Zallet z_importviewingkey documentation is narrower and documents Sapling full viewing-key import.
- Therefore DO NOT assume "exportable UIVK" implies "Zallet RPC can import UIVK and scan Orchard exactly as Obliq needs."

Phase 3 must build a tracer bullet:
1. Choose exact network/wallet stack.
2. Establish a real shielded receiving account.
3. Establish exact read-only viewing mechanism.
4. Receive a real shielded payment.
5. Detect/decrypt/observe it without spend authority in the reconciliation component.
6. Associate it to a test obligation.
7. Record confirmations/evidence.
8. Document what the viewing authority can and cannot see.

If any step is unsupported, STOP and redesign using authoritative tooling; never silently fall back to transparent settlement.
