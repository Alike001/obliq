# External signer hardening

Obliq emits a bounded handoff containing the canonical intent ID/hash, exact
shielded receiver, zatoshis, expiry, network and ZIP-321 request. It does not
send an approval as a signature and never accepts a PCZT, raw transaction,
wallet password, mnemonic or spending key.

The operator boundary must:

1. accept a request only over an authenticated encrypted private channel;
2. verify schema, regtest network, quote expiry and intent fingerprint;
3. construct the PCZT in an isolated Zallet;
4. compare Zallet inspection output with the Obliq human review screen;
5. require an explicit human authorization on the signer side;
6. prove/sign/extract/broadcast outside the application;
7. return only request ID, signer/version, txid and signed-artifact hash;
8. reject replay or a conflicting request ID;
9. redact RPC credentials, PCZT, raw transaction and wallet material from logs.

Zallet's privileged RPC must never be public plaintext HTTP. Use loopback or a
private host reached through mutually authenticated TLS/SSH, host firewalling,
process isolation and a dedicated operator account. Compromise of both Obliq
and the signer can substitute a payment; independent review is the mitigation,
not a claim that the app can cryptographically prevent a compromised signer.
