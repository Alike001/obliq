# Judge-accessible interactive demo

Captured from the production preview build on 2026-10-12. The server ran with
`OBLIQ_DEPLOYMENT_MODE=preview`, every private runtime disabled, network
`disabled`, and `PUBLIC_NETWORK_BLOCKED`.

| File                       | Viewport    | State                                                       |
| -------------------------- | ----------- | ----------------------------------------------------------- |
| `01-demo-desktop.png`      | 1440 × 1000 | Guided new-vendor payable; unreviewed destination blocks it |
| `02-demo-mobile-ready.png` | 390 × 844   | Approved-control preset with exercise counters satisfied    |

The second screenshot's `READY TO SETTLE` result is a deterministic browser
calculation over fictional inputs. It is not a persisted approval, settlement
intent, signature, broadcast, observation, or payment. The complete historical
regtest record is available separately on `/proof`; it never changes with the
sandbox.

Browser acceptance checked both `/demo` and `/proof` at 1440px and 390px:

- no horizontal overflow or script/console errors;
- the landing page's primary preview action resolves to `/demo`;
- the three presets calculate new-vendor, unresolved-duplicate and
  approved-control outcomes through the policy engine;
- the approved-control path plus policy-derived exercise counters can reach
  browser-calculated readiness;
- SETTLE remains locked even when the browser calculation reaches
  `READY_TO_SETTLE`;
- the recorded 0.25 ZEC regtest evidence remains separately labelled on
  `/proof`; and
- no wallet, email, database, signer, observer, or mutation was invoked.

The screenshots contain only fictional sandbox data and the already-public,
redacted regtest evidence used by `/proof`.
