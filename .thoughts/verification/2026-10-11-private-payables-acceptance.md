# Verification: Private Payables Link backend acceptance preparation

Date: 2026-10-11

Base: `origin/main` at `5c7dd0f` (includes PRs #18 and #19)

Scope: backend contracts, database behavior, acceptance documentation; no
frontend, wallet, signer, deployment, or public-network execution changes.

## Evidence inputs

- `docs/research/private-payables/PHASE_6B_IMPLEMENTATION_SPEC.md`
- `docs/architecture/private-payables-link-backend.md`
- `docs/decisions/0012-private-payables-recipient-boundary.md`
- recipient API routes, domain schemas, repository, migration and tests
- obligation, policy/control, settlement and reconciliation repositories/tests
- preview runtime configuration and public-preview boundary tests

## Requirement traceability

| Requirement                              | Implementation evidence                                                                     | Test/acceptance evidence                                    | Result           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------- |
| 24-hour issue/revoke/expiry              | recipient repository and migration 0012                                                     | recipient DB integration; PPL-01/PPL-08                     | PASS             |
| one-time email verification              | challenge/session transactional transitions                                                 | replay and attempt-lockout DB assertions                    | PASS             |
| recipient session is not membership      | separate recipient-session table and token lookup                                           | no-membership assertion; strict input schemas               | PASS             |
| contact verification is not wallet proof | `UNAVAILABLE` response/audit contract and unverified destination state                      | PPL-03/PPL-06/PPL-19                                        | PASS             |
| independent destination review           | issuer exclusion in `verifyDestinationManually`                                             | issuer rejection and Treasury success                       | PASS             |
| stale authorization invalidation         | shared vendor invalidation transaction                                                      | approval/intent invalidation and signed/broadcast guards    | PASS             |
| one-time concurrency/idempotency         | organization lock, row locks, unique receipt/version constraints                            | race, retry, changed-request and stale-recovery tests       | PASS             |
| tenant isolation                         | organization-scoped joins/updates and server-derived actor                                  | recipient/control/settlement cross-tenant tests             | PASS             |
| token and audit privacy                  | HMAC-only persistence, no-store routes, safe audit payloads                                 | domain security tests, audit leakage assertion, secret scan | PASS             |
| recipient cannot authorize payment       | no approval/settlement fields or commands in recipient contract; internal membership checks | strict schema test and authorization suites                 | PASS             |
| preview stays fail closed                | disabled runtime plus middleware allowlist                                                  | unit tests and local production HTTP smoke                  | PASS             |
| public settlement claim remains limited  | no qualification/runtime changes                                                            | preview config reports `PUBLIC_NETWORK_BLOCKED`             | PASS             |
| recipient browser workflow               | backend contract exists; no recipient frontend exists                                       | documented checklist only                                   | PENDING FRONTEND |

## Executed validation

- `npm run format:check` — PASS
- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 168 tests; 36 DB tests skipped without DB environment
- migrated PostgreSQL `npm run test:integration` — PASS, 36/36
- `npm run security:secrets` — PASS, 442 files inspected
- `npm audit --omit=dev --audit-level=high` — PASS, 0 vulnerabilities
- `npm run build` — PASS, Next.js production build
- fail-closed preview runtime check/build — PASS
- local preview HTTP smoke — public routes served; `/app`, `/auth`, `/verify`,
  recipient session, challenge POST and destination POST returned 404
- `cargo fmt --check` — PASS
- `cargo check --locked` — PASS
- `cargo test --locked` — PASS, 9/9 observer tests

The existing recipient integration setup exceeded Vitest's default 10-second
hook limit on a cold migrated database during the first isolated run. The hook
timeout is now explicitly bounded at 30 seconds; the focused suite then passed
8/8 and the complete database suite passed 36/36.

## Gaps and deviations

- The recipient frontend remains deliberately unimplemented. Browser/assistive
  technology and real email-adapter acceptance are therefore pending.
- There is no Zcash address-ownership proof. Independent internal destination
  review remains mandatory.
- No funded public-testnet settlement has occurred. Render preview remains
  network-disabled and cannot exercise this workflow.
- Route-level tests use existing preview and runtime boundary coverage; the
  security-critical state transitions are proven at the PostgreSQL repository
  boundary. End-to-end browser coverage belongs with the forthcoming frontend.

## Verdict

**PASS WITH DOCUMENTED FRONTEND GAP.** The backend vertical slice is ready for
Prudent's frontend integration against the documented API contract and fixture.
No payment execution, deployment, or public-network claim was introduced.
