# Threat model

| Threat                         | Phase-0 defense                                        | Later requirement                                          |
| ------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------- |
| Compromised application server | No treasury spend authority or signer credential       | Secret isolation and least privilege                       |
| Cross-tenant access            | Organization IDs throughout schema; domain guard       | Authenticated server membership checks and RLS evaluation  |
| Compromised AI                 | No provider integration; suggestion-only type boundary | Data minimization, schema validation and audit             |
| Destination substitution       | Versionable destination schema                         | Reverification and approval invalidation                   |
| Viewing-key leak               | No viewing material accepted in Phase 0                | Dedicated secret storage and incident response             |
| RPC/scanner outage             | Explicit `UNAVAILABLE` adapter result                  | Retry, telemetry and unknown-state operations              |
| Evidence tampering             | Hash-chain fields reserved                             | Canonical serialization, chain generation and verification |

Threat-model changes require documentation and tests in the same phase.
