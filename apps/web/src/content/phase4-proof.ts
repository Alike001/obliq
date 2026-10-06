/** Redacted evidence from the 2026-10-06 Phase-4 Z3 regtest tracer. */
export const phase4NetworkProof = {
  status: "VERIFIED",
  scope: "REGTEST END TO END",
  network: "regtest",
  pool: "IRONWOOD",
  txid: "55cace1af778497d182f64d88a5b611737c27017ef9382e19cbef47d77c0115a",
  minedHeight: 119,
  confirmationEvidence: [1, 3],
  amountZat: "25000000",
  quoteSource: "REGTEST_FIXED / CONTROLLED_REGTEST",
  privacyPolicy: "FullPrivacy",
  correlation: "MATCHED",
  finalState: "SETTLED",
  intentHash:
    "b75edf444b6feb50e7a81ed63fe4e2dee901a7cbf21e03bfb8fa1c789a410243",
  spendingAuthority: "EXTERNAL_ZALLET_ONLY",
  backendSpendingAuthority: "NONE",
  signer: "Zallet v0.1.0-beta.3 / 987382f67e622915228686e9f956c6a9c9a7514c",
  observer: "zcash_client_backend 0.24.0 / zcash_client_sqlite 0.22.0",
  dataService: "Zaino 0.6.0-no-tls (isolated regtest only)",
  node: "Zebra 6.2.3",
  publicNetwork: "BLOCKED",
} as const;
