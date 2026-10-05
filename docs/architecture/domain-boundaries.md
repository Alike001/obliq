# Domain boundaries

## Domain

Owns exact money types, lifecycle vocabulary, authority types, and tenant guards. A future settlement cannot exist without an obligation. `APPROVED`, `BROADCAST`, and `SETTLED` are distinct states.

## Policy

Evaluates deterministic, versioned rules and returns structured findings and approval requirements. The database application layer records decisions against exact obligation, policy and destination versions, authorizes approval actions, invalidates stale authorization and invokes readiness explicitly. It does not call AI, price assets, sign or broadcast.

## Ledger (planned)

Will record private business accounting entries tied to obligations and, where applicable, settlements. Network state does not overwrite business truth without reconciliation evidence.

## Evidence (planned)

Will derive integrity-protected artifacts from canonical records. Application evidence is not a zero-knowledge proof or a blockchain.

## AI (planned)

May extract, classify, summarize, suggest, and flag anomalies. It may never approve, sign, broadcast, bypass policy, replace a verified destination, or hold spend authority. Any financially relevant output requires schema validation and human review.
