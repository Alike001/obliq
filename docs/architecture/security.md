# Security architecture

## Authority separation

The backend has no field, environment variable, or adapter for a seed phrase, private spending key, or unrestricted signer credential. A future exact settlement intent crosses an adapter boundary to an authorized external wallet/signer.

Viewing authority is separate from spending authority but remains a high-value privacy secret. It must be server-side, minimized, isolated, redacted from logs and proof pages, and covered by incident procedures before Phase 3.

## Tenant boundary

Organizations, users, and memberships form the identity boundary. Financial records carry `organization_id`. Phase 0 includes a server-only development session abstraction that is disabled unless explicitly configured for development. It is not production authentication.

## Failure semantics

- Approval does not mean settlement.
- Broadcast does not mean settlement.
- Scanner or RPC failure means unavailable/unknown, not paid or unpaid.
- Unsupported functionality is `PLANNED` or `UNAVAILABLE`, never simulated in proof paths.

## Secrets

Never commit or log seed phrases, spending keys, viewing keys, wallet RPC credentials, database passwords, or provider API keys. Public client environment variables must contain non-sensitive presentation configuration only.
