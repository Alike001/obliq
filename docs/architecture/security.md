# Security architecture

## Authority separation

The backend has no field, environment variable, or adapter for a seed phrase, private spending key, or unrestricted signer credential. An exact settlement intent crosses a one-way handoff to a human-operated external Zallet. Obliq never receives its RPC credential, PCZT, raw transaction, mnemonic, passphrase or spending key.

Viewing authority is separate from spending authority but remains a high-value privacy secret. The Rust observer imports a UFVK as `AccountPurpose::ViewOnly`; its API exposes only status and observations. The UFVK is injected out-of-band, never stored in PostgreSQL, rendered, logged, or returned through application APIs. The SQLite scan cache also requires encryption and isolation because it contains privacy-sensitive wallet state.

## Tenant boundary

Organizations, users, and memberships form the identity boundary. Financial records carry `organization_id`. Repositories apply the organization predicate to reads and writes, and control commands enforce Finance, Treasury, CFO, Owner or Policy Administrator capabilities as appropriate.

Production uses OIDC authorization code with PKCE, state and nonce checks. Issuer/subject identities are pre-provisioned and never derive roles from client claims. Random session tokens are stored only as keyed hashes, expire after eight hours and are revocable; every request rechecks active membership. Cookies are HTTP-only, SameSite and Secure in production. Development identity is an explicit separate mode that production rejects. Server Actions use framework origin checks and logout adds an explicit same-origin check.

PostgreSQL RLS is not claimed. ADR 0009 records why the current pool lacks safe transaction-local tenant identity and the compensating scoped repository, membership, capability and integration-test controls.

## Invoice and extraction boundary

Invoice content is accepted only after a server-side size, signature and MIME-agreement check. Production stores bytes under a generated organization-scoped quarantine key in private S3-compatible storage with server-side encryption and no public URL. A separately authenticated HTTPS scanner must return CLEAN before an invoice source is created; unavailable or malformed scanner output fails closed. Development local files and `DEVELOPMENT_UNSCANNED` are visibly separate. Retention is recorded; deletion remains an audited operational procedure.

The extraction fixture does not inspect document bytes or transmit them externally. All structured output is a suggestion requiring human review. A future provider requires an explicit data-exposure review before integration.

## Vendor and duplicate integrity

Destinations are immutable historical records. Authorized Treasury, CFO or Owner actors can record `VERIFIED_MANUALLY` with method and note; this does not claim cryptographic receiver ownership. Replacement supersedes rather than overwrites history and invalidates obligation authorization. Exact duplicate rules are deterministic and block creation; possible findings must be explicitly resolved before reevaluation.

## Control and approval boundary

Policy versions are immutable. Decisions bind an obligation version and exact destination version, and approval requirements derive from that decision. Role eligibility, requester restrictions and distinct-actor thresholds are checked in the database transaction. Material obligation edits and destination replacement invalidate approvals. Readiness returns structured reasons and rechecks current policy, obligation, destination, duplicates, findings and thresholds.

`READY_TO_SETTLE` is business authorization only. It is not a Zcash signature, transaction, broadcast or settlement observation.

## Settlement execution boundary

Quotes expire and bind exact business minor units to exact zatoshis. The intent
fingerprint binds obligation and policy versions, destination version and
receiver, quote, network, privacy mode and opaque memo reference. Signing and
broadcast receipt commands revalidate current authorization and reject stale or
conflicting retries. Destination or obligation changes invalidate uncompleted
intents. `SIGNED`, `BROADCAST`, `DETECTED`, `CONFIRMING` and `SETTLED` are
separate states; the observer is the only component that can produce settlement
evidence.

The external signer remains a major trust boundary. Its RPC is privileged
plaintext HTTP and must be loopback/private only. The operator must compare
Zallet `pczt_inspect` output with the Obliq review surface. Compromise of both
the application and signer can authorize malicious payment; production requires
independent devices/operators and hardened signer operations.

## Failure semantics

- Approval does not mean settlement.
- Broadcast does not mean settlement.
- Scanner or RPC failure means unavailable/unknown, not paid or unpaid.
- Unsupported functionality is `PLANNED` or `UNAVAILABLE`, never simulated in proof paths.
- Chain tip and fully-scanned height are distinct. A reachable but lagging observer cannot finalize reconciliation.
- Receiver, opaque memo-reference and exact zatoshis must all match; amount alone cannot correlate a payment.

## Evidence and disclosure boundary

Evidence derives only from a `SETTLED` obligation, `SETTLED` settlement and
matching reconciliation observation. The server accepts only enumerated field
keys. Viewing material, destination data, memo data, signer credentials, raw
transactions and internal policy findings have no disclosable field key.
Finance users may create public-safe or counterparty receipts; Owner, CFO or
Accountant capacity is required for FINANCE/AUDIT claims. Only Owner or CFO may
revoke evidence.

External verification uses a random 256-bit URL-safe identifier, never an
internal package UUID. Anyone holding the link can read the selected fields, so
links remain recipient-confidential. Responses and JSON downloads are dynamic,
no-store, no-referrer, nosniff and noindex. PostgreSQL-backed limits protect
verification/download and access records retain only a subject fingerprint and
outcome. Artifact content is immutable and SHA-256 checked before display or
download. Revoked and superseded artifacts remain visible with an explicit
warning. Confirmation regression or mismatch automatically revokes active
evidence for the affected settlement.

## Secrets

Never commit or log seed phrases, spending keys, viewing keys, wallet RPC credentials, database passwords, or provider API keys. Public client environment variables must contain non-sensitive presentation configuration only.

Structured operational logging recursively redacts secret-bearing keys and known Zcash viewing/spending patterns. Runtime proof and health output use an allowlist of modes/statuses. The observer sidecar reports its network identity; application/observer mismatch fails closed. The current CSP deliberately permits inline Next.js scripts/styles; it still denies external scripts, objects, frames and base sources. A nonce-based CSP remains future browser-hardening work.
