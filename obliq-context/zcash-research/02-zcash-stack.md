# Practical Zcash Builder Stack

## Product primitives

### Shielded ZEC

The core product primitive. Sender, recipient, and amount can receive
strong privacy properties in shielded flows.

### Unified Addresses

A user-facing address format capable of containing multiple receiver
types. Prefer modern wallet-compatible flows rather than forcing users
to understand historical address types.

### ZIP-321 payment requests

Useful for structured payment requests and checkout/invoice flows.

### Encrypted memos

Shielded transactions can carry private memo data. Useful for references
and workflow metadata, but do not treat the memo field as a general
database.

### Viewing keys

Selective disclosure is one of Zcash's strongest business primitives.

A business can potentially keep activity private from the public while
granting read-only visibility for a defined operational purpose. Viewing
authority must be designed carefully because different viewing-key types
reveal different information.

Potential applications: - bookkeeping - reconciliation - audit -
controlled compliance workflows - proof of selected payments - internal
finance operations

### PCZT

Partially Constructed Zcash Transactions are relevant to transaction
coordination and signing workflows. Investigate ZIP 374 and current
library support before using them.

### FROST

Threshold signing can support collaborative control and treasury/custody
use cases. Do not add FROST merely because it sounds technically
impressive.

## Application infrastructure

### librustzcash

Core Rust libraries used throughout the ecosystem.

### WebZjs

Browser-focused JavaScript/TypeScript Zcash wallet tooling. Useful for
browser-native shielded applications. Current security/review status
must be checked before production reliance.

### Zodl native SDK work

Useful reference for native Android/iOS wallet integration.

### Zebra

Full-node implementation.

### Zaino / lightwalletd

Light-client/indexing infrastructure seen in ecosystem applications.

### Slipstream

ZODL light-client sync engine.

### Zallet

Full-node wallet/RPC project intended to replace the old zcashd embedded
wallet. It was beta in the research snapshot, so verify current
stability before production use.

## Product architecture principle

Keep cryptographic authority at the edge whenever possible.

Example: User wallet / signing device ↓ authorization Application builds
or coordinates intent ↓ Zcash libraries construct/prove ↓ network

For business analytics: Business wallet ↓ restricted viewing authority
Scanner / reconciliation service ↓ normalized private ledger Business
dashboard / accountant / auditor

The exact viewing-key model must be selected based on the minimum
information each role needs.
