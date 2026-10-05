# Shielded Settlement

Obliq's chain-critical value proposition requires real shielded Zcash settlement.

Business model:
- Obligation remains denominated in business currency (e.g. USD).
- SettlementQuote snapshots the exact ZEC/zatoshi amount, source, timestamp and expiry.
- Expired quotes cannot be signed; re-quote is required.
- Integer zatoshis / exact decimal handling only. Never floating point.

Correlation:
- Prefer a unique/diversified receiving context per obligation when supported by the chosen wallet path.
- Use an opaque encrypted memo reference as secondary correlation metadata.
- Do not depend solely on matching by amount.
- Never put vendor name, invoice prose, internal category, approval data, or other sensitive business context in plaintext chain metadata.

Settlement states:
PREPARED -> AWAITING_SIGNATURE -> SIGNED -> BROADCAST -> DETECTED -> CONFIRMING -> SETTLED.

BROADCAST != SETTLED.
RPC/scanner unavailable != unpaid.
