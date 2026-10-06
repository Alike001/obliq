# Verification Audit: Phase 6 production hardening

## Verdict

**PASS**, with deployment credentials/infrastructure explicitly unconfigured
and public Zcash operation **BLOCKED**. No Phase-7 work is present.

## Artifacts Checked

- Master Context extracted read-only and all implementation-reference files.
- ADRs 0001–0010, architecture/security/threat/status documentation.
- Phase 1–5 repositories, migrations, audit chain, observer, signer and evidence
  boundaries.
- Phase-6 diff, migration 0010, runtime routes, test suites and CI.
- Project quality profile and Phase-6 current-reality research record.

## Requirement Traceability

| Requirement             | Implementation evidence                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production identity     | OIDC code flow with discovery, PKCE, state, nonce, provisioned issuer/subject, hashed DB sessions and active-membership recheck                      |
| Authorization / tenancy | all server actions derive actor server-side; repositories scope organization and roles; settlement follow-up updates include organization predicates |
| RLS decision            | ADR 0009 rejects misleading RLS until transaction-local tenant context exists                                                                        |
| Abuse controls          | atomic PostgreSQL buckets on login/callback/logout, mutations, uploads, evidence verify/download                                                     |
| File security           | signature/MIME/size checks, generated private quarantine key, encryption, HTTPS scanner boundary, production CLEAN-only persistence                  |
| Secrets                 | new redaction/fingerprint package, secret scan, no viewing/spending material in client/DB/proof/log outputs                                          |
| Signer / observer       | operations runbooks; external signer unchanged; observer reports network and fails mismatch; cache mode 0600 on Unix                                 |
| Public network          | ADR 0010 rechecks current stack; upstream defect fixed but Obliq remains executable `PUBLIC_NETWORK_BLOCKED`                                         |
| Evidence links          | 256-bit IDs retained; rate limits, no-store/no-referrer/noindex/nosniff, privacy-safe access events                                                  |
| Web security            | CSP, HSTS production, frame/MIME/referrer/permissions controls, secure cookies and explicit logout origin validation                                 |
| Runtime validation      | fail-closed deployment parser, production config test and `runtime:check` command                                                                    |
| Deployment              | topology, readiness/liveness, migration/rollback/backup, signer and viewing-incident runbooks                                                        |

## Acceptance Criteria Coverage

1. Production authentication architecture: implemented/tested; provider
   credentials intentionally absent.
2. Sensitive mutations: server-derived membership, capability, relationship and
   version checks reviewed.
3. Tenant isolation: existing and new PostgreSQL adversarial tests pass.
4. Production-capable rate limiting: PostgreSQL-coordinated and fail-closed.
5. Production-capable uploads: private object/quarantine/scanner adapters.
6. Signer/observer secret boundaries: preserved; no spend authority added.
7. Public-network status: freshly classified BLOCKED with corrected upstream
   history.
8. Network mismatch: runtime and sidecar tests fail closed.
9. Settlement idempotency: prior concurrency suite passes; all follow-up writes
   are tenant-scoped.
10. Evidence links: hardened and runtime headers observed.
11. HTTP/input/logging: runtime schemas, opaque ID/token checks, headers and
    recursive redaction tested.
12. Database: migration 0000→0010 passed on an empty PostgreSQL database.
13. UX/accessibility: existing loading/error/empty states, semantic status text,
    keyboard focus and bounded responsive lists retained; no color-only state
    added.
14. Deployment topology: documented without claiming serverless-only support.
15. `/proof`: derives DB/config/audit modes where possible and preserves regtest
    versus public distinctions.
16. `/security`: reflects implemented identity, file, disclosure and residual
    risks.
17. TypeScript/PostgreSQL/Rust/build/security gates: pass except RustSec audit is
    unavailable due registry timeout.
18. Phase 7: not started.

## Quality Gates

- `npm run validate`: PASS — formatting, lint, strict TypeScript, 95 unit tests,
  29-route production build.
- Empty PostgreSQL migration chain: PASS — migrations 0000 through 0010.
- Database integration: PASS — 6 files, 27 tests.
- Production runtime smoke: PASS — readiness 200 with OIDC/private-storage/
  PostgreSQL/regtest BLOCKED status; security and evidence headers observed.
- Secret scan: PASS — 220 files.
- `npm audit --omit=dev`: PASS — 0 vulnerabilities.
- Full development audit: 9 advisories (4 moderate, 5 high) in Drizzle/ESLint
  tooling; production graph is unaffected and npm offers incompatible
  downgrades rather than a safe upgrade.
- Rust `fmt`, `check --locked`, `test --locked`: PASS.
- `cargo-audit`: UNAVAILABLE — installation of 0.22.2 timed out fetching
  `camino` from crates.io; not represented as clean.
- `git diff --check`: PASS.

## Deviations From Plan

- RLS was evaluated and intentionally not enabled because the pool cannot bind
  tenant context safely per transaction. This is an explicit ADR, not a claim.
- Native PDF remains PLANNED; canonical JSON and same-model printable HTML avoid
  creating a second source of truth.
- Public-network testing stopped before funds because Obliq's observer remains
  regtest-only; there is no safe READY_FOR_FUNDED_TEST classification.

## Gaps And Risks

- OIDC provider, object store, scanner, KMS/secret manager and isolated hosts
  require deployment-specific provisioning and an operational acceptance test.
- Fixed-window limits permit a boundary burst and depend on trusted proxy IP
  sanitization.
- CSP retains `unsafe-inline` for current Next.js rendering; a nonce-based CSP is
  future hardening.
- Development-only Drizzle/ESLint transitive advisories remain until upstream
  dependency graphs provide compatible fixes; tooling must not be exposed.
- Manual destination verification remains vulnerable to process/social failure.
- Audit hashing has no independent anchor; a DB owner can recompute history.
- UFVK compromise permanently exposes the viewing scope known to the attacker.

## Follow-ups

- Run the documented provider/infrastructure acceptance checklist before any
  production launch.
- Re-run RustSec audit in CI/network conditions that can fetch the advisory DB.
- Public-network architecture requires a later evidence gate; do not fund this
  build for a public tracer.

## Evidence Log

The command outputs and runtime header captures were produced on 2026-10-06 in
the project workspace. Research details and authoritative source links are in
`.thoughts/research/2026-10-06-phase-6-hardening-reality.md` and ADR 0010.
