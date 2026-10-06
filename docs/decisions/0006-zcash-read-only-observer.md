# ADR 0006: Zcash read-only observer

- Status: Accepted; regtest tracer passed, public-network operations gated
- Date: 2026-10-05
- Decision owners: Engineering and Security
- Supersedes: No prior decision

## Context

Phase 3 must prove that Obliq can observe and reconcile a real shielded Zcash
payment without giving the reconciliation component spending authority. An
exported viewing key is insufficient evidence: the selected stack must import
that authority, synchronize the relevant shielded pool, decrypt the output and
memo, recover a correlation signal, track confirmations, handle reorganizations
without false conclusions, and expose no signing API.

Current official specifications and implementations override the older research
notes. The source and version evidence for this decision is recorded in
`.thoughts/research/2026-10-05-phase-3-zcash-read-path.md`.

## Decision drivers

- Orchard-capable read-only observation
- A key type that cryptographically lacks spend authority
- Exact, version-pinned import and scanning behavior
- Diversified receiver and memo recovery
- Honest synchronization, confirmation, and reorganization semantics
- Server-only deployment with controllable network and logging boundaries
- Maintained, permissively licensed upstream components
- A path from local tracer evidence to production operation

## Candidates

| Candidate                                                             | Orchard and viewing-key support                                                                                                                                                                                           | Synchronization and correlation                                                                                                                                                                                        | Authority boundary                                                                                                                                                                                                                                    | Maturity and deployment                                                                                                                                                                                        | Decision                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A. Zallet watch-only RPC                                              | Zallet exports UFVK/UIVK values. Released `v0.1.0-beta.3` does not implement `z_importviewingkey`; current `main` documents Sapling extended FVK import only. No proven Orchard watch-only import exists.                 | Zallet can sync and derive Unified Addresses, but the missing import method prevents the required external read-authority workflow. Its shielded account views also do not prove exact obligation-address correlation. | A view-only mode would be desirable, but the required method is absent. Running a spend-capable treasury wallet in the observer would violate the boundary.                                                                                           | Beta, not fully externally reviewed, Linux/co-located Zebra constraints for the preferred backend. MIT/Apache-2.0.                                                                                             | Rejected for Phase 3. Export is not import.                                                   |
| B. Direct librustzcash observer with a lightwalletd-compatible source | `zcash_client_backend`/`zcash_client_sqlite` 0.24.0 import UFVKs with `AccountPurpose::ViewOnly`, construct Orchard scanning keys, decrypt received Orchard outputs, and retain received values, diversifiers, and memos. | The maintained sync engine consumes compact blocks and transaction enhancement data, reports fully scanned height, prioritizes verification ranges after reorgs, and supports deterministic diversified addresses.     | Import returns no spending key. The observer process and API will contain only a UFVK and expose no proposal, signing, or broadcast methods. Imported-viewing-key Orchard notes are explicitly treated as non-spendable by the tagged implementation. | Library integration requires a small Rust service and an encrypted scan cache. Upstream is maintained and MIT/Apache-2.0. Production requires an Obliq-operated, TLS-protected lightwalletd-compatible source. | Selected, conditional on the end-to-end tracer.                                               |
| C. Zallet observer restricted to Sapling FVK                          | Current `main` documents Sapling full-viewing-key import; Orchard is unavailable through that path.                                                                                                                       | It could observe Sapling, but would force receiver/pool constraints that are weaker than Obliq's current Unified Address and Orchard direction.                                                                        | Read-only for the imported Sapling account.                                                                                                                                                                                                           | Smaller application integration, but still beta and would create migration and privacy debt.                                                                                                                   | Rejected. Obliq will not weaken the product to Sapling-only or present it as Orchard support. |
| D. Raw Zebra/RPC transaction inspection                               | A full node sees commitments, not recipient plaintext, value, or memo for shielded outputs.                                                                                                                               | It can track transaction inclusion and chain height only after another component supplies a transaction identifier; it cannot identify/decrypt an incoming shielded payment.                                           | No wallet spend authority, but also insufficient read authority.                                                                                                                                                                                      | Operationally mature node path; technically unable to satisfy the primary question alone.                                                                                                                      | Rejected as observer; retained as the validating node beneath the data service.               |

## Decision

Use a dedicated, server-only Rust observer pinned to the
`zcash_client_backend` 0.24.0 release family and backed by
`zcash_client_sqlite`.

The observer imports a Unified Full Viewing Key with
`AccountPurpose::ViewOnly`. Its local wallet database is an operational shielded
scan cache, separate from Obliq's PostgreSQL business records. It synchronizes
through a lightwalletd-compatible gRPC source backed by Zebra. The production
target is an Obliq-operated service over authenticated TLS. The tracer may use
Zaino on the isolated Z3 regtest network, because Zaino implements the same
compact-block protocol and the Z3 stack pins the complete environment.

The TypeScript-facing `ZcashObserver` contract may expose only:

- health and synchronization status;
- normalized received-output observations;
- confirmation progression;
- stable observer/source metadata and non-secret evidence references.

It must expose no transaction construction, proposal, signing, key derivation
from seed, or broadcast method. A distinct future signer boundary may not be
added in Phase 3.

## Correlation decision

The target correlation tuple is:

1. an exact diversified Unified Address allocated to one settlement attempt;
2. a versioned, random opaque Obliq reference encoded in a shielded memo; and
3. exact integer amount as a consistency check, never the sole identifier.

The memo contains no vendor, invoice, policy, approval, or organization name.
The observer persists only a digest of the expected opaque reference in
ordinary business storage. The tracer recovered receiver context, exact amount,
and the opaque memo from the actual Ironwood output, so this tuple is selected.

## Synchronization and state semantics

- `observer reachable` does not imply `wallet caught up`.
- `DETECTED` means a matching received output was decrypted and recorded.
- `CONFIRMING` means it is on the observer's current main-chain view but below
  the configured confirmation threshold.
- `CONFIRMED` is reached only at that threshold and may drive the subordinate
  reconciliation state.
- `UNAVAILABLE` and `SYNC_LAGGING` are infrastructure states, never evidence of
  non-payment.
- A disappeared or moved observation after reorganization is retained as
  history and returned to a non-final/exception state; it is never silently
  deleted.
- Ingestion is idempotent on network, transaction identifier, shielded pool,
  and output/action index.

## Secret boundary

The UFVK is privacy-sensitive secret material even though it cannot spend.

- It is loaded only by the observer process from a dedicated secret provider.
- It is never stored in PostgreSQL, browser state, application APIs, audit
  payloads, logs, proof output, screenshots, or committed configuration.
- Structured logging uses allowlisted fields, not arbitrary error/debug dumps.
- The local scan cache and its backups require encryption and access controls.
- A compromised observer is assumed to reveal account transaction history and
  correlation metadata, but must still be unable to authorize expenditure.

## Tracer result

The gate passed on the official isolated Z3 regtest environment on 2026-10-06:

- the observer imports only the UFVK;
- the sender/signing wallet runs outside Obliq;
- the output, exact amount, receiver context, and opaque memo are recovered;
- detection and at least one confirmation progression are recorded;
- repeated ingestion is idempotent;
- the observer has no spending API or spending key;
- safe evidence records the exact network, versions, block, transaction
  reference, and timestamps without exposing viewing material.

The external Zallet sender created a fully shielded 1.25 ZEC output. A separate
recipient UFVK imported with `AccountPurpose::ViewOnly` detected it at height
115, recovered the expected opaque reference (not retained in this ADR), and recorded progression from one to three
confirmations. Canonical transaction id:
`17e402b28c31fb21f4cc3ca74856cf04634143ca79f1ce10512b6287a08e8d56`.
Receiver and key material are omitted. Re-running at the same height produced
the same single output; a sanitized three-confirmation observation was
recaptured at `2026-10-06T07:29:28Z`. This real regtest evidence does not claim
public-network deployment readiness.

Zaino `0.6.0-no-tls` rejected the Ironwood subtree-root enum requested by
`zcash_client_backend` 0.24.0. The small tracer therefore scanned
wallet-requested ranges from their preceding authenticated tree state.
Production-scale Ironwood subtree-root compatibility remains an operational
gate.

## Consequences

- The selected path has higher implementation and operational cost than a
  wallet RPC wrapper, but its authority and data semantics are explicit and
  testable.
- Obliq owns a Rust/TypeScript service boundary and a separate encrypted scan
  cache.
- Public-network production readiness remains distinct from local regtest proof.
- The Phase 3 process adapter rejects testnet and mainnet configurations until
  that readiness is proven; the broader network types remain domain vocabulary,
  not an implementation claim.
- Zallet can still serve as an external sender during a tracer; its seed and
  spend authority never enter the observer or Obliq application.

## Authoritative references

- [Zallet RPC methods](https://zcash.github.io/zallet/rpc/index.html)
- [Zallet source](https://github.com/zcash/zallet)
- [librustzcash 0.24.0 release](https://github.com/zcash/librustzcash/releases/tag/zcash_client_backend-0.24.0)
- [librustzcash source](https://github.com/zcash/librustzcash)
- [lightwalletd source and operations](https://github.com/zcash/lightwalletd)
- [Zebra lightwalletd guidance](https://github.com/ZcashFoundation/zebra/blob/main/book/src/user/lightwalletd.md)
- [Z3 regtest guide](https://github.com/ZcashFoundation/z3/blob/main/docs/regtest.md)
- [Zcash regtest guide](https://zcash.github.io/zcash/dev/regtest.html)
