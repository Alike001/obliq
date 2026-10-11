# Private Payables operational acceptance — 2026-10-11

Status: **ISOLATED LOCAL ACCEPTANCE PASSED**

This is sanitized engineering evidence, not public-network settlement proof.
No real recipient, external email provider, wallet, signer, broadcast or Zcash
payment participated.

## Environment

- migrated local PostgreSQL;
- production Next.js build served by two local processes with separate
  `FINANCE` issuer and `TREASURY` reviewer identities;
- loopback-only, memory-only development mail adapter;
- Chromium 153 through `playwright-core` 1.63.0;
- release `obliq-zcash-observer` address inspector;
- generated non-sensitive Orchard-only regtest test-vector receiver.

## Observed ceremony

The real browser and API surfaces completed:

1. finance invitation creation and mail-adapter acceptance;
2. URL-fragment removal with no token in URL, markup or browser storage;
3. neutral wrong-code rejection and successful contact verification;
4. canonical recipient-session expiry and same-invitation re-verification;
5. invitation-scoped obligation summary;
6. Orchard-only destination inspection and one-time confirmation;
7. recipient-visible `UNVERIFIED` / wallet-ownership-`UNAVAILABLE` result; and
8. independent Treasury review reaching `VERIFIED_MANUALLY` in PostgreSQL.

The local report marked signing, broadcast, settlement and public-network
operation `NOT_TESTED`. External production email delivery also remains
`UNVERIFIED`; the sink proves only the isolated adapter contract.

Screenshots and the machine report remain under ignored `.data/` storage
because they contain local fixture identifiers. They are not committed and
must not be presented as customer, production or public-chain evidence.
