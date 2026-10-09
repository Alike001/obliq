# Public testnet settlement verification runbook

Status: **PUBLIC_NETWORK_READY_FOR_FUNDED_TEST**

This runbook stops before funding, signing, or broadcasting. A completed sync
is not payment evidence. Only a real, externally authorized, fully shielded
testnet output that the UFVK-only observer decrypts and Obliq reconciles can
change the classification to `PUBLIC_NETWORK_VERIFIED`.

## Frozen implementation set

The preparation was reviewed on 2026-10-08 against:

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

Zallet beta.3 was published before ZIP 259 finalized the NU7 branch ID. Its
checksum proves artifact identity, not post-NU7 compatibility. It is therefore
never accepted on version alone: Ceremony 3 must demonstrate that the running
binary inspects a v6 `FullPrivacy` fixture bound to `77190ad9`. A beta.3 build
that reports the former branch or cannot inspect the fixture is `BLOCKED`; wait
for and separately pin a compatible official artifact rather than patching or
silently substituting a wallet binary.

NU7 activated on testnet at height `4,465,026` with consensus branch ID
`77190ad9`, as specified by ZIP 259. The earlier `37a5165b` value is the NU6.3
branch ID and must not be accepted after NU7 activation. Do not replace this
with another static runtime assumption: the keyless observer preflight requires
testnet chain identity and reads the active branch ID from the live data
service, then checks its activation height and the ceremony compares PCZT
inspection output with that fresh result.

The machine-readable pins and release hashes are in
[`public-testnet-artifacts.json`](./public-testnet-artifacts.json). Verify the
Zallet archive SHA-256 before installation. Verify Zebra's official release
checksum and Sigstore bundle, then require its immutable source commit. A tag or
version string alone is not sufficient evidence.

## Minimum topology

| Boundary                  | Minimum for the funded test                                                                                         | Security property                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| External recipient wallet | Existing Zingo PC 2.0.25 Zecceipt Merchant testnet account, whose receiver was matched locally to the observer UFVK | Holds recipient spend authority; Obliq receives only its UFVK                                               |
| External sender           | Separate fresh testnet Zallet v0.1.0-beta.3 wallet/account                                                          | Faucet funds and inspectable PCZT signing remain outside Obliq; the existing Zingo sender is not the signer |
| Wallet chain service      | Zebra v7.0.0-rc.0 JSON-RPC plus Zallet v0.1.0-beta.3 **`zallet-zaino`** configured with backend `zaino`             | Reject the default co-located `zebra` backend; wallet RPC stays loopback-only behind an encrypted tunnel    |
| Observer                  | `tools/zcash-observer` with a private SQLite cache and recipient UFVK                                               | Read-only; API contains no spend, sign, or broadcast operation                                              |
| Observer data service     | TLS lightwalletd-compatible testnet endpoint                                                                        | Supplies compact blocks, transactions, tree state, subtree roots, and chain identity                        |
| Application               | Obliq plus PostgreSQL                                                                                               | Stores the obligation, intent, sanitized execution receipts, observation, and audit chain; no wallet secret |

The Z3 operator guide gives a minimum of 2 CPU cores, 8 GB RAM for the full
stack, and about 30 GB SSD for testnet, with an initial sync commonly taking
2–12 hours. Four cores, 16 GB RAM, and ample SSD headroom are safer. On
2026-10-08 the current laptop had only about 2.1 GB filesystem headroom, 7.1
GiB total RAM, and 3.3 GiB available RAM (with swap active). It is not a safe
place to download or synchronize Zebra state. Reuse a compatible synchronized
private host or provision a dedicated temporary host after owner approval; do
not run the node here or add a redundant node merely for the demo.

`zallet-zaino` talks to Zebra JSON-RPC and does not require Zallet to read a
co-located Zebra state database or connect to Zebra's indexer gRPC. Do not run
the default `zallet`/`zebra` backend accidentally: it has those additional
co-location and indexer requirements and is outside this reviewed topology. A
standalone Zaino process is also unnecessary for the selected backend.

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

## Ceremony 3: bounded unfunded compatibility preflight

Complete this gate on the isolated signer host before creating or funding a
wallet. It does not require a UFVK, seed, account, proving parameters, signing,
or broadcast.

First record the live public-testnet identity and active branch with the
keyless observer command:

```sh
set -eu
umask 077
CEREMONY_DIR=/private/obliq-testnet-ceremony
OBSERVER_BIN=./tools/zcash-observer/target/release/obliq-zcash-observer
mkdir -p -m 0700 "$CEREMONY_DIR"
test "$(stat -c '%a' "$CEREMONY_DIR")" = 700
OBSERVER_NETWORK=testnet \
OBSERVER_ENDPOINT=https://testnet.zec.rocks:443 \
"$OBSERVER_BIN" preflight > "$CEREMONY_DIR/observer-network-preflight.json"
chmod 0600 "$CEREMONY_DIR/observer-network-preflight.json"
```

Require sanitized output with `network="testnet"`, `serviceChain="test"`,
`nu7ActivationHeight=4465026`, `nu7Active=true`,
`activeConsensusBranchId="77190ad9"`, `authority="NONE_REQUIRED"`, and
`spendingAuthority=false`. The tip must be at or beyond NU7 activation. Stop
on any mismatch or unavailable service.

Install only the pinned artifacts in
`public-testnet-artifacts.json`. Verify Zallet's archive SHA-256 locally and
Zebra's official release checksum/Sigstore bundle plus immutable source commit.
Start Zebra with JSON-RPC reachable only from the signer host. Start the
**`zallet-zaino`** binary with backend `zaino`, testnet selected, and plaintext
wallet RPC bound to loopback. Stop if process identity or configuration says
the default `zebra` backend, if RPC is remotely reachable, or if either process
reports a different network.

Use private file-based loopback RPC requests to:

1. call `help` for `pczt_create` and `pczt_inspect` and compare their schemas
   with the pinned Zallet version;
2. call `pczt_create` against a confirmed empty testnet account and require the
   documented insufficient-funds result only—this proves request parsing and
   transaction construction are reached without funding;
3. call `pczt_inspect` on a locally retained, non-sensitive fixture created by
   the same pinned build and require transaction version 6, `FullPrivacy`, and
   consensus branch `77190ad9`; and
4. record that `pczt_prove`, `pczt_sign`, extraction, broadcast, and any wallet
   mutation were not attempted.

Store only sanitized booleans, versions, commits, checksums, RPC method names,
and the observer preflight fields in a new regular `0600` JSON file. Do not
retain account identifiers, receivers, credentials, request bodies, PCZTs, or
error payloads in the sanitized evidence. Validate it with:

```sh
OBLIQ_TESTNET_PREFLIGHT_FILE="$CEREMONY_DIR/signer-preflight.json" \
npm run zcash:testnet:preflight
```

A `PASS` proves bounded compatibility only. Its classification intentionally
remains `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST`; it is not payment evidence.

## Ceremony 4: independent sender and faucet

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

## Ceremony 5: proposal inspection—manual boundary

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
   `tx_version=6`, a `consensus_branch_id` equal to the fresh keyless observer
   preflight (currently `77190ad9` for post-activation NU7 testnet),
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
NETWORK_PREFLIGHT="$CEREMONY_DIR/observer-network-preflight.json"

test "$(stat -c '%a' "$HANDOFF")" = 600
test "$(stat -c '%a' "$SENDER_ACCOUNT_FILE")" = 600
test "$(stat -c '%a' "$ZALLET_CURL_CONFIG")" = 600
test "$(stat -c '%a' "$NETWORK_PREFLIGHT")" = 600
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

jq -e --slurpfile handoff "$HANDOFF" \
  --slurpfile network "$NETWORK_PREFLIGHT" '
  .error == null and
  .result.tx_version == 6 and
  .result.consensus_branch_id == $network[0].activeConsensusBranchId and
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

The observer database must already have been initialized once through the
observer's hidden prompt or its operator-controlled standard-input mode. The
verification harness reads that owner-only state; it never accepts the UFVK in
an environment variable or command argument. The harness validates chain
identity, scan heights, UFVK-only authority, exact
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
- [ZIP 259 NU7 network upgrade](https://zips.z.cash/zip-0259)
- [Zcash testnet guide](https://zcash.readthedocs.io/en/latest/rtd_pages/testnet_guide.html)
