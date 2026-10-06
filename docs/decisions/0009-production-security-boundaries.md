# ADR 0009: Production identity, abuse, storage and tenant boundaries

Status: Accepted — Phase 6

## Decision

Production uses an OpenID Connect authorization-code flow with PKCE, state and
nonce validation. Provider identities are pre-provisioned into
`auth_identities`; Obliq does not infer roles from claims or email domains. A
successful callback creates a random, hashed, eight-hour database session and
every request re-resolves an active organization membership. Logout revokes the
session. Development identity is an explicit separate mode and production
startup rejects it.

Sensitive operations use atomic PostgreSQL fixed-window buckets. PostgreSQL is
already mandatory and gives all web instances a shared limit without adding a
process-local security illusion. A database outage fails the operation closed.
Larger deployments may replace this behind the same boundary with a dedicated
distributed service.

Production invoice objects use private S3-compatible storage with generated
quarantine keys, server-side encryption, no public URL and no executable
serving. A separately authenticated HTTPS scanner must return a strict CLEAN
result before Obliq creates an invoice source. Local files and the no-op scanner
remain development-only.

## RLS decision

PostgreSQL row-level security is not enabled in Phase 6. The current pooled
connection does not set an authenticated tenant identity on each transaction;
adding policies without that binding would either break background work or
create a misleading bypass-prone control. Defense is instead explicit
organization predicates, active-membership/capability checks, foreign keys,
transactional locks and adversarial integration tests. Production DB roles
must not be exposed outside the application/worker boundary.

RLS is reconsidered when all repositories and workers use transaction-local
tenant context (`SET LOCAL`) and migrations run under a distinct owner role.
Until then, `/proof` must not claim RLS.

## Consequences

- OIDC credentials and an issuer are deployment configuration, not repository
  fixtures. Without them production readiness fails.
- Organization provisioning is an administrative operation; login never
  auto-creates a membership.
- Verification-link access logs contain only a keyed subject fingerprint,
  package relationship, outcome and timestamp—never disclosed claims.
- Scanner availability is required for production ingestion. Unknown is not
  clean.
