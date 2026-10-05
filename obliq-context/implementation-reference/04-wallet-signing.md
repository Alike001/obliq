# Wallet and Signing

Obliq separates business approval from cryptographic authorization.

Required boundary:
Application -> readiness checks -> SettlementIntent -> signing handoff -> authorized wallet/signer -> signed transaction -> broadcast.

Rules:
- Backend never stores seed phrase, private spending key, or unrestricted signer credential.
- Human signer sees the exact business intent before authorization.
- Amount, destination, obligation version and quote version are bound to the signing intent.
- Material changes invalidate prior approvals/signing preparation.
- Prefer an existing supported wallet/signing path for competition-critical V1.
- PCZT/FROST may influence interfaces but are not required unless real integration is proven.

Zallet RPC security:
- Treat wallet RPC as privileged local infrastructure.
- Do not expose a wallet RPC endpoint publicly.
- Secret parameters must not be casually passed on command lines or logged.
