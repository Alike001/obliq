# External signer hardening

Obliq emits a bounded handoff containing the canonical intent ID/hash, exact
shielded receiver, zatoshis, expiry, network and ZIP-321 request. It does not
send an approval as a signature and never accepts a PCZT, raw transaction,
wallet password, mnemonic or spending key.

The operator boundary must:

1. accept a request only over an authenticated encrypted private channel;
2. verify schema, the exact qualified regtest/testnet network, quote expiry and
   intent fingerprint;
3. construct the PCZT in an isolated Zallet;
4. compare Zallet inspection output with the Obliq human review screen;
5. require an explicit human authorization on the signer side;
6. prove/sign/extract/broadcast outside the application;
7. return only request ID, signer/version, txid, signed-artifact hash and the
   explicitly inspected positive network fee in integer zatoshis;
8. reject replay or a conflicting request ID;
9. redact RPC credentials, PCZT, raw transaction and wallet material from logs.

Zallet's privileged RPC must never be public plaintext HTTP. Use loopback or a
private host reached through mutually authenticated TLS/SSH, host firewalling,
process isolation and a dedicated operator account. Compromise of both Obliq
and the signer can substitute a payment; independent review is the mitigation,
not a claim that the app can cryptographically prevent a compromised signer.

The sanitized receipt's fee is persisted and included in chained audit
metadata. Zallet inspection metadata is still creator-recorded rather than
cryptographically verified until extraction. In v0.1.0-beta.3, inspection does
not reveal memo plaintext; memo correctness is established by handoff custody
and, after broadcast, independent UFVK decryption.
