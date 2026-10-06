# Reality Research: Phase 5 controlled financial evidence

## Scope

Establish the implemented Phase 1–4 facts that constrain Phase 5: canonical
financial records, settlement/reconciliation truth, authorization, audit
integrity, existing evidence schema, and public product claims.

## Sources Checked

- `obliq-context/Obliq_Master_Context.docx`, especially sections 16, 17 and
  the Phase-5 gate.
- `obliq-context/implementation-reference/README.md`, `01`, `02`, `03`, `05`
  and `07`.
- Commit `b2bce117fb38c456445950542f2f63170a646519` and the clean worktree.
- `packages/database/src/schema/{identity,operations,settlement,evidence}.ts`.
- `packages/database/src/repositories/{index,control,settlement,reconciliation}.ts`.
- `packages/database/src/repositories/*integration.test.ts`.
- `apps/web/src/app/{proof,security}` and the application routes.
- Repository architecture, security, threat-model and implementation-status
  documents.
- Fresh PostgreSQL migration/integration run and the existing validation suite.

## Verified Facts

- The Master Context defines V1 evidence as application-generated,
  integrity-protected financial evidence derived from Obliq records. It is not
  a zero-knowledge proof or blockchain attestation.
- Obligations, immutable obligation versions, policy decisions, approvals,
  settlement intents, settlements and observations are persisted with
  `organization_id` and exact integer amounts.
- A settlement reaches `SETTLED` through a matching read-only observation; a
  broadcast receipt alone cannot settle it.
- Settlement observations retain transaction, network, block, confirmation,
  amount and correlation facts without storing memo plaintext or viewing
  authority.
- The audit chain uses canonical JSON, SHA-256, previous-hash linkage and an
  organization-scoped PostgreSQL advisory lock. Verification recomputes every
  link.
- Membership roles already distinguish Owner, CFO, Finance, Accountant,
  Treasury and other capacities, but no evidence capabilities are implemented.
- The Phase-0 `evidence_packages` and `evidence_disclosures` tables contain only
  IDs, basic links, status, optional artifact hash and per-field value hashes.
  No artifact snapshot, schema version, public verification token,
  classification, provenance, revocation or supersession metadata exists.
- `/app/evidence` is currently routed through the planned-section placeholder.
  `/verify/[evidenceId]` and evidence download routes do not exist.
- `/proof`, `/security`, README and product documentation truthfully label
  evidence generation as planned/unavailable.
- Baseline validation passed: formatting, lint, strict TypeScript, 73 unit
  tests, 16 PostgreSQL integration tests, production build, Rust formatting and
  locked dependency check, and npm production audit with zero vulnerabilities.

## Inferences

- The canonical Phase-5 source can be assembled without new Zcash authority:
  business facts come from the obligation/vendor records, authorization facts
  from policy/approval records, and chain-derived facts from the settled
  settlement plus matching observation.
- A public sequential UUID would reveal less entropy than a dedicated random
  verification token and would couple external access to internal identity.
- Existing evidence rows should not be treated as issued artifacts because no
  prior application path could create a complete canonical package.

## Unknowns And Questions

- Production organization public identities and attestation/branding are not
  defined; V1 can only use the persisted organization name as an Obliq
  application fact.
- Public-link rate limiting, cache/CDN policy and production identity-provider
  controls remain future operational work.
- No stable PDF dependency or rendering service is currently present. JSON is
  the required durable structured artifact; an HTML receipt can remain the
  printable view unless PDF is deliberately introduced later.
- Public-network settlement remains blocked, so Phase-5 chain evidence can be
  real but is currently regtest-scoped.

## Not Included

- Zero-knowledge business proofs, independent accounting attestation,
  accountant portals, accounting-system integrations, or Phase-6 hardening.
