# Build Principles

## Build the company, prove the hardest loop

Do not intentionally cripple the product because it is a hackathon.

Build a coherent product architecture. Prioritize implementation in this
order: 1. protocol/technical feasibility 2. core user workflow 3.
security boundaries 4. durable backend/data model 5. real Zcash
integration 6. polished UX 7. supporting features

## No fake privacy claims

For every data field document: - who creates it - where it is stored -
whether it is on-chain - whether it is encrypted - who can decrypt/read
it - what metadata still leaks - how it is deleted or retained

## No server spend keys by default

Prefer non-custodial authorization. If a design ever requires custody,
state it explicitly and threat-model it before implementation.

## Separate payment state

Never collapse: - request created - transaction detected - transaction
mined - required confirmations reached - business settlement complete

## Build evidence

Maintain: - integration tests - transaction IDs where safe to disclose -
testnet/mainnet evidence policy - deterministic demo data - architecture
diagram - threat model - privacy model - failure/recovery cases - source
citations for protocol assumptions

## UX rule

Users should interact with: - invoice - vendor - bill - payout -
approval - receipt - report

They should not have to think in terms of: - nullifiers - note
commitments - trial decryption - witness trees - proving circuits

Those belong below the product surface unless the user is a developer.
