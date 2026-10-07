# Production deployment and recovery

Status: architecture **IMPLEMENTED**; provider credentials and infrastructure
are deployment-specific.

## Topology

| Component              | Placement                                            | Authority / data                                                       |
| ---------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Next.js web            | stateless web runtime with persistent network access | business commands; no Zcash secret                                     |
| PostgreSQL             | private managed/stateful service                     | canonical financial records, hashed sessions, rate limits, audit chain |
| S3-compatible storage  | private object store                                 | quarantined invoice bytes; generated keys only                         |
| Scanner                | private HTTPS service                                | temporary object access; CLEAN/REJECTED result                         |
| Observer               | isolated persistent host                             | UFVK and encrypted/private SQLite cache; no spend authority            |
| External signer/Zallet | separate operator-controlled host                    | treasury spend authority; never a web dependency                       |
| Zcash data service     | private authenticated TLS endpoint                   | compact blocks/tree state/transactions                                 |

A serverless Next.js deployment alone cannot run the observer, signer, scanner
or PostgreSQL. The observer needs persistent storage and stable private network
access. The signer must not share the web application's runtime or secrets.

## Deployment gate

1. Provision PostgreSQL backups and point-in-time recovery. Give the app a
   non-owner role; retain a separate migration role.
2. Run migrations as a one-off job, then `npm run runtime:check` with production
   settings before shifting traffic.
3. Configure OIDC redirect URI exactly as `${OBLIQ_APP_BASE_URL}/auth/callback`
   and provision issuer/subject mappings plus memberships.
4. Configure private storage, encryption/KMS and scanner access. Deny public
   bucket ACLs and lifecycle quarantined objects at the documented retention.
5. Start observer on an isolated host with UFVK injected by secret manager.
   Restrict cache permissions and encrypted backups.
6. Keep Zallet RPC loopback/private and behind an authenticated encrypted
   operator boundary. The app receives only sanitized receipts.
7. Require `/health/live` and `/health/ready`; readiness validates runtime
   configuration and PostgreSQL. Observer health is separately operational.

Rollback application code without rolling back an applied financial migration.
Use forward-fix migrations; rehearse restore into an isolated database. Never
infer a payment state while PostgreSQL, signer or observer outcome is unknown.

## Operations

- Rotate the session pepper only with an intentional global logout plan.
- Expire consumed OIDC challenges, expired sessions and old rate buckets in a
  scheduled maintenance job.
- Review auth failures, signer/observer unavailability, reconciliation
  exceptions and evidence integrity failures from redacted structured logs.
- Invoice deletion follows contractual/accounting retention; removal must be
  audited before object deletion is automated.
- Public testnet synchronization is ready for an explicitly authorized funded
  test under ADR 0011. Mainnet remains fail-closed. Production must keep
  `OBLIQ_ZCASH_NETWORK=regtest` until a real public shielded observation and the
  owned Zebra/Zaino topology have been verified.
