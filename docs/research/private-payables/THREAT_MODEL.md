# Private Payables Link threat model

## Security objective

Allow an intended counterparty to confirm one destination for one business
relationship without gaining organization access or payment authority, then
bind that version through control, external signing, read-only reconciliation
and minimal evidence.

The link is coordination authority only. It is never money, a signature, an
approval or a viewing key.

## Assets and trust boundaries

| Asset                           | Trusted reader/writer                                                | Boundary and impact                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Obligation/vendor/contact       | Authorized organization roles; server repositories                   | Cross-tenant disclosure or mutation can redirect money and expose business relationships.                              |
| Invitation token/code/session   | Intended recipient browser and narrowly scoped auth service          | Theft may expose limited context or attempt destination substitution. Store only hashes; no logs/analytics.            |
| Destination version             | Recipient proposes/confirms; authorized finance accepts under policy | Substitution redirects a future payment. Immutable versions and stale-authorization invalidation are mandatory.        |
| Approvals/policy decision       | Eligible organization members and deterministic engine               | Recipient and link routes have no access. Material changes invalidate.                                                 |
| Settlement intent/PCZT metadata | Finance app may hold sanitized intent; external signer holds PCZT    | Substitution can misdirect funds. Human compares exact intent/PCZT; app never holds signer credential.                 |
| UFVK/cache                      | Isolated observer only                                               | Compromise reveals account privacy but cannot spend. Never expose to web, recipient or evidence.                       |
| Receipt/evidence link           | Explicit recipient and anyone they share it with                     | Bearer-like disclosure of selected claims. Use high entropy, rate limits, no indexing/referrer leakage and revocation. |
| Audit chain                     | Organization-scoped application and authorized reviewers             | Detects application-history mutation; it is not blockchain immutability.                                               |

## Threat actors

- external link scanner, phisher or credential stuffer;
- compromised recipient mailbox/device;
- malicious or mistaken recipient employee;
- malicious organization member or approver;
- compromised Obliq web/application/database;
- compromised external signer/operator;
- compromised UFVK observer or data service;
- chain/RPC service returning stale or manipulated information; and
- accidental operator error, retry or network mismatch.

## Abuse cases and controls

| Threat                                         | Required control                                                                                                                                         | Residual risk                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Link theft/forwarding                          | 256-bit random token; hash at rest; short expiry; separate one-time contact verification; no mutation on GET; revocation; rate limits.                   | A compromised contact channel plus link can impersonate the recipient until detected.                                    |
| Link enumeration                               | Uniform not-found response, constant-shaped flows, high entropy, throttling, anti-indexing and no sequential public IDs.                                 | Traffic analysis can reveal service use.                                                                                 |
| Email/link-preview bot consumes invite         | GET only displays a safe interstitial; explicit POST plus code consumes; CSRF protection; idempotency.                                                   | Preview services may still learn domain/timing metadata.                                                                 |
| Phishing/open redirect                         | Fixed Obliq origin, no arbitrary return URL, clear organization/contact context after authentication, security education.                                | A visually similar domain can still deceive users.                                                                       |
| Recipient identity spoofing                    | Bind to a pre-existing contact and second channel; record method; high-value changes require finance callback/KYB.                                       | Contact control is not legal identity proof.                                                                             |
| Destination substitution                       | Validate network and shielded receiver; fingerprint confirmation; immutable version; finance review; audit; policy strengthening on new/change.          | Malware can replace clipboard/browser display; out-of-band fingerprint verification may be needed.                       |
| False ownership claim                          | Use `RECIPIENT_CONFIRMED`, not `CRYPTOGRAPHICALLY_VERIFIED`; optionally validate receiver membership with view authority only when explicitly available. | Recipient may confirm an address it does not control. Funds may become unrecoverable.                                    |
| Replay/double submission                       | One-time transactional consume, unique constraint, stable idempotency key and terminal response.                                                         | Concurrent attempts still require database locking and tests.                                                            |
| Cross-tenant access                            | Organization scope on every repository query/mutation; resource relationship and capability checks; opaque IDs are not authorization.                    | Application or DB-superuser compromise bypasses repository controls; RLS remains unimplemented defense in depth.         |
| Stale approval after destination/amount change | Material-field versioning, approval invalidation and fresh readiness.                                                                                    | Incorrect material-field classification is a design risk.                                                                |
| Intent/ZIP-321/PCZT tampering                  | Canonical intent hash, exact receiver/amount/memo/network/fee comparison, `FullPrivacy` inspection and independent human signing.                        | Zallet inspection includes creator-recorded metadata; chain observation is the independent post-broadcast check.         |
| Recipient triggers payment                     | No signer, quote, approval or broadcast capability in public routes; link cannot call finance mutations.                                                 | Compromised internal identity remains governed by existing role controls.                                                |
| Duplicate payment after timeout                | Financial operation IDs, DB uniqueness/locks, `BROADCAST_UNKNOWN`, observer reconciliation before retry.                                                 | An external signer acting outside the ceremony can still spend independently; that is treasury trust, not Obliq custody. |
| Observer/RPC unavailable                       | `UNAVAILABLE`/lag state; never infer unpaid; resume scans idempotently.                                                                                  | Delayed business close and support burden.                                                                               |
| Reorg/confirmation regression                  | Confirmation policy, continuity verification, state regression, active evidence auto-revocation.                                                         | Deep or unsupported reorg behavior must be operationally rehearsed.                                                      |
| Evidence over-disclosure                       | Server field classification, capability checks, mandatory preview, minimal default, separate receipt link.                                               | Recipient can retain/forward already disclosed content; revocation cannot erase it.                                      |
| Refund fraud                                   | Treat refund as a new obligation and authorization. Never mutate historical settlement.                                                                  | Zcash does not enforce business delivery or return terms.                                                                |
| Metadata/log leakage                           | Structured redaction; no full receiver/contact/token/code/memo/UFVK/PCZT; strict referrer/cache/CSP; telemetry review.                                   | Timing, IP and coarse event labels remain observable to infrastructure operators.                                        |

## Compromise combinations

- **Web compromised, signer safe:** attacker may alter displayed intent, but the
  treasury human must reject a mismatching PCZT. Observer later detects only
  what arrived; it cannot recover misdirected funds.
- **Signer compromised, web safe:** signer can misuse its own treasury authority
  outside Obliq. Operational isolation, human review and limited funding are
  essential; Obliq cannot cryptographically constrain an unrestricted wallet.
- **Observer compromised:** privacy is lost and false reports may be attempted.
  Database constraints and independent chain/source checks reduce false state;
  no spending authority is gained.
- **Web and signer compromised:** the primary preventive boundary is lost.
  Organization key management, independent signer devices/people and incident
  response are required; the link design cannot solve total compromise.
- **Recipient email and device compromised:** attacker can confirm its address.
  Internal change review and out-of-band verification must block readiness for
  material payments.

## Security invariants

1. Recipient authentication never creates organization membership.
2. Link possession alone cannot mutate a destination.
3. Destination confirmation is not approval or proof of wallet ownership.
4. Every destination version is immutable and historically addressable.
5. Any material change invalidates approval, readiness and prepared intent.
6. Business approval never signs Zcash.
7. Only an external human-operated signer can spend.
8. Only observer evidence can advance broadcast toward settled.
9. Infrastructure failure never becomes `UNPAID` or `SETTLED`.
10. Evidence discloses only an explicit server-authorized manifest.

## Required adversarial tests

- token guessing, expired/revoked/superseded token and link-preview GET;
- wrong/missing code, brute-force throttling and session fixation;
- concurrent confirmation/replay and database rollback;
- cross-tenant invite, vendor, obligation and destination access;
- wrong-network, transparent-only, malformed and substituted address;
- stale obligation, policy, approval, destination, quote and intent;
- mutated amount, receiver, memo, fee, network and privacy policy;
- broadcast timeout/retry and duplicate observer ingestion;
- lag, corrupt output, reorg/confirmation regression and mismatch;
- evidence minimal-field leakage, enumeration and revoked receipt;
- log/error/telemetry scans for contact, token, code, full receiver, UFVK,
  PCZT, raw transaction, seed and credentials.

## Incident and recovery requirements

- Revoke outstanding invitations and recipient sessions without deleting
  history.
- Supersede a compromised destination and force new controls/approvals.
- Quarantine signer and observer independently.
- Treat UFVK exposure as a privacy incident, rotate/rebuild account strategy
  where feasible and notify affected organizations under policy.
- Preserve uncertain broadcasts and reconcile before any replacement.
- Revoke affected evidence links while retaining immutable artifact history.
- Record incident actions without secret payloads.

## Evidence boundary and open questions

This threat model derives from implemented Obliq boundaries and reference
patterns, but the proposed recipient surface has not been built or tested. It
has not received independent security review. Open questions include recipient
identity assurance, browser clipboard compromise, vendor-contact lifecycle,
multi-organization UFVK isolation and whether target customers require signed
wallet ownership proof.
