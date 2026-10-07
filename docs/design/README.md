# Obliq design

**Status: three directions proposed, awaiting a decision (issue #1).** No
direction is approved, and nothing in `apps/web` uses this work. Large-scale
implementation should not begin until one is chosen.

This folder is research and design proposals only. It changes no application
code, schema, authentication, policy, approval, settlement, observer, signer,
reconciliation or evidence behaviour.

## Start here

1. [`directions.md`](./directions.md): three high-fidelity directions for the
   landing page, dashboard and obligation detail, with trade-offs and a
   recommendation.
2. [`audit.md`](./audit.md): every current surface, eight user journeys and 52
   findings.

## Contents

| File                                                             | What it is                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`directions.md`](./directions.md)                               | The three directions, their screens, trade-offs, and the recommendation                                   |
| [`directions/`](./directions)                                    | Static HTML and screenshots for each direction (A Paper, B Lanes, C Docket)                               |
| [`audit.md`](./audit.md)                                         | Surface inventory, journeys and findings by kind and severity                                             |
| [`design-system.md`](./design-system.md)                         | The full system for Direction B: tokens, type, layout, components, states                                 |
| [`proposals/`](./proposals)                                      | Further Direction B screens: obligations list, signing review, evidence verification, states, foundations |
| [`screens/`](./screens)                                          | Screenshots of the screens in `proposals/`                                                                |
| [`proposed-behavior-changes.md`](./proposed-behavior-changes.md) | Server-action and authentication changes the design would like, described and not implemented             |

## Design-decision summary

- **Recommended: Direction B, "Lanes".** One oblique hatch marks anything that
  is not live, and business approval, signing and observation are drawn as
  three lanes.
- **Direction A, "Paper",** keeps the current warm look and corrects it. Lowest
  cost, least distinctive.
- **Direction C, "Docket",** treats each bill as a docket crossing three desks,
  with ink stamps for state. Most distinctive, highest cost.
- Every direction groups the dashboard by whose turn it is, opens a record with
  its next action, and keeps regtest visibly separate from public networks.

## Claims

All values in the screens are labelled placeholders. Network labels follow what
the `main` branch reports: regtest settlement verified, public network blocked.
Section 8 of `directions.md` explains how the testnet label changes when the
runtime status does.

## Further Direction B screens

| Surface                                   | Proposal                                           | Desktop                                   | Mobile                                   |
| ----------------------------------------- | -------------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| Obligations list                          | [`obligations.html`](./proposals/obligations.html) | [view](./screens/obligations-desktop.png) | [view](./screens/obligations-mobile.png) |
| Signing review                            | [`settlement.html`](./proposals/settlement.html)   | [view](./screens/settlement-desktop.png)  | [view](./screens/settlement-mobile.png)  |
| Evidence verification (outside recipient) | [`verify.html`](./proposals/verify.html)           | [view](./screens/verify-desktop.png)      | [view](./screens/verify-mobile.png)      |
| Interaction states                        | [`states.html`](./proposals/states.html)           | [view](./screens/states-desktop.png)      | [view](./screens/states-mobile.png)      |
| Foundations and components                | [`foundations.html`](./proposals/foundations.html) | [view](./screens/foundations-desktop.png) | [view](./screens/foundations-mobile.png) |
