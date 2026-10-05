# Threat model

| Threat                         | Phase-2 defense                                                                  | Later requirement                                    |
| ------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Compromised application server | No treasury spend authority or signer credential                                 | Secret isolation and least privilege                 |
| Cross-tenant access            | Active membership plus organization-scoped repositories and integration tests    | Production identity and RLS evaluation               |
| Compromised AI                 | Strict suggestions, mandatory human review; fixture sends no document externally | Provider data minimization and isolation             |
| Malicious invoice              | Size, signature and MIME checks; private generated storage path                  | Malware scanning, quarantine and retention policy    |
| Destination substitution       | Immutable history, authorized manual verification, replacement invalidation      | Cryptographic or independently attested verification |
| Duplicate invoice              | Exact blocking; possible finding blocks readiness until explicit resolution      | Additional accounting-system correlation             |
| Stale authorization            | Version-bound decisions and approval invalidation on material changes            | Operational monitoring and production identity       |
| Approval collusion/reuse       | Role checks, requester restrictions, distinct actors and transactional locks     | Configurable enterprise identity and access reviews  |
| Viewing-key leak               | No viewing material accepted                                                     | Dedicated secret storage and incident response       |
| RPC/scanner outage             | Explicit `UNAVAILABLE` adapter result                                            | Retry, telemetry and unknown-state operations        |
| Audit tampering                | Canonical SHA-256 chain, transactional ordering and verification tests           | Independent anchoring and operational monitoring     |

Threat-model changes require documentation and tests in the same phase.
