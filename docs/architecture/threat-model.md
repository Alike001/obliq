# Threat model

| Threat                         | Current defense                                                                   | Later requirement                                    |
| ------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Compromised application server | No treasury spend authority or signer credential                                  | Secret isolation and least privilege                 |
| Cross-tenant access            | Active membership plus organization-scoped repositories and integration tests     | Production identity and RLS evaluation               |
| Compromised AI                 | Strict suggestions, mandatory human review; fixture sends no document externally  | Provider data minimization and isolation             |
| Malicious invoice              | Size, signature and MIME checks; private generated storage path                   | Malware scanning, quarantine and retention policy    |
| Destination substitution       | Immutable history, authorized manual verification, replacement invalidation       | Cryptographic or independently attested verification |
| Duplicate invoice              | Exact blocking; possible finding blocks readiness until explicit resolution       | Additional accounting-system correlation             |
| Stale authorization            | Version-bound decisions and approval invalidation on material changes             | Operational monitoring and production identity       |
| Approval collusion/reuse       | Role checks, requester restrictions, distinct actors and transactional locks      | Configurable enterprise identity and access reviews  |
| Viewing-key leak               | UFVK isolated to server-only observer; redaction tests; no DB/browser/proof value | Secret manager, rotation and incident response       |
| Observer compromise            | ViewOnly import and no spending API; separate scan cache                          | Process isolation, encrypted cache and access review |
| RPC/node manipulation          | Fully-scanned height tracked separately; exact correlation tuple                  | Authenticated TLS, multi-source/monitoring strategy  |
| RPC/scanner outage             | Persisted `UNAVAILABLE` leaves financial state unchanged                          | Retry, telemetry and unknown-state operations        |
| Memo/log privacy leakage       | Opaque memo only; business DB stores its digest; allowlisted evidence fields      | Structured-log enforcement and retention policy      |
| Reconciliation false positive  | Receiver + memo + exact zatoshis required; amount alone rejected                  | Public-network operational qualification             |
| Audit tampering                | Canonical SHA-256 chain, transactional ordering and verification tests            | Independent anchoring and operational monitoring     |

Threat-model changes require documentation and tests in the same phase.
