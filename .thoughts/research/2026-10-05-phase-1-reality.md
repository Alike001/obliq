# Reality Research: Obliq Phase 1 baseline

## Scope

Establish the repository, persistence, domain, security, and product reality at commit `baed468ab0f67639b28a5fb252e884a5700f5607` before implementing the Phase-1 Obligation Engine.

## Sources Checked

- `obliq-context/Obliq_Master_Context.docx`, extracted read-only from DOCX XML.
- Phase-1-relevant files in `obliq-context/implementation-reference/`, especially the security constraints and Zcash authority boundaries.
- `docs/architecture/*`, `docs/decisions/*`, and the Phase-0 quality profile.
- Domain, database, Zcash, web-shell, proof, security, manifest, migration, and test files in the repository.
- Commit `baed468ab0f67639b28a5fb252e884a5700f5607` and current Git status.
- Current Next.js, Drizzle ORM, and Zod documentation through Context7.
- Local Docker/PostgreSQL process availability.

## Verified Facts

- The repository started this phase exactly at the requested Phase-0 commit on `main`; tracked worktree state was clean.
- The product authority defines Obligation as the primary object and Phase 1 as vendors, manual/upload capture, reviewed AI extraction, state enforcement, duplicates, audit events, and usable dashboard/detail surfaces.
- The canonical lifecycle starts `DRAFT → UNDER_REVIEW → APPROVAL_REQUIRED`; approval requirements and policy execution belong to Phase 2.
- PostgreSQL and Drizzle are the persistence decision. Phase 0 generated one migration containing 19 tables, but no repository queries or migration-backed runtime tests exist.
- Phase-0 vendor records lack `updated_at` and contact metadata. Obligations lack explicit category and description columns. Sources have an extensible metadata JSON field.
- Phase-0 audit tables reserve payload and previous hashes, but there is no event writer or integrity verifier.
- The only server identity boundary is a development environment abstraction guarded by `server-only`; it is not production authentication.
- `/app/vendors` and `/app/obligations` are generic unavailable pages. `/app` uses entirely seeded layout values.
- Docker and Docker Compose are installed. No local `psql` or `pg_isready` binary is installed. A PostgreSQL container from another project is running; Obliq's own Compose database was not running at research time.
- Existing tests cover bigint money construction, final settlement semantics, a domain tenant guard, selected schema columns, and unavailable Zcash capabilities. There are 11 tests across three files.
- Next.js documentation recommends validated Server Actions delegating authorization and persistence to a `server-only` data-access layer, with revalidation before redirect.
- Drizzle documentation supports postgres.js connections, transactions, returning inserted rows, and generated migrations.
- Zod 4 provides strict runtime schemas, ISO-date validation, refinements, and non-throwing `safeParse` results suitable for reviewed extraction data.

## Inferences

- Phase-1 persistence can be added without changing the Phase-0 package direction: domain invariants remain framework-independent, database repositories live with the PostgreSQL package, and the web app owns server actions and presentation.
- Stopping finalized Phase-1 records at `UNDER_REVIEW` preserves the canonical lifecycle and avoids inventing approval requirements before Phase 2.
- The existing audit schema is sufficient to activate a tenant-scoped hash chain if events are serialized canonically inside the same database transaction as mutations.

## Unknowns And Questions

- Obliq's local PostgreSQL Compose service still needs to be started, migrated, and tested.
- Production identity provider, object storage, malware scanning service, external AI provider, and PostgreSQL row-level security remain undecided.
- The exact Zcash read/write stack remains intentionally deferred to Phases 3 and 4.

## Not Included

- No Phase-2 policy or approval design.
- No Zcash wallet, signing, scanning, reconciliation, ledger-settlement, or evidence implementation.
- No external code or repository content was copied.
