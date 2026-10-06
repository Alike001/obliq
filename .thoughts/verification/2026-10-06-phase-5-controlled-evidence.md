# Verification Audit: Phase 5 controlled financial evidence

## Verdict

**PASS.** All 16 Phase 5 acceptance criteria have implementation and test or
build evidence. Native PDF generation is explicitly PLANNED and is not required
unless claimed. `cargo-audit` is unavailable in this environment; production
npm dependencies report zero known vulnerabilities. Phase 6 has not started.

## Artifacts Checked

- Phase 5 requirements and acceptance gate supplied by the user.
- `obliq-context/Obliq_Master_Context.docx`, extracted read-only.
- Relevant implementation-reference material and the Phase 1–4 domain,
  migration, audit, settlement and reconciliation implementations.
- `.thoughts/quality/2026-10-05-project-quality-profile.md`.
- `.thoughts/research/2026-10-06-phase-5-evidence-reality.md`.
- `packages/evidence`, evidence repositories/schema/migration/integration tests,
  reconciliation invalidation, app routes, `/proof`, `/security`, product docs,
  architecture docs, README and ADR 0008.
- Complete working-tree diff from Phase 4 commit
  `b2bce117fb38c456445950542f2f63170a646519`.

## Requirement Traceability

| Requirement                    | Implementation evidence                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical evidence package     | `packages/evidence/src/index.ts`; `packages/database/src/repositories/evidence.ts` derives claims only from a settled obligation, settlement and matching observation |
| Explicit controlled disclosure | Closed field registry/templates and server-side role checks; unknown fields fail normalization                                                                        |
| Field classification           | `PUBLIC_SAFE`, `COUNTERPARTY`, `FINANCE`, `AUDIT`; forbidden secret/internal concepts have no valid field key                                                         |
| Canonicalization and hashing   | Sorted-key canonical JSON, safe-integer constraint, SHA-256, schema/version/manifest/provenance validation                                                            |
| External verification          | `/verify/[evidenceId]` and canonical JSON download use a random 256-bit URL-safe public identifier                                                                    |
| Revocation/supersession        | Status-only transitions preserve artifact bytes/hash; corrections issue a new ID/version; reconciliation regression revokes active packages                           |
| Receipt/artifact               | Printable receipt and JSON envelope render/serialize the same stored canonical artifact; native PDF is not claimed                                                    |
| Product workflow               | `/app/evidence`, mandatory `/preview/[id]`, internal package detail and settled-obligation entry point                                                                |
| Provenance                     | Each claim identifies Obliq business record, Obliq authorization record or Zcash reconciliation                                                                       |
| Audit and authorization        | Preview, issue, supersede, revoke and automatic revoke events use the existing chained audit append; repository capabilities are role- and tenant-checked             |
| Truthful product surfaces      | README, docs, ADR 0008, `/security` and `/proof` distinguish application evidence from ZK/business attestation and retain regtest/public-network scope                |

## Acceptance Criteria Coverage

1. **Canonical settled source:** integration test rejects an unsettled record and
   joins a matching settled observation before preview.
2. **Explicit, server-enforced disclosure:** unit allowlist tests and integration
   role-denial test; a mandatory exact preview precedes issuance.
3. **Immutable artifacts:** PostgreSQL trigger rejects changes to all artifact
   identity/content columns; status metadata is the only mutable lifecycle data.
4. **Deterministic hashing:** unit test produces identical SHA-256 for identical
   canonical content.
5. **Tamper detection:** unit cases alter amount, vendor, status, settlement
   date, transaction reference, manifest, version and creation time; persisted
   mutation is rejected by PostgreSQL.
6. **Authorized external view only:** minimal-package integration assertion
   excludes vendor, zatoshis, transaction ID, approvals, destination and memo.
7. **Non-enumerable IDs:** 32 random bytes encoded as 43-character base64url,
   validated in unit tests and at the public repository boundary.
8. **Revocation/supersession:** integration test preserves original hash while
   changing visible lifecycle state and issuing a higher-version successor.
9. **JSON artifact:** canonical envelope generation is tested and exposed with
   attachment, `private, no-store`, JSON and `nosniff` headers.
10. **PDF if claimed:** native PDF is explicitly PLANNED; printable HTML is not
    represented as a generated PDF.
11. **Provenance:** rendered per claim and enforced against a closed runtime
    provenance set.
12. **Tenant isolation/authorization:** cross-tenant preview, get and list are
    denied/empty; FINANCE cannot disclose FINANCE/AUDIT fields or revoke.
13. **Audit chain:** evidence integration verifies the organization chain after
    preview, issue, supersession and revoke events.
14. **Docs/security/proof:** all three surfaces describe implemented scope,
    privacy risk, integrity semantics and current limitations.
15. **No ZK misrepresentation:** UI, receipt, README, ADR, docs and proof surface
    explicitly disclaim a zero-knowledge business proof.
16. **Validation:** quality gates below pass, with the explicitly reported
    unavailable `cargo-audit` command.

## Quality Gates

- `npm run format:check`: PASS.
- `npm run lint`: PASS, zero warnings.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 83 tests; 22 PostgreSQL-gated tests skipped in the unit-only
  process and executed separately below.
- Fresh PostgreSQL `npm run db:migrate`: PASS through migration 0009.
- `npm run test:integration`: PASS, 5 files / 22 tests.
- `npm run build`: PASS, Next.js 16.3.8 production build, 28 routes.
- `npm run security:secrets`: PASS, including tracked and non-ignored untracked
  files.
- `npm audit --omit=dev`: PASS, zero vulnerabilities.
- `cargo fmt --check --manifest-path tools/zcash-observer/Cargo.toml`: PASS.
- `cargo check --locked --manifest-path tools/zcash-observer/Cargo.toml`: PASS.
- `cargo audit --version`: UNAVAILABLE (`cargo audit` is not installed).
- `git diff --check`: PASS.

## Deviations From Plan

- Native PDF was optional and was not implemented. JSON is canonical and the
  HTML receipt is printable; every product surface labels PDF PLANNED.
- Unauthenticated verification reads are not appended to the finance audit
  chain because that would allow public callers to create unbounded audit
  events. Authenticated disclosure lifecycle actions are chained; rate-limited,
  privacy-safe access telemetry remains planned.
- The existing secret scan originally inspected tracked files only. It was
  corrected to scan tracked plus non-ignored untracked files before final use.

## Gaps And Risks

- Verification URLs are bearer-like: a recipient can forward disclosed claims.
- SHA-256 detects artifact change relative to the stored hash but is not an
  external signature, timestamp authority or independent attestation.
- A PostgreSQL superuser remains inside the application-evidence trust boundary.
- Production authentication, RLS, rate limiting, secure link delivery, expiry,
  caching policy enforcement and independent anchoring remain hardening work.
- Reorg invalidation has regtest integration coverage; public-network operation
  remains BLOCKED under the existing Zcash qualification limitation.

## Follow-ups

- Add production identity/RLS and public-route rate limiting before deployment.
- Decide whether recipient-bound expiring links or signatures are needed for
  higher-assurance evidence sharing.
- Add native PDF only if demand justifies a deterministic renderer based on the
  same canonical artifact.
- Install/run `cargo-audit` when the tool and advisory database are available.

## Evidence Log

- Fresh test database: `obliq_phase5_final` on loopback PostgreSQL port 5433.
- Migration result: all migrations applied successfully.
- Integration result: 5 files passed, 22 tests passed.
- Unit result: 10 files passed, 83 tests passed; 5 DB suites skipped there and
  passed in the integration run.
- Build result: compiled, typechecked and generated 28 routes including
  `/app/evidence`, `/app/evidence/[id]`, `/app/evidence/preview/[id]`,
  `/verify/[evidenceId]` and `/verify/[evidenceId]/artifact.json`.
- Production dependency audit: zero vulnerabilities.
