# ADR 0008: Controlled application evidence

Status: accepted, Phase 5

## Context

Obliq must let an organization answer a narrow payment question without exposing
its complete business record or Zcash viewing history. The canonical inputs now
exist: obligation versions, authorization records, immutable settlement intent,
settlement state and a matching read-only reconciliation observation.

Zcash zero-knowledge proofs protect protocol statements. They do not prove that
a human-entered vendor name, invoice, category or approval is accounting truth.
Calling an Obliq receipt a ZK proof would therefore be false.

## Decision

Add a framework-independent `packages/evidence` boundary that owns:

- a closed set of disclosable claims;
- `PUBLIC_SAFE`, `COUNTERPARTY`, `FINANCE` and `AUDIT` classifications;
- explicit provenance for Obliq business, Obliq authorization and Zcash
  reconciliation facts;
- canonical JSON serialization and SHA-256 hashing;
- 256-bit random URL-safe verification identifiers;
- artifact integrity verification.

The database application layer owns authorization and lifecycle:

- Finance may issue public-safe/counterparty artifacts;
- Owner, CFO and Accountant may include FINANCE/AUDIT claims;
- Owner and CFO may revoke;
- every package requires a persisted preview before issuance;
- the artifact creation timestamp is frozen at preview so the recipient sees
  the exact bytes that the creator reviewed; the package row separately records
  actual issuance time;
- eligibility requires a `SETTLED` obligation, `SETTLED` settlement and matching
  `SETTLED` reconciliation observation;
- issuance rechecks that the exact obligation version, settlement and
  observation still match the preview;
- issued artifact content is immutable;
- corrections create a new version and mark the predecessor `SUPERSEDED`;
- revocation stores actor, time and reason without deleting history;
- reconciliation regression or mismatch revokes active linked evidence.

JSON is the canonical durable artifact. The browser receipt and public
verification surface render the same stored model. Native PDF generation is not
implemented or claimed.

## Forbidden disclosure

Viewing/spending authority, seeds, signer credentials, raw transactions,
destination receiver/fingerprint, memo/reference plaintext and internal policy
findings have no disclosable field key. The server rejects unknown field names;
hiding controls in the browser is not a security boundary.

## Verification and privacy

`/verify/[evidenceId]` uses the random external identifier, not the internal
UUID. Invalid IDs return no organization detail. The page exposes only the
stored artifact, integrity result and current status. The JSON route verifies
the hash before download and uses `private, no-store`, `nosniff` and attachment
headers.

The URL remains bearer-like recipient material. A leaked link leaks its selected
claims. Production rate limiting, secure link delivery, recipient expiry and
independent attestation/anchoring remain future hardening.

Public verification reads are intentionally not appended to the organization's
integrity chain in Phase 5. Doing so would let an unauthenticated caller create
unbounded finance-audit events. Authorized preview, issuance, revocation and
supersession actions are chained; privacy-safe access telemetry remains planned.

## Consequences

- The same canonical content always hashes identically.
- Any artifact/manifest/version modification fails verification.
- Historical evidence remains inspectable and never silently rewritten.
- Evidence explains which facts are chain-derived and which exist only in
  Obliq.
- Obliq evidence is application-generated, integrity-protected financial
  evidence—not a zero-knowledge proof, blockchain proof or independent audit.
