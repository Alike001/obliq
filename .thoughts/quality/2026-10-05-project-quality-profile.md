# Project Quality Profile: Obliq

## Detected Stack

Greenfield TypeScript npm-workspace repository: Next.js App Router, React, Tailwind CSS, PostgreSQL/Drizzle, and Vitest. The initial workspace contained product context only and was not a Git repository.

## Existing Commands

No commands existed. Phase 0 establishes `dev`, `format:check`, `lint`, `typecheck`, `test`, `build`, `security:secrets`, database migration commands, and the aggregate `validate` command.

## Required Local Checks

Formatting, zero-warning lint, strict TypeScript project build, unit tests, production build, and secret-pattern scan. Migration generation must be reviewed rather than applied automatically to shared environments.

## Required CI Gates

Clean install, full validation, secret-pattern scan, and high-severity production dependency audit.

## Suggested Hooks

No hook manager is added in Phase 0. Contributors should run `npm run validate` before commit; CI is authoritative. Add a lightweight pre-commit hook only after team workflow is known.

## File Size Policy

Target 200 source lines, warn above 200, and cap at 300 unless generated, a lockfile, migration, fixture, or documented exception. Current content-heavy documentation data is reviewed as content rather than executable complexity.

## Commit Policy

Use Conventional Commits. Phase gate commits should state the product outcome, for example `feat: establish Obliq product foundation`.

## AGENTS.md Notes

Current user-provided instructions require Context7 for library documentation. Context7 resolution was attempted and returned network fetch errors; official current documentation was used as fallback and the limitation recorded.

## Open Questions

Production identity provider, hosting platform, PostgreSQL RLS strategy, deployment secret manager, and exact Phase-3 Zcash viewing stack remain intentionally undecided.
