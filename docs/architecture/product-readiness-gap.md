# Browser demo, persistent pilot and production gap

This register prevents a demonstration surface from being mistaken for the
customer product and prevents planned capabilities from silently disappearing.

| Capability              | Public browser demo                          | Persistent public pilot                                | Full production application                                              |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| Identity                | None                                         | Real OIDC, invited users                               | Production OIDC lifecycle and support                                    |
| Tenant isolation        | Not applicable; no records                   | Server-scoped organizations, adversarially tested      | Same plus operational review and incident response                       |
| Persistence             | Browser memory only                          | Managed PostgreSQL                                     | Resilient PostgreSQL, backups, restore drills                            |
| Vendors and obligations | Fictional fixed context                      | Real create/edit with fictional user data              | Real business records                                                    |
| Invoice upload          | Unavailable                                  | Disabled                                               | Private object storage, quarantine and malware scan                      |
| Extraction              | Unavailable                                  | Disabled                                               | Production provider with mandatory human review; AI never authorizes     |
| Policy controls         | Actual browser-safe functions                | Actual server-side engine and persisted decisions      | Same, with production policy administration                              |
| Approvals               | Illustrative counters only                   | Authenticated role-scoped approvals                    | Production identities, separation of duties and support                  |
| Destination review      | Illustrative input                           | Optional fictional/manual workflow; no recipient email | Operational email plus independent finance review                        |
| Quote/intent            | Unavailable                                  | Explicitly disabled                                    | Exact quotes and immutable intents after network qualification           |
| Zcash signing           | None                                         | None                                                   | External human-authorized signer; never application custody              |
| Observer/reconciliation | Historical regtest evidence shown separately | Disabled                                               | Isolated UFVK-only observer; public network remains blocked until proven |
| Evidence                | Historical capability explanation            | Payment evidence disabled                              | Canonical JSON evidence; native PDF remains planned                      |
| Feedback                | Owner-configured external form               | Product support/feedback process required              | Production support and privacy operations                                |

## Remaining product-readiness tracks

These remain active roadmap commitments:

- **Production invoice extraction:** deliberate provider integration, document
  exposure policy, strict schema and human confirmation.
- **Native PDF evidence:** generated from the canonical evidence artifact, with
  tests proving no additional fields can leak.
- **Operational email:** authenticated provider, delivery telemetry without
  token/code leakage, bounce handling and incident procedures.
- **Production infrastructure:** private storage and scanner, durable rate
  limiting, observability, backups, restore drills, migration and rollback.
- **Qualified Zcash settlement:** compatible external signing, public-network
  observation and a funded end-to-end qualification. Regtest proof must not be
  promoted into a public-network claim.

The next implementation gate is the owner-approved persistent pilot described
in [public-pilot.md](./public-pilot.md). It must be built as its own deployment
mode after submission, with payments unavailable by construction.
