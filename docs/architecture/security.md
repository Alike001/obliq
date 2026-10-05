# Security architecture

## Authority separation

The backend has no field, environment variable, or adapter for a seed phrase, private spending key, or unrestricted signer credential. A future exact settlement intent crosses an adapter boundary to an authorized external wallet/signer.

Viewing authority is separate from spending authority but remains a high-value privacy secret. It must be server-side, minimized, isolated, redacted from logs and proof pages, and covered by incident procedures before Phase 3.

## Tenant boundary

Organizations, users, and memberships form the identity boundary. Financial records carry `organization_id`. Phase 1 repositories apply the organization predicate to reads and writes, and the server-only development session must resolve an active database membership. It remains development infrastructure, not production authentication.

## Invoice and extraction boundary

Invoice content is accepted only after a server-side size, signature and MIME-agreement check. Storage uses an organization scope and generated opaque name; the original filename is metadata and never a filesystem path. No public download route exists. Production malware scanning, object-storage isolation, retention rules and encryption operations remain planned.

The extraction fixture does not inspect document bytes or transmit them externally. All structured output is a suggestion requiring human review. A future provider requires an explicit data-exposure review before integration.

## Vendor and duplicate integrity

Manual destinations are immutable historical records and remain `UNVERIFIED`. Replacement supersedes rather than overwrites history. Exact duplicate rules are deterministic and block creation; possible findings remain visible for human review.

## Failure semantics

- Approval does not mean settlement.
- Broadcast does not mean settlement.
- Scanner or RPC failure means unavailable/unknown, not paid or unpaid.
- Unsupported functionality is `PLANNED` or `UNAVAILABLE`, never simulated in proof paths.

## Secrets

Never commit or log seed phrases, spending keys, viewing keys, wallet RPC credentials, database passwords, or provider API keys. Public client environment variables must contain non-sensitive presentation configuration only.
