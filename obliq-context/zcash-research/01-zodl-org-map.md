# ZODL Organization and Repository Map

## What ZODL is

Zcash Open Development Lab (ZODL) was formed in 2026 by the team that
previously built Zcash core protocol technology and the Zashi wallet at
Electric Coin Company. Zashi was rebranded to Zodl. ZODL now works
across protocol engineering and user-facing Zcash UX.

This makes ZODL valuable to us for two reasons:

1.  Its repositories show the direction of modern Zcash infrastructure.
2.  Its code can be prior art or infrastructure for a product, rather
    than something we should recreate unnecessarily.

## High-signal repositories observed

### zodl-ios

Flagship Zodl wallet for iOS.

Use as: - UX reference - wallet-flow reference - address/payment
behavior reference - integration reference

Do not copy it into another generic wallet.

### zodl-android

Flagship Zodl wallet for Android.

Use as: - Android wallet reference - production wallet architecture
reference - shielded transaction UX reference

### zodl-project

Shared issue tracking and resources for Zodl wallets. Includes a wallet
threat model and responsible disclosure material.

Use as: - threat-model input - product safety input - source of real
wallet pain points

### zodl-swift-wallet-sdk

iOS light-client framework proof of concept.

Use as: - native integration reference - mobile SDK architecture
reference

### zodl-android-wallet-sdk

Native Android SDK for Zcash.

Use as: - Android integration reference

### slipstream

A performant light-client sync engine for Zcash wallets.

Strategic meaning: Wallet synchronization remains an important Zcash
engineering problem. If our product needs wallet-like state, prefer
existing sync infrastructure rather than inventing a scanner unless our
business requirement truly needs a specialized indexer.

### zebra

ZODL variant of the Zcash full node.

Use when: - direct node access is needed - backend/indexing architecture
needs canonical chain data - infrastructure testing requires a node

### pczt-ledger

Transport-agnostic Rust engine for signing Zcash PCZTs with Ledger
hardware wallets.

Strategic meaning: Zcash is developing stronger transaction coordination
and hardware-signing primitives. This can matter for business treasury,
approval workflows, and higher-value operational finance.

### zcash_voting

Shielded voting library, including protocol/proof/storage/FFI work.

### vote-nullifier-pir

Private Information Retrieval work for Zcash nullifier non-membership
proofs.

### voting-circuits

Circuit work related to shielded voting.

Strategic meaning: ZODL is exploring applications beyond simple
payments. Privacy-preserving governance is active prior art, so "private
voting" alone is not a fresh startup thesis.

### Zakura-related repositories

Observed repositories include `zakura`, `zakura-wallet-libraries`, and
`zakura-common`.

Strategic meaning: There is active work on a scalable/full-node and
wallet-layer stack. Treat the exact APIs and production readiness as
moving targets. Verify current upstream documentation before choosing
them as dependencies.

### zcash-docs

Documentation source and historical ReadTheDocs material.

Use as: - protocol terminology reference - historical documentation -
implementation background

## Architecture lesson

A useful mental model is:

Product / workflow layer ↓ wallet or application integration ↓ wallet
SDK / librustzcash / WebZjs / related libraries ↓ sync/indexing layer
such as lightwalletd, Zaino, Slipstream ↓ node layer such as Zebra /
newer node stacks ↓ Zcash consensus network

Our startup should ideally live high enough in this stack that the user
pays for a valuable workflow, while relying on the lower layers for
Zcash-specific cryptography and networking.

## Avoid

-   rewriting a wallet SDK without a clear missing capability
-   creating another Zodl clone
-   treating a node dashboard as the whole startup
-   inventing custom cryptography
-   handling spend keys on a centralized server without an explicit
    security design
