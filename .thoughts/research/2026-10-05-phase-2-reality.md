# Reality Research: Obliq Phase 2 control baseline

## Scope

Current Phase 1 domain, persistence, authorization, audit, and UI behavior relevant to implementing deterministic controls and approvals.

## Sources Checked

- `obliq-context/Obliq_Master_Context.docx`
- `obliq-context/implementation-reference/{README,02,04,06,07,09}*.md`
- Commit `191e5dfcda7aa1409d26164a7dad04931be07166`
- `docs/decisions/0004-phase-1-obligation-persistence.md`
- `packages/domain/src/*`, `packages/database/src/schema/*`, repositories and integration tests
- Phase 1 validation suite against local PostgreSQL 17

## Verified Facts

- Worktree began clean at the requested commit; PostgreSQL was healthy on loopback port 5433.
- Phase 1 validation passed: formatting, lint, strict TypeScript, 42 tests, and production build.
- Obligations are persisted with mandatory vendor/source, integer minor units, version, and `UNDER_REVIEW` state.
- Material edits currently increment obligation version but do not invalidate anything because approval behavior does not exist yet.
- Destination rows are immutable history with `UNVERIFIED`/`SUPERSEDED`; verification provenance and authorization do not exist.
- The schema contains Phase 0 placeholder policy, policy-decision, requirement, and approval tables. They do not bind policy versions, obligation versions, destinations, actors' capacities, structured findings, or readiness.
- Membership roles are `OWNER`, `FINANCE`, `APPROVER`, `SIGNER`, and `ACCOUNTANT`; no Phase 2 capability mapping exists.
- Audit events are organization-local, transactionally serialized, canonically hashed, and verifiable.
- All Phase 1 repositories apply organization predicates and integration tests cover cross-tenant records.
- No wallet, transaction, signing, viewing, reconciliation, or blockchain execution behavior exists.

## Inferences

- Phase 2 requires new immutable policy-version records rather than mutating `policies.rule_json`.
- Approval and readiness records must bind the obligation version, policy decision/version, and exact destination row to prevent stale authorization.
- Currency conversion cannot be called an “equivalent” threshold without a quote system; Phase 2 policies therefore need an explicit policy currency and must block unsupported currencies.

## Unknowns And Questions

- Production identity and enterprise role provisioning remain intentionally unresolved.
- Cryptographic destination ownership verification is unavailable; any Phase 2 verification can only be authorized manual verification with recorded provenance.

## Not Included

No Phase 3 read path, Zcash pricing, wallet, signing, transaction, broadcast, scanning, reconciliation, ledger settlement, or evidence-package work.
