# Threat model

| Threat                         | Phase-1 defense                                                                  | Later requirement                                      |
| ------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Compromised application server | No treasury spend authority or signer credential                                 | Secret isolation and least privilege                   |
| Cross-tenant access            | Active membership plus organization-scoped repositories and integration tests    | Production identity and RLS evaluation                 |
| Compromised AI                 | Strict suggestions, mandatory human review; fixture sends no document externally | Provider data minimization and isolation               |
| Malicious invoice              | Size, signature and MIME checks; private generated storage path                  | Malware scanning, quarantine and retention policy      |
| Destination substitution       | Immutable history; manual records explicitly UNVERIFIED                          | Verification, reverification and approval invalidation |
| Duplicate invoice              | Deterministic exact blocking and possible findings                               | Operational resolution workflow                        |
| Viewing-key leak               | No viewing material accepted                                                     | Dedicated secret storage and incident response         |
| RPC/scanner outage             | Explicit `UNAVAILABLE` adapter result                                            | Retry, telemetry and unknown-state operations          |
| Audit tampering                | Canonical SHA-256 chain, transactional ordering and verification tests           | Independent anchoring and operational monitoring       |

Threat-model changes require documentation and tests in the same phase.
