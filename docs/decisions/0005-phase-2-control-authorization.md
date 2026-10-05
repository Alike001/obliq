# ADR 0005: Version-bound control and business authorization

Status: Accepted — Phase 2

## Decision

Obliq implements control logic in a framework-independent `@obliq/policy` package and persists its inputs and outputs through tenant-scoped PostgreSQL repositories. Policies and material obligation revisions have immutable version records. Every decision records the policy version, obligation version, exact destination version, normalized input hash, structured findings and derived approval requirements.

The canonical lifecycle remains `DRAFT → UNDER_REVIEW → APPROVAL_REQUIRED → APPROVED → READY_TO_SETTLE`. A blocking evaluation uses the existing exceptional `BLOCKED` state. Clients cannot submit lifecycle states; application commands re-evaluate transition requirements server-side.

Initial policies use exact thresholds in one configured currency. Obliq does not invent foreign-exchange equivalence in Phase 2: another currency produces a blocking finding. Supported controls are completeness, vendor history, destination status, duplicates and amount tiers.

Manual destination verification requires an authorized actor, timestamp, method and note and is labelled `VERIFIED_MANUALLY`. It is not proof of wallet ownership. Destination replacement and material obligation changes invalidate approval records and return the obligation to review.

Approval records bind actor, capacity, requirement, decision, policy decision and obligation version. Creator restrictions and distinct-actor thresholds are enforced in the transaction. Readiness is a separate deterministic evaluation with structured reasons and must be fresh against the current obligation, policy and destination versions.

## Consequences

- Historical policy and approval meaning is not rewritten.
- Policy changes retain history, invalidate active authorization and return affected obligations to review.
- Approval is business authorization only and never a Zcash signature.
- `READY_TO_SETTLE` is the hard Phase 2 stop; no pricing, request generation, wallet, signing, broadcast, observation or reconciliation is present.
- Production identity, richer organizational groups and foreign-exchange policy remain later work.
