# Verification Audit: Issue 5 public Zcash qualification

## Verdict

Conditional pass as `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`.

Public synchronization is executable and evidenced. Public payment observation
is intentionally not claimed because no funds were moved. Mainnet remains
blocked.

## Artifacts checked

- Issue #5 requirements and Phase 1–6 authority invariants.
- ADRs 0006, 0007, 0009, and 0010.
- Current observer, runtime network policy, reconciliation boundary, and tests.
- Current Zebra, Zaino, Zallet, lightwalletd, librustzcash, Z3, and ZIP 317
  sources/releases.
- Public mainnet/testnet protocol probes and the public-testnet observer run.
- Changed-file diff and complete project validation output.

## Requirement traceability

| Requirement                      | Evidence                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read-only public sync            | Testnet UFVK-only run scanned 4,472,945–4,472,968 and reported synced with no spend authority.                                                              |
| Orchard/Ironwood subtree roots   | Both probed public networks served Ironwood root index 0; public sync driver completed all subtree imports.                                                 |
| Viewing-key observation boundary | Observer imports `AccountPurpose::ViewOnly`; API has no spend/sign/broadcast operation; adapter requires `UFVK_VIEW_ONLY`.                                  |
| Reorg handling                   | Public path uses librustzcash verify-range, continuity-error truncation, and rescan flow. No live public reorg occurred, so that occurrence is not claimed. |
| Network identity                 | Sidecar validates service `chain_name`; TypeScript validates sidecar network; runtime validates application/observer equality.                              |
| Testnet/mainnet compatibility    | Testnet sync executed. Mainnet service wire compatibility was probed, but runtime mainnet remains blocked.                                                  |
| No transparent fallback          | No transparent observation or settlement path was added.                                                                                                    |
| No fabricated transaction        | Qualification produced zero observations and is explicitly labelled unfunded.                                                                               |

## Acceptance coverage

- `PUBLIC_NETWORK_VERIFIED`: not met; no funded public transaction.
- `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`: met; current testnet sync and
  authority boundaries passed, leaving an externally funded shielded output as
  the next evidence gate.
- `PUBLIC_NETWORK_BLOCKED`: superseded for the observer sync gate, retained for
  mainnet execution and public settlement.

## Quality gates

- Format, lint, strict TypeScript, unit tests, production build: passed.
- PostgreSQL migrations and integration tests: passed.
- Secret scan and npm production audit: passed.
- Rust format, locked check, and locked tests: passed.
- `cargo-audit`: unavailable in the environment.

## Deviations

- The compatibility run used an independently operated TLS lightwalletd
  endpoint rather than an Obliq-operated node. This is sufficient for wire/sync
  qualification, not production trust or privacy.
- No frontend/proof surface was changed. Existing `/proof` remains correctly
  scoped to regtest verification until a funded public observation exists.

## Gaps and risks

- Public data services can observe query timing and ranges and can be stale or
  malicious.
- No naturally occurring public reorg was observed.
- No public output/memo decryption or confirmation progression has occurred.
- No Obliq-owned public Zebra/Zaino infrastructure is provisioned.
- Zallet remains beta, and Unified/Orchard view-only import is not its current
  `z_importviewingkey` path.

## Follow-up

Perform the separately authorized shielded testnet payment described in ADR
0011, then capture detection, confirmation progression, idempotent re-observation
and safe reconciliation evidence before changing status to verified.
