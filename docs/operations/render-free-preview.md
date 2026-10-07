# Render Free public preview

Status: **READY_FOR_RENDER_FREE_PREVIEW** after review and merge. This is a
read-only presentation deployment, not an Obliq production environment.

## Security boundary

Preview mode is an explicit runtime mode. It requires authentication, document
storage, the Zcash network, and the observer to be `disabled`; requires public
network status `PUBLIC_NETWORK_BLOCKED`; rejects `DATABASE_URL`, observer
configuration, OIDC client secrets, scanner tokens, and storage buckets; and
requires an HTTPS application URL. Invalid combinations make the runtime check
fail before Next.js starts.

The request proxy allows only `GET` and `HEAD` requests for:

- `/`, `/docs` and `/docs/*`;
- `/security` and `/proof`;
- `/health/live` and `/health/ready`;
- the application icon and Next.js build assets.

It rejects server actions, mutations, `/app/*`, `/auth/*`, and `/verify/*`.
Server actions and database-backed verification also enforce the preview block
inside their server boundaries. Public evidence packages cannot be verified
without canonical PostgreSQL records and shared rate limiting, so the preview
does not pretend to support them. `/proof` shows only safe embedded regtest
evidence and actual disabled runtime states.

## Render configuration

Create a **Free Node web service** from the reviewed branch or merged commit.
`render.yaml` contains the same configuration with automatic deploys disabled.

| Setting           | Exact value                                                |
| ----------------- | ---------------------------------------------------------- |
| Root Directory    | repository root (`.`)                                      |
| Build Command     | `npm ci && npm run preview:check && npm run build:preview` |
| Start Command     | `npm run start:preview`                                    |
| Health Check Path | `/health/ready`                                            |
| Node version      | `24.21.0`                                                  |
| Plan              | Free (`0.1 CPU`, `512 MB RAM`)                             |

Set these environment variables exactly:

```text
NODE_VERSION=24.21.0
NEXT_TELEMETRY_DISABLED=1
OBLIQ_DEPLOYMENT_MODE=preview
OBLIQ_SESSION_MODE=disabled
OBLIQ_STORAGE_MODE=disabled
OBLIQ_ZCASH_NETWORK=disabled
OBSERVER_NETWORK=disabled
OBLIQ_PUBLIC_NETWORK_STATUS=PUBLIC_NETWORK_BLOCKED
OBLIQ_APP_BASE_URL=https://<exact-service-name>.onrender.com
```

Do not configure `DATABASE_URL`, OIDC credentials, storage credentials,
scanner credentials, observer paths/endpoints, viewing authority, or signer
material. `next start --hostname 0.0.0.0` reads Render's assigned `PORT`.

Render Free services spin down after 15 minutes without traffic and use an
ephemeral filesystem. A cold request can take about a minute. The preview does
not write runtime data, so filesystem loss is harmless. Free usage is subject
to Render's monthly instance-hour, build-minute, and bandwidth allowances; set
an account spend limit or omit a payment method if a strict zero-charge ceiling
is required.

## Deployment verification

1. Deploy a reviewed commit manually; keep automatic deploys off.
2. Require `/health/ready` to return HTTP 200 with `deploymentMode: preview`,
   `database: disabled`, `authMode: disabled`, `network: disabled`, and
   `PUBLIC_NETWORK_BLOCKED`.
3. Check `/`, `/docs/overview`, `/security`, and `/proof` return HTTP 200.
4. Check `/app`, `/auth/login`, `/verify/test`, and a `POST /` return HTTP 404.
5. Confirm `/proof` shows `PREVIEW`, disabled runtime dependencies, no database,
   regtest-only historical evidence, and blocked public-network status.

## Rollback

Render Free retains the two most recent deploys. From the service dashboard,
select the last known-good deploy and choose **Rollback**. If configuration is
suspect, suspend the service first, restore the exact environment allowlist
above, run a manual deploy, and repeat every verification step. Never make the
preview available by switching it to development or production mode, adding a
development identity, or pointing it at a disposable database.

Removing the service is safe because it owns no persistent Obliq state. It does
not affect the independent public-testnet qualification observer, wallet, or
settlement ceremony.
