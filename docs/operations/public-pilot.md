# Public pilot operations

Status: **IMPLEMENTED AND DEPLOYED; LIVE BROWSER ACCEPTANCE NOT YET VERIFIED**

Deployment status as of 13 October 2026:

- the separate pilot service is deployed at
  <https://obliq-public-pilot.onrender.com/pilot>;
- <https://obliq-public-pilot.onrender.com/health/ready> has returned healthy
  pilot configuration;
- browser onboarding is **UNDER VERIFICATION** after a reverse-proxy redirect
  origin caused the strict `form-action 'self'` policy to block navigation;
- the correction uses the validated `OBLIQ_APP_BASE_URL` for lifecycle
  redirects and has to pass the live browser ceremony after deployment; and
- the complete live two-browser acceptance ceremony has **not** yet passed and
  must not be represented as customer onboarding or pilot readiness.

The public pilot is a separate deployment from the database-free Render
preview. It gives each guest an expiring, PostgreSQL-backed fictional workspace
for capture and deterministic control evaluation. It deliberately does not
turn guest access into financial identity.

## Boundary

The pilot deployment mode fails startup validation unless all of these are
true:

- the session mode is database-backed guest access;
- PostgreSQL and a secret session pepper are configured;
- storage, the observer, and every Zcash network are disabled;
- public-network status is PUBLIC_NETWORK_BLOCKED;
- the application base URL is HTTPS;
- OIDC, development identities, invoice/scanner configuration, recipient
  email, viewing infrastructure, and testnet handoff files are absent.

The request boundary exposes public content, /pilot, and authenticated /app
reads. It permits only the three pilot lifecycle POST routes and Next.js server
actions under /app. Recipient APIs, /auth, /verify, uploads, and arbitrary HTTP
methods remain unavailable. Server actions independently allow only fictional
vendor/obligation writes and control evaluation. Approval, destination,
recipient, readiness, settlement, reconciliation, and evidence mutations fail
before repository execution.

Guest cookies are opaque, random, HttpOnly, Secure, SameSite=Lax, and expire
with the two-hour database session. Tokens are stored only as hashes. Each
session gets a new organization, user, membership, and workspace row. Atomic
PostgreSQL counters cap a workspace at 20 vendors, 50 obligations, and 200
total mutations. Start/reset requests also use PostgreSQL rate limits. Reset
revokes the prior session and creates a new tenant; it never reassigns or
deletes another tenant's data.

## Render preparation

render.pilot.yaml describes a **separate** web service and database. It does
not modify render.yaml or the existing preview.

1. Review the Blueprint and select a region for both resources.
2. Confirm the Blueprint resolves `OBLIQ_APP_BASE_URL` from the
   `obliq-public-pilot` service's Render-provided `RENDER_EXTERNAL_URL`.
3. Let Render generate OBLIQ_SESSION_PEPPER; never copy it into Git.
4. Keep automatic deploys off.
5. Review the migration from an empty database, then manually deploy.
6. Verify /health/ready reports pilot, guest, disabled storage/network/
   observer, PostgreSQL rate limits, and PUBLIC_NETWORK_BLOCKED.
7. Execute the two-browser tenant-isolation ceremony before sharing the URL.

Run that ceremony only against the exact HTTPS service origin:

```bash
OBLIQ_PILOT_ACCEPTANCE_URL=https://obliq-public-pilot.onrender.com \
OBLIQ_PILOT_ACCEPTANCE_ORIGIN=https://obliq-public-pilot.onrender.com \
npm run accept:pilot
```

The script performs real browser form submissions for workspace start and
reset, creates fictional PostgreSQL records, and consumes rate-limit capacity.
It checks HTTPS same-origin redirects, Secure/HttpOnly/SameSite cookies,
persistence, duplicate blocking, policy evaluation, tenant isolation and
desktop/mobile behavior. A browser crash or uncertain navigation is a failure,
never a pass. Do not run it repeatedly against the public service.

The Free web service is 0.1 CPU/512 MB and can spin down. Free PostgreSQL is
limited to 1 GB, has no backups or managed connection pooling, and expires
after 30 days. It is therefore suitable only for a short fictional pilot, not
production. As of 12 October 2026 the temporary option is **$0/month**. The
smallest always-on paid topology is approximately **$13/month** before
bandwidth/storage growth ($7 web plus $6 PostgreSQL). Confirm pricing in the
dashboard before approval.

Sources:

- [Render free instances and PostgreSQL limits](https://render.com/docs/free)
- [Render compute and pricing](https://render.com/pricing)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)

No resource may be provisioned from this document without owner approval.

## Migration and rollback

The Free plan has no pre-deploy command, so the Blueprint runs migrations in
the build command before the Next.js build. Deploy only one revision at a time.
A migration failure stops the build. The application never falls back to
in-memory persistence.

Rollback procedure:

1. Disable public access or suspend the pilot web service.
2. Preserve the database for incident review; do not delete guest tenants as a
   rollback shortcut.
3. Roll back application code only to a revision compatible with the applied
   schema. Database migrations are forward-only; use a reviewed corrective
   migration rather than rewriting history.
4. Rotate the session pepper to invalidate every pilot cookie if session
   compromise is suspected.
5. Confirm the original read-only preview remains on its independent service.

Free PostgreSQL has no backups. A longer pilot requires a paid database with
backups before it can be described as durable beyond the trial window.
