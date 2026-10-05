# Domain boundaries

## Domain

Owns exact money types, lifecycle vocabulary, authority types, and tenant guards. A future settlement cannot exist without an obligation. `APPROVED`, `BROADCAST`, and `SETTLED` are distinct states.

## Policy (planned)

Will evaluate deterministic, versioned rules and produce recorded decisions. It must not call AI or mutate settlement state implicitly. Material amount, vendor, destination, or obligation changes invalidate relevant approvals.

## Ledger (planned)

Will record private business accounting entries tied to obligations and, where applicable, settlements. Network state does not overwrite business truth without reconciliation evidence.

## Evidence (planned)

Will derive integrity-protected artifacts from canonical records. Application evidence is not a zero-knowledge proof or a blockchain.

## AI (planned)

May extract, classify, summarize, suggest, and flag anomalies. It may never approve, sign, broadcast, bypass policy, replace a verified destination, or hold spend authority. Any financially relevant output requires schema validation and human review.
