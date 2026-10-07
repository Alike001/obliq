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
- current Zallet release source commit
  `987382f67e622915228686e9f956c6a9c9a7514c`;
- Z3 `main` commit `e84ce9fd8e864ff0b2a8a62f6ce14392145db0fb`;
- librustzcash `main` commit
  `eb3e586765236a808dc82eee85f2be47e11e48c6`.

Zallet is beta software. Before executing the ceremony, pin the binaries and
run `zallet rpc help <method>` for every RPC below. Stop if its live schema
differs from this reviewed version.

## Minimum topology

| Boundary                  | Minimum for the funded test                                                                                             | Security property                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| External recipient wallet | Existing Zingo PC 2.0.25 Zecceipt Merchant testnet account, whose receiver was matched locally to the observer UFVK     | Holds recipient spend authority; Obliq receives only its UFVK                                               |
| External sender           | Separate fresh testnet Zallet v0.1.0-beta.3 wallet/account                                                              | Faucet funds and inspectable PCZT signing remain outside Obliq; the existing Zingo sender is not the signer |
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

## Ceremony 1: recipient and UFVK — completed

The existing Zingo PC 2.0.25 Zecceipt Merchant testnet account is the recipient.
Its standard testnet UFVK was imported through the observer's hidden prompt,
and the read-only `verify-recipient` command returned `MATCH` for its selected
Ironwood-capable Unified Address. String equality was not used: the command
validated the contained Orchard receiver against the UFVK's diversifier scope.
The observer reported `network=testnet`, `authority=UFVK_VIEW_ONLY`, and
`spendingAuthority=false` at height 4,474,328.

Before the funded ceremony, repeat the sanitized check locally. These variables
contain paths only, not secret material:

```sh
umask 077
OBSERVER_DB=/home/ali/.local/state/obliq/testnet-observer/recipient-observer.sqlite
RECIPIENT_FILE=/home/ali/.local/state/obliq/testnet-observer/recipient.json
OBSERVER_BIN=./tools/zcash-observer/target/release/obliq-zcash-observer

test "$(stat -c '%a' "$OBSERVER_DB")" = 600
test "$(stat -c '%a' "$RECIPIENT_FILE")" = 600
OBSERVER_NETWORK=testnet \
OBSERVER_DB="$OBSERVER_DB" \
OBSERVER_RECIPIENT_FILE="$RECIPIENT_FILE" \
"$OBSERVER_BIN" verify-recipient
```

Expected output is sanitized JSON containing `result="MATCH"`,
`network="testnet"`, `authority="UFVK_VIEW_ONLY"`, and
`spendingAuthority=false`. Stop on `MISMATCH`, `UNVERIFIED`, a permissions
error, or any other network. Never print the UFVK or full address.

## Ceremony 2: canonical Obliq intent

Run migrations against a disposable qualification database, then prepare the
exact testnet intent:

```sh
DATABASE_URL=postgres://... \
OBLIQ_TESTNET_RECIPIENT_FILE=/private/recipient.json \
OBLIQ_TESTNET_HANDOFF_FILE=/private/obliq-testnet-handoff.json \
npm run zcash:testnet:prepare
```

The recipient file must be a regular, non-symlink `0600` file containing only
`{"address":"utest1…"}`. The output path must not already exist; preparation
uses exclusive creation and refuses to overwrite a prior handoff. Expected
sanitized output includes:

```text
classification=PUBLIC_NETWORK_READY_FOR_FUNDED_TEST
network=testnet
amountZat=100000
state=AWAITING_SIGNATURE
externalActionRequired=true
```

The preparation command creates a real tenant-scoped obligation, deterministic
controls and approvals, a manually reviewed destination, a controlled testnet
quote for exactly 100,000 zatoshis, and an immutable intent. The quote is
`TESTNET_FIXED`, not market pricing. The resulting handoff is mode `0600`,
requires `FullPrivacy`, and contains the exact receiver, amount, opaque memo,
network, expiry, and intent hash. It does not sign or broadcast.

## Ceremony 3: independent sender and faucet

1. Create a Zallet v0.1.0-beta.3 datadir, encryption identity, mnemonic,
   confirmed backup, and account on the isolated signer host. This is the
   independent sender. Do not import either existing Zingo mnemonic and do not
   reuse the recipient account. Bind Zallet's plaintext RPC to loopback only.
2. Derive a shielded-only sender UA with receiver list `["orchard"]`.
3. Recheck the independent [Fauzec testnet faucet](https://fauzec.com/) before
   use. On 2026-10-07 its public API reported `network=testnet`,
   `launch_phase=open`, `cause=ready`, Unified/Sapling recipient support, and a
   100,000,000-zatoshi drip. This is volatile third-party status, not a
   guarantee. Read-only checks (which neither claim nor move funds) are:

   ```sh
   curl --fail --silent --show-error https://fauzec.com/api/v1/network |
     jq '{network,launch_phase,drip_zat,supported_address_kinds}'
   curl --fail --silent --show-error https://fauzec.com/api/v1/faucet-status |
     jq '{network,cause,parked,lag_blocks}'
   ```

   Expected values are `testnet`, `open`, and `ready`. Stop otherwise. After
   explicit owner approval, request the drip manually in a browser to the
   fresh sender's Orchard-only `utest1…` UA. The faucet requires a human
   Turnstile challenge. Never paste the UA into chat or a ticket. If it rejects
   the UA or does not produce a shielded spendable note, stop; do not substitute
   a transparent sender input.

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
   amount `0.001`, and the handoff memo encoded as hexadecimal as required by
   the live RPC. Set `fund_source` to `"orchard"` and `privacy_policy` to
   `"FullPrivacy"`. Build the JSON-RPC request in an owner-only file and submit
   it only to the loopback Zallet RPC; do not place the receiver, memo, PCZT, or
   RPC credential in shell arguments, history, CI, or logs.
3. Run `pczt_inspect` before and after proving and signing. Require:
   `tx_version=6`, `consensus_branch_id=37a5165b`,
   `privacy_policy=FullPrivacy`, `wallet_created=true`, no transparent inputs
   or outputs, no Sapling spends or outputs, exactly one intended 100,000-zat
   recipient output in the Ironwood bundle, and an explicitly reviewed
   positive `fee_zat`. The expected ordinary ZIP-317 fee is 10,000 zatoshis;
   stop and review any different value. Persist the inspected fee in Obliq's
   sanitized signing receipt.
4. Zallet v0.1.0-beta.3 `pczt_inspect` does **not** return memo plaintext. It
   reports recipient/value creator metadata, fee, bundles, policy, and
   proof/signature state. Therefore pre-sign memo binding is the local chain of
   custody from the immutable Obliq handoff into `pczt_create`; end-to-end memo
   correctness is proven only when the independent UFVK observer decrypts the
   output and matches its memo hash. Do not claim otherwise.
5. Stop if the proposal requires anything more permissive than `FullPrivacy`,
   contains a transparent input/output, crosses value pools, differs from the
   100,000-zatoshi intent, or has an unexpected fee.

Use file-based loopback JSON-RPC so sensitive request material and the PCZT do
not appear in the process list or shell history. The following is the exact
pre-sign pattern. `SENDER_ACCOUNT_FILE` contains only the account UUID plus a
newline; `ZALLET_CURL_CONFIG` is a private curl config containing the loopback
URL and RPC credential. Both must already be mode `0600` and remain on the
signer host.

```sh
set -eu
umask 077
CEREMONY_DIR=/private/obliq-testnet-ceremony
HANDOFF="$CEREMONY_DIR/obliq-testnet-handoff.json"
SENDER_ACCOUNT_FILE="$CEREMONY_DIR/sender-account.uuid"
ZALLET_CURL_CONFIG="$CEREMONY_DIR/zallet-rpc.curl-config"

test "$(stat -c '%a' "$HANDOFF")" = 600
test "$(stat -c '%a' "$SENDER_ACCOUNT_FILE")" = 600
test "$(stat -c '%a' "$ZALLET_CURL_CONFIG")" = 600
test "$(jq -r .network "$HANDOFF")" = testnet
test "$(jq -r .amountZat "$HANDOFF")" = 100000
test "$(jq -r .privacyPolicy "$HANDOFF")" = FullPrivacy
test "$(jq -r .quoteExpiresAt "$HANDOFF")" \> "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

jq -r .memoReference "$HANDOFF" | xxd -p -c 512 > "$CEREMONY_DIR/memo.hex"
jq -n \
  --slurpfile handoff "$HANDOFF" \
  --rawfile from "$SENDER_ACCOUNT_FILE" \
  --rawfile memo "$CEREMONY_DIR/memo.hex" \
  '{jsonrpc:"2.0",id:"obliq-create",method:"pczt_create",params:[
    ($from | rtrimstr("\n")),
    [{address:$handoff[0].receiver,amount:0.001,memo:($memo | gsub("\n";""))}],
    1,"FullPrivacy","orchard"
  ]}' > "$CEREMONY_DIR/pczt-create.request.json"

curl --fail --silent --show-error \
  --config "$ZALLET_CURL_CONFIG" \
  -H 'content-type: application/json' \
  --data-binary @"$CEREMONY_DIR/pczt-create.request.json" \
  > "$CEREMONY_DIR/pczt-create.response.json"

jq -e '.error == null and .result.privacy_policy == "FullPrivacy" and
       (.result.pczt | type == "string" and length > 0)' \
  "$CEREMONY_DIR/pczt-create.response.json" >/dev/null
jq -r .result.pczt "$CEREMONY_DIR/pczt-create.response.json" \
  > "$CEREMONY_DIR/pczt.b64"

jq -n --rawfile pczt "$CEREMONY_DIR/pczt.b64" \
  '{jsonrpc:"2.0",id:"obliq-inspect",method:"pczt_inspect",
    params:[($pczt | rtrimstr("\n"))]}' \
  > "$CEREMONY_DIR/pczt-inspect.request.json"
curl --fail --silent --show-error \
  --config "$ZALLET_CURL_CONFIG" \
  -H 'content-type: application/json' \
  --data-binary @"$CEREMONY_DIR/pczt-inspect.request.json" \
  > "$CEREMONY_DIR/pczt-inspect.response.json"

jq -e --slurpfile handoff "$HANDOFF" '
  .error == null and
  .result.tx_version == 6 and
  .result.consensus_branch_id == "37a5165b" and
  .result.privacy_policy == "FullPrivacy" and
  .result.wallet_created == true and
  .result.fee_zat == 10000 and
  (.result.transparent.inputs | length) == 0 and
  (.result.transparent.outputs | length) == 0 and
  .result.sapling.spends == 0 and
  (.result.sapling.outputs | length) == 0 and
  .result.orchard.actions == 0 and
  (.result.orchard.outputs | length) == 0 and
  ([.result.ironwood.outputs[] |
    select(.user_address == $handoff[0].receiver and .value_zat == 100000)] |
    length) == 1
' "$CEREMONY_DIR/pczt-inspect.response.json" >/dev/null
```

Success is silent (exit status zero). Any `test`, `jq -e`, or `curl` failure is
a hard stop. Do not proceed merely by visually skimming a failed command. The
PCZT request/response files contain sensitive correlation material and remain
`0600`; never upload or commit them. The current owner-review gate stops here,
before `pczt_prove`, `pczt_sign`, `pczt_extract`, or broadcast.

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
OBLIQ_TESTNET_EVIDENCE_FILE=/private/testnet-evidence-height-N.json \
OBLIQ_TESTNET_MODE=FUNDED_PAYMENT \
OBSERVER_BINARY=./tools/zcash-observer/target/release/obliq-zcash-observer \
OBSERVER_DB=/private/observer.sqlite \
OBSERVER_ENDPOINT=https://testnet.zec.rocks:443 \
OBSERVER_UFVK="$(secret-manager read obliq-testnet-ufvk)" \
npm run zcash:testnet:verify
```

Each verification report path must be new. To extend confirmation progression,
retain the prior report and pass it explicitly:

```sh
OBLIQ_TESTNET_PRIOR_EVIDENCE_FILE=/private/testnet-evidence-height-N.json \
OBLIQ_TESTNET_EVIDENCE_FILE=/private/testnet-evidence-height-N-plus-1.json \
# repeat the remaining variables and npm run zcash:testnet:verify
```

Both reports must be regular `0600` files. The harness refuses to overwrite an
existing report, preventing later scans from rewriting earlier evidence. It
also rejects progression from a different expected amount, receiver
fingerprint, memo hash, confirmation policy, transaction reference, or output
index.

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
The evidence file contains hashes/fingerprints, the explicitly inspected
network fee, and safe status only—never the UFVK, receiver, memo plaintext,
wallet content, PCZT, or raw transaction.

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
