# Public testnet settlement verification runbook

Status: **PUBLIC_NETWORK_READY_FOR_FUNDED_TEST**

This runbook stops before funding, signing, or broadcasting. A completed sync
is not payment evidence. Only a real, externally authorized, fully shielded
testnet output that the UFVK-only observer decrypts and Obliq reconciles can
change the classification to `PUBLIC_NETWORK_VERIFIED`.

## Frozen implementation set

The preparation was reviewed on 2026-10-07 against:

- Obliq observer: `zcash_client_backend 0.24.0`,
  `zcash_client_sqlite 0.22.0`, `zcash_keys 0.16.1`,
  `zcash_primitives 0.30.1`, and `zcash_protocol 0.10.6`;
- Zebra `v7.0.0-rc.0`, commit
  `6d1e414d6f55e4180d0e47baaa934bf97d5b4fec`;
- Zaino `0.10.1`, commit
  `3244a74bb09fa6a09a4b2deeb6be53bab0890747`;
- Zallet `v0.1.0-beta.3`, commit
  `987382f67e622915228686e9f956c6a9c9a7514c`;
- current Zallet documentation/source commit
  `98c5c2a00fd447de60c2c9cfb1f502bb9e0b51c5`;
- Z3 `main` commit `e84ce9fd8e864ff0b2a8a62f6ce14392145db0fb`;
- librustzcash `main` commit
  `eb3e586765236a808dc82eee85f2be47e11e48c6`.

Zallet is beta software. Before executing the ceremony, pin the binaries and
run `zallet rpc help <method>` for every RPC below. Stop if its live schema
differs from this reviewed version.

## Minimum topology

| Boundary                  | Minimum for the funded test                                                                                             | Security property                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| External recipient wallet | Fresh testnet Zallet account and mnemonic on an isolated wallet host                                                    | Holds recipient spend authority; Obliq receives only its UFVK                                               |
| External sender           | Separate fresh testnet Zallet wallet/account                                                                            | Faucet funds and signing remain outside Obliq                                                               |
| Wallet chain service      | One fully synchronized Z3 testnet stack: Zebra plus external Zallet; Zaino only when the chosen Zallet backend needs it | Zallet RPC stays loopback-only; remote administration uses an authenticated encrypted tunnel                |
| Observer                  | `tools/zcash-observer` with a private SQLite cache and recipient UFVK                                                   | Read-only; API contains no spend, sign, or broadcast operation                                              |
| Observer data service     | TLS lightwalletd-compatible testnet endpoint                                                                            | Supplies compact blocks, transactions, tree state, subtree roots, and chain identity                        |
| Application               | Obliq plus PostgreSQL                                                                                                   | Stores the obligation, intent, sanitized execution receipts, observation, and audit chain; no wallet secret |

The Z3 operator guide gives a minimum of 2 CPU cores, 8 GB RAM for the full
stack, and about 30 GB SSD for testnet, with an initial sync commonly taking
2–12 hours. Four cores, 16 GB RAM, and ample SSD headroom are safer. The
current development machine has only about 7.7 GB free, so it is not a safe
place to start another full testnet stack. Reuse an existing synchronized Z3
host or provision a dedicated host; do not add a redundant node merely for the
demo.

Obliq and PostgreSQL can share a separate modest application host for this
single test, but the observer cache, UFVK, and wallet hosts remain isolated.

### Public observer service

The compatibility run used `testnet.zec.rocks:443` over TLS. It successfully
served authenticated tree state and real Ironwood subtree roots. It may be used
for this limited test with a fresh disposable testnet account, but it is an
independent service, not an Obliq trust anchor:

- it sees the observer's IP address, requested ranges, timings, and account
  birthday, which can reveal activity patterns;
- TLS authenticates the service endpoint, not the completeness or freshness of
  its chain view;
- omission, staleness, equivocation, or downtime must produce `UNAVAILABLE` or
  lag—not `UNPAID`; and
- compare its reported tip against an independent testnet source.

Production requires an owned Zebra-backed service over a private authenticated
transport. Never send the UFVK to the data service; trial decryption occurs in
the isolated observer.

## Ceremony 1: recipient and UFVK

Perform all wallet commands locally on the isolated recipient-wallet host.
Never paste their output into chat, tickets, CI logs, or Git.

1. Configure a fresh Zallet datadir for `network = "test"`. Bind its plaintext
   RPC to loopback only. Connect it to the synchronized testnet Z3 services.
2. Generate a passphrase-encrypted age identity, initialize wallet encryption,
   and generate exactly one mnemonic:

   ```sh
   zallet -d /private/recipient generate-encryption-identity -p
   zallet -d /private/recipient init-wallet-encryption
   zallet -d /private/recipient generate-mnemonic
   ```

3. Export and securely back up the mnemonic, record its fingerprint and
   birthday metadata, and complete `zallet confirm-backup`. Keep the mnemonic,
   identity, passphrase, and wallet database outside Obliq.
4. Start Zallet, wait for full testnet sync, then create the recipient account
   and an Orchard-capable shielded-only UA. JSON strings must be quoted for the
   Zallet RPC CLI:

   ```sh
   zallet -d /private/recipient rpc z_getnewaccount '"Obliq public test recipient"'
   zallet -d /private/recipient rpc z_getaddressforaccount '"ACCOUNT_UUID"' '["orchard"]'
   zallet -d /private/recipient rpc z_exportviewingkey '"RETURNED_UNIFIED_ADDRESS"'
   ```

5. Inject only the returned `uviewtest...` UFVK into the isolated observer from
   a secret manager. Do not store it in PostgreSQL or a normal `.env` file.
6. Initialize a new owner-only observer cache at a birthday before the payment.
   Save the observer-generated `utest1...` receiver to a local `0600` JSON file.
   That receiver is the reviewed destination; the UFVK itself never enters an
   Obliq command argument.

## Ceremony 2: canonical Obliq intent

Run migrations against a disposable qualification database, then prepare the
exact testnet intent:

```sh
DATABASE_URL=postgres://... \
OBLIQ_TESTNET_RECIPIENT_FILE=/private/recipient.json \
OBLIQ_TESTNET_HANDOFF_FILE=/private/obliq-testnet-handoff.json \
npm run zcash:testnet:prepare
```

The preparation command creates a real tenant-scoped obligation, deterministic
controls and approvals, a manually reviewed destination, a controlled testnet
quote for exactly 100,000 zatoshis, and an immutable intent. The quote is
`TESTNET_FIXED`, not market pricing. The resulting handoff is mode `0600`,
requires `FullPrivacy`, and contains the exact receiver, amount, opaque memo,
network, expiry, and intent hash. It does not sign or broadcast.

## Ceremony 3: independent sender and faucet

1. Create a second Zallet datadir, encryption identity, mnemonic, confirmed
   backup, and account. This is the independent sender. Do not reuse the
   recipient mnemonic or account.
2. Derive a shielded-only sender UA with receiver list `["orchard"]`.
3. Request testnet ZEC for that sender through the current Ironwood-compatible
   [Fauzec testnet faucet](https://fauzec.com/). Testnet coins have no monetary
   value. If the faucet cannot fund the shielded-only UA, stop; do not use a
   transparent funding path and claim the final payment is fully shielded.
4. Wait until Zallet reports the shielded note as spendable. Obtain at least
   110,000 zatoshis: 100,000 for the payment plus the expected ZIP-317 baseline
   fee of 10,000 zatoshis. A 200,000-zatoshi balance is the safer requested
   minimum because the inspected proposal, not this estimate, is authoritative.

The recipient can later return remaining testnet funds with a separately
reviewed shielded transaction. A 100,000-zatoshi received note can ordinarily
return about 90,000 zatoshis after a 10,000-zatoshi baseline fee. Recovery is
not guaranteed if wallet backups, the testnet, or fee rules change.

## Ceremony 4: proposal inspection—manual boundary

Copy the handoff to the sender host over an authenticated encrypted channel.
Before any authorization:

1. Reject the handoff unless network is `testnet`, amount is `100000`, privacy
   policy is `FullPrivacy`, the intent hash matches Obliq, and the quote is live.
2. Create a PCZT using the sender account UUID, the exact recipient address,
   amount `0.001`, and the handoff memo encoded as required by the live RPC.
   Set `fund_source` to `"orchard"` and `privacy_policy` to `"FullPrivacy"`.
3. Run `pczt_inspect`. Verify the exact output, memo, implied fee, consensus
   branch, and privacy policy. Zallet warns that creator metadata is not
   cryptographically verified until extraction, so inspect again after every
   transformation.
4. Stop if the proposal requires anything more permissive than `FullPrivacy`,
   contains a transparent input/output, crosses value pools, differs from the
   100,000-zatoshi intent, or has an unexpected fee.

The remaining deliberate wallet operations are `pczt_prove`, `pczt_sign` with
`FullPrivacy`, a final `pczt_inspect`, `pczt_extract`, and an explicit Zebra
`sendrawtransaction`. They are intentionally not automated by Obliq. This
runbook stops before those operations until the owner explicitly authorizes
funding and signing.

## Verification after an authorized broadcast

After an operator records only the sanitized signing and broadcast receipts in
Obliq, run:

```sh
DATABASE_URL=postgres://... \
OBLIQ_TESTNET_HANDOFF_FILE=/private/obliq-testnet-handoff.json \
OBLIQ_TESTNET_EVIDENCE_FILE=/private/testnet-evidence.json \
OBLIQ_TESTNET_MODE=FUNDED_PAYMENT \
OBSERVER_BINARY=./tools/zcash-observer/target/release/obliq-zcash-observer \
OBSERVER_DB=/private/observer.sqlite \
OBSERVER_ENDPOINT=https://testnet.zec.rocks:443 \
OBSERVER_UFVK="$(secret-manager read obliq-testnet-ufvk)" \
npm run zcash:testnet:verify
```

Use an approved secret-manager injection mechanism; the example is schematic.
The harness validates chain identity, scan heights, UFVK-only authority, exact
amount, receiver fingerprint, opaque memo hash, and the three-confirmation
policy. It ingests the same output twice and requires one database row with the
second ingestion unchanged. It appends confirmation snapshots and flags a
regression for review rather than turning it into `UNPAID`.

For a pre-funding rehearsal, set
`OBLIQ_TESTNET_MODE=UNFUNDED_SYNCHRONIZATION`. The report must remain
`PUBLIC_NETWORK_READY_FOR_FUNDED_TEST` and explicitly include
`REAL_FUNDED_SHIELDED_PAYMENT_REQUIRED`; it can never satisfy the funded gate.
The evidence file contains hashes/fingerprints and safe status only—never the
UFVK, receiver, memo plaintext, wallet content, or raw transaction.

## Acceptance record

Change the classification only after retaining sanitized evidence for:

- exact testnet chain identity and synchronized heights;
- an external Zallet proposal inspected as `FullPrivacy`;
- externally authorized signing and a broadcast transaction reference;
- UFVK-only detection of the exact 100,000-zatoshi output and opaque memo;
- progression through one, two, and three confirmations where timing permits;
- idempotent repeat ingestion with one observation row;
- final settlement/obligation state `SETTLED`; and
- audit-chain verification.

A naturally occurring reorganization cannot be scheduled. If confirmation
regression occurs, retain the evidence and verify that Obliq withdraws the
current settlement conclusion without declaring the obligation unpaid.

## Sources

- [Z3 operator guide](https://github.com/ZcashFoundation/z3/blob/main/README.md)
- [Zallet setup and RPC security](https://zcash.github.io/zallet/guide/setup.html)
- [Zallet RPC methods](https://zcash.github.io/zallet/rpc/index.html)
- [Zallet installation and backend choice](https://zcash.github.io/zallet/guide/installation/index.html)
- [ZIP 317 conventional fees](https://zips.z.cash/zip-0317)
- [Zcash testnet guide](https://zcash.readthedocs.io/en/latest/rtd_pages/testnet_guide.html)
