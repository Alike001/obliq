# Landing page, onboarding and workspace: implementation notes

Implements issues #2 and #3 in the Obliq design: Zcash gold, carbon black and
warm grey, with one layout language across the public site and the workspace.
It builds on the Lanes work from pull request #9, keeping its content model
(authority track, network claims, first-run rules, read-only preview) and
replacing its palette and typeface.

## What changed

| Surface              | File                                                              | Change                                                                            |
| -------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Tokens and type      | `apps/web/src/app/globals.css`, `layout.tsx`                      | Gold, carbon and warm grey roles; DM Sans and Space Grotesk; shared components    |
| `/`                  | `apps/web/src/app/page.tsx`                                       | Hero with product window, proof strip, signal board, authority track, reason grid |
| Product window       | `apps/web/src/components/hero-window.tsx`                         | A labelled illustration with example data; no live or organization data           |
| Authority track      | `apps/web/src/components/authority-track.tsx`, `track-reveal.tsx` | Five steps in three lanes; hatched where proven on regtest only                   |
| Workspace shell      | `apps/web/src/components/app-shell.tsx`, `app-nav.tsx`            | Sticky side navigation, mobile tab bar, network cap in the header                 |
| Record states        | `apps/web/src/components/state-tag.tsx`, `state-tone.ts` (+ test) | One tone per obligation and settlement state; see "Financial states"              |
| `/app` (empty state) | `apps/web/src/components/first-run-guide.tsx`                     | Next-action panel, state tags with glyphs, blockers, the responsible party        |
| Onboarding logic     | `apps/web/src/lib/first-run.ts` (+ test)                          | Who is responsible for each open step                                             |
| Network claims       | `apps/web/src/lib/network-claims.ts` (+ test)                     | Sentence-case labels; the regtest claim carries a scope                           |
| Public links         | `apps/web/src/lib/site-links.ts` (+ test)                         | One source for navigation and calls to action, aware of the read-only preview     |
| Public header/footer | `site-header.tsx`, `site-footer.tsx`, `docs-shell.tsx`            | Links from the same source; no workspace link in the read-only preview            |
| Motion               | `apps/web/src/components/motion.tsx`                              | Scroll reveals, reduced-motion setting, failsafe when scripts do not start        |
| Logo                 | `apps/web/src/components/brand.tsx`, `app/icon.svg`               | An O cut through at an oblique slant, in the header, footer and favicon           |

`apps/web/package.json` adds `gsap` 3.15.0, `@gsap/react` 2.1.2 and `motion`
14.0.0. The typefaces are loaded with `next/font`, which ships with Next.js.

## The story, in reading order

A visitor should know within 30 seconds who Obliq serves and how a bill moves.

| Section                                     | Answers                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Hero                                        | Who it serves, the five-step workflow in one sentence, the non-custodial boundary, the network status |
| Obliq never holds                           | The four things Obliq never has                                                                       |
| On a public chain, your payables are public | The business problem                                                                                  |
| One bill, five steps, three authorities     | Capture, Control, Settle, Reconcile, Prove, and who acts at each                                      |
| Why shielded Zcash                          | The role of Zcash                                                                                     |
| Treasury control stays at the edge          | What Obliq holds and never holds                                                                      |
| What is proven, and where                   | Network and product status                                                                            |
| Your first obligation, in four steps        | The first useful workflow                                                                             |

The hero sentence names the customer and the workflow in order: "Capture a
bill, control it with policy and approvals, settle it in shielded Zcash from a
signer you operate, reconcile the payment back to the bill, and prove it with
evidence you choose to disclose."

## The authority track

The five steps are one ordered list. From 900px each step sits in the lane of
the authority that performs it, with an oblique mark where authority passes to
another lane. Below 900px the same list is grouped under lane headings, in the
same order.

| Step      | Lane              | Who                         | Treatment            |
| --------- | ----------------- | --------------------------- | -------------------- |
| Capture   | Business approval | Your finance team, in Obliq | Solid                |
| Control   | Business approval | Your finance team, in Obliq | Solid                |
| Settle    | Signature         | Your signer, outside Obliq  | Hatched, Regtest tag |
| Reconcile | Observation       | Read-only observer          | Hatched, Regtest tag |
| Prove     | Business approval | Your finance team, in Obliq | Solid                |

Approval and payment are in different lanes and are never drawn as one
progress bar. The text under the heading says an approved bill has not been
paid until the signer signs it and the observer sees it settle.

## Capability and network labels

Network wording has one source: `networkClaims(status, network)`. The landing
page, the hero notice and the footer all read the status the server enforces
(`getRuntimeSecurityConfig().publicNetworkStatus`).

| Runtime status                         | Regtest settlement       | Public testnet read-only sync | Public funded settlement | Mainnet                                        |
| -------------------------------------- | ------------------------ | ----------------------------- | ------------------------ | ---------------------------------------------- |
| `PUBLIC_NETWORK_BLOCKED`               | Verified, tagged Regtest | Blocked                       | Not verified             | Blocked                                        |
| `PUBLIC_NETWORK_READY_FOR_FUNDED_TEST` | Verified, tagged Regtest | Ready for funded test         | Not verified             | Blocked                                        |
| `PUBLIC_NETWORK_VERIFIED`              | Verified, tagged Regtest | Verified                      | Verified                 | Blocked unless the verified network is mainnet |

How each label is drawn:

- A solid stamp is a live fact. The regtest line is solid and always carries
  the hatched Regtest scope tag, so a regtest result never looks like a public
  one.
- "Ready for funded test" and "Not verified" are dashed and hatched: not live.
- "Blocked" is a red-bordered stamp.

**What the page shows today is the first row.** `main` and the proposed Render
preview report `PUBLIC_NETWORK_BLOCKED`. If configuration cannot be read, the
page reports the blocked row.

Product capabilities use the capability stamp with the five fixed terms and
mirror the register on `/proof`.

## Read-only preview

The proposed Render service is a read-only preview that does not serve `/app`.
`isReadOnlyPreview()` reads `OBLIQ_DEPLOYMENT_MODE === "preview"`, the same
check pull request #11 uses, and `siteLinks()` returns the links for that mode.

In a preview:

- No link on the landing page, header or footer points to `/app`, and no label
  names the workspace as something to open. A unit test holds this.
- The primary action is "See what is proven"; the second is "Read the
  documentation".
- The header carries a hatched "Read-only preview" stamp.
- The hero states that the workspace, sign-in and evidence verification are
  not available and that nothing on the site can record, approve or move a
  payment.
- The four first steps are listed as text, without links.

The deployment mode comes from pull request #11, which is on `main`. Its
proxy answers `/app` with 404 in a preview; this work makes sure no page offers
a link there in the first place. The landing page reports the blocked network
row if the runtime configuration cannot be parsed.

## First-run guide

Shown on `/app` while the organization has no obligations. Five steps:

1. Add a vendor.
2. Record the vendor's payment destination.
3. Verify the destination.
4. Set the payment policy.
5. Record your first obligation.

Rules, each covered by a unit test in `first-run.test.ts`:

- A destination counts as verified only when it is current (`supersededAt` is
  null) and its status is `VERIFIED_MANUALLY`, the one status the policy engine
  passes. `UNVERIFIED`, `PENDING`, `VERIFIED` and `SUPERSEDED` do not count,
  and neither does a verified destination that was later superseded.
- Recording and verifying are separate steps, so a recorded destination shows
  "Recorded but not verified" rather than a done state.
- The first panel names one next action, says it is for the signed-in person,
  and has the one primary button.
- A blocked step says why ("Add a vendor first").
- When the signed-in role cannot verify a destination or set policy, the step
  reads "Waiting on an Owner, CFO or Treasury member" (or Policy
  Administrator). If nothing is open to the role, the first panel says who it
  is waiting on.
- The first obligation can be recorded before verification; the step says that
  policy will block it until the destination is verified.

Step state is a tag with a glyph and a word: filled disc for done, open ring
for open, half ring for waiting, square for blocked.

The role lists only choose which hint to show. They mirror the checks on the
vendor and policy pages; the server actions remain the authority.

Data comes from three existing repository functions, `listVendors`,
`listVendorDestinations` and `listPolicies`, each called with the session's
organization id. Nothing is written. The reads run only while the obligation
list is empty.

## Financial states

An approved obligation is not a completed payment, so the two never share a
look. `state-tone.ts` maps every obligation and settlement state to one tone,
and a unit test holds the rule.

| Tone    | States                                                                                       | Drawn as               |
| ------- | -------------------------------------------------------------------------------------------- | ---------------------- |
| Clear   | `SETTLED` only                                                                               | Green tag, filled disc |
| Ready   | `APPROVED`, `READY_TO_SETTLE`                                                                | Amber tag, open ring   |
| Hold    | Under review, approval required, prepared, signing, signed, broadcast, detected, confirming  | Amber tag, half disc   |
| Stop    | Rejected, blocked, failed, reconciliation exception                                          | Red tag, square        |
| Neutral | Draft, cancelled, expired, not created, unavailable, and any state the mapping does not know | Grey tag, open ring    |

Green and the filled disc are reserved for a settled payment. The tag always
carries the state's own word, so the meaning never rests on colour. The
"Ready to settle" line on the obligation page is amber for the same reason,
and the first-run guide ends with "An approved obligation has not been paid."

## Motion

Scroll reveals use Motion; the hero window and the authority track use GSAP.

- With `prefers-reduced-motion: reduce` the GSAP timelines do not run and the
  hero window is shown at once. Motion drops every position change; a section
  still fades in when it is scrolled to.
- Without scripts, a `noscript` rule in the root layout shows everything.
- If scripts are enabled but fail to load or start, a stylesheet failsafe
  shows the content after three seconds. `MotionProvider` sets `data-motion`
  on the root element once scripts run, which switches the failsafe off.

Script weight per page, gzip, measured in Chromium against a production build
of each commit:

| Page               | Before (`463cb02`) | After    | Change   |
| ------------------ | ------------------ | -------- | -------- |
| `/`                | 139.6 KB           | 237.8 KB | +98.2 KB |
| `/app`             | 136.0 KB           | 180.4 KB | +44.4 KB |
| `/app/obligations` | 136.0 KB           | 180.4 KB | +44.4 KB |
| `/proof`           | 139.6 KB           | 188.5 KB | +48.9 KB |
| `/docs/overview`   | 140.7 KB           | 189.6 KB | +48.9 KB |

GSAP is loaded only on the landing page. Motion is loaded on every page
because the root layout and the workspace navigation use it.

## Scope of the token change

`globals.css` is shared, so the tokens, typefaces, buttons, fields, tables and
tags apply across the app. The workspace shell, overview, obligations,
settlements, vendors and approvals pages take the new components. The older
colour names (`paper`, `panel`, `muted`, `mint` and so on) remain as aliases
for the pages that still use them.

## Tests

Run on a production build served locally against PostgreSQL, in Chromium
driven by Playwright, with axe-core 4 for the automated rules. Pages checked:
`/`, `/app`, `/app/obligations`, `/app/settlements`, `/app/vendors`.

| Check                | Result                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 320px, 390px, 1440px | `scrollWidth` equals the viewport width on all five pages; nothing scrolls sideways                                                                                      |
| axe (WCAG 2.2 A, AA) | No violations on any of the five pages at any of the three widths                                                                                                        |
| Text contrast        | 55 distinct text and background pairs measured from computed styles; the lowest is 4.6:1 (bronze on the fog band). All meet 4.5:1, or 3:1 for large text                 |
| Control contrast     | Field borders 3.2:1 against the surface; gold button label 9.5:1; current navigation item 9.5:1                                                                          |
| Keyboard             | Every focusable element is reached by Tab, in reading order: 22 on the landing page, 18 on the overview, 20 on obligations. The landing page starts at "Skip to content" |
| Focus indicator      | Every stop shows a 3px outline with a 2px offset: bronze on light surfaces (5.5:1), gold on carbon (9.9:1)                                                               |
| Reduced motion       | Hero window visible at once; no element is left offset or hidden after scrolling the page                                                                                |
| No scripts           | With JavaScript off, no element on the landing page is hidden                                                                                                            |
| Scripts fail to load | With every script request blocked, all landing page content is visible after three seconds                                                                               |
| Financial states     | Unit test: only `SETTLED` is clear; `APPROVED` and `READY_TO_SETTLE` are ready; an unknown state is neutral                                                              |
| Preview mode         | Built and started with the Render blueprint's environment; see the table below                                                                                           |
| Onboarding, empty    | With a vendor and no destination: destination is next, for you; verification is blocked with a reason; policy is done                                                    |

Read-only preview, with the environment from `render.yaml`:

| Request                                                                         | Result |
| ------------------------------------------------------------------------------- | ------ |
| `GET /`, `/proof`, `/security`, `/docs/overview`, `/health/ready`               | 200    |
| `GET /app`, `/app/obligations`, `/app/obligations/new`, `/app/settlements`      | 404    |
| `GET /app/vendors/new`, `/app/approvals`                                        | 404    |
| `GET /auth/login`, `/auth/callback`, `/auth/logout`; `POST /auth/logout`        | 404    |
| `GET /verify/{id}`, `/verify/{id}/artifact.json`, and an unknown route          | 404    |
| `POST /`, and any request carrying a `next-action` header                       | 404    |
| Links to `/app`, `/auth` or `/verify` on `/`, `/proof`, `/security` and `/docs` | None   |

Not tested: a screen reader, physical devices, browsers other than Chromium,
forced-colours mode, an OIDC deployment, and the hosted Render service (the
preview was run locally with the same build and start commands). The contrast
scan cannot read text set over a hatch or gradient; those nine pairs were
measured against the solid colour beneath and all pass.

## Product behaviour

No change to authentication, sessions, capabilities, tenant predicates, policy
evaluation, approvals, quotes, intents, signing, broadcast, the observer,
reconciliation, or evidence. No server action, route handler, schema or
repository function is modified.

## Screenshots

| Surface                    | Desktop (1440px)                                             | Mobile (390px)                                             | Mobile (320px)                                             |
| -------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Landing page               | [landing-desktop.png](./landing-desktop.png)                 | [landing-mobile.png](./landing-mobile.png)                 | [landing-mobile-320.png](./landing-mobile-320.png)         |
| Landing page, preview mode | [landing-preview-desktop.png](./landing-preview-desktop.png) | [landing-preview-mobile.png](./landing-preview-mobile.png) |                                                            |
| Workspace overview         | [dashboard-desktop.png](./dashboard-desktop.png)             | [dashboard-mobile.png](./dashboard-mobile.png)             | [dashboard-mobile-320.png](./dashboard-mobile-320.png)     |
| Workspace first-run guide  | [first-run-desktop.png](./first-run-desktop.png)             | [first-run-mobile.png](./first-run-mobile.png)             | [first-run-mobile-320.png](./first-run-mobile-320.png)     |
| Obligations                | [obligations-desktop.png](./obligations-desktop.png)         | [obligations-mobile.png](./obligations-mobile.png)         | [obligations-mobile-320.png](./obligations-mobile-320.png) |
| Settlements                | [settlements-desktop.png](./settlements-desktop.png)         | [settlements-mobile.png](./settlements-mobile.png)         | [settlements-mobile-320.png](./settlements-mobile-320.png) |
| Vendors                    | [vendors-desktop.png](./vendors-desktop.png)                 | [vendors-mobile.png](./vendors-mobile.png)                 | [vendors-mobile-320.png](./vendors-mobile-320.png)         |

The workspace screenshots show a local development database holding two
sample vendors and six sample obligations, one in each of six states. They
were inserted for these screenshots only; no approval, payment or settlement
took place. The first-run screenshots show the same database with no
obligations.

## Open items

- The typeface is downloaded at build time by `next/font` and served from the
  app's own origin. A build without network access would need the font files
  committed instead.
- `/docs` and `/security` are prerendered, so their header takes the
  deployment mode from the build environment, not the runtime one.
- The workspace shell has no "Skip to content" link; the public pages do.
- Without scripts the workspace shows its loading placeholder, because its
  pages stream their content. The public pages do not depend on scripts.
- Motion adds about 44 KB of gzip script to pages that only use it for the
  navigation marker. Loading it on demand is a possible follow-up.
- In an OIDC deployment "Open App" still redirects straight to the
  identity provider. A sign-in page touches the authentication route and needs
  its own review.
