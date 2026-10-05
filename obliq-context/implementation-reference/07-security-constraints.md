# Security Constraints

Non-negotiable:
- Server has no unrestricted treasury spending authority.
- Viewing authority is treated as a high-value privacy secret.
- AI has no approval/sign/broadcast authority.
- Tenant authorization is enforced server-side.
- Destination changes require reverification and invalidate affected approvals.
- Quote expiry invalidates settlement preparation.
- RPC/indexer failure produces UNKNOWN/UNAVAILABLE, never a fabricated business state.
- Logs must not contain seed phrases, spend keys, viewing keys, raw secrets or unnecessary sensitive invoice content.
- Production/demo proof must distinguish REAL, SEEDED DATA, SIMULATED and BLOCKED capabilities.
- No wallet RPC service is exposed directly to the public internet.
- Secrets must be redacted in /proof and docs.

Threat-model changes require documentation and tests in the same phase.
