# Landing page and onboarding: implementation notes

Implements issue #2 in Direction B, "Lanes", the direction chosen in pull
request #8. The system it follows is `docs/design/design-system.md` on that
pull request's branch.

## What changed

| Surface              | File                                                | Change                                                                        |
| -------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| Tokens and type      | `apps/web/src/app/globals.css`, `layout.tsx`        | Lanes colour roles, hatch, IBM Plex in three voices, the Lanes components     |
| `/`                  | `apps/web/src/app/page.tsx`                         | Rebuilt in Lanes around the product story; network claims read from runtime   |
| Authority track      | `apps/web/src/components/authority-track.tsx`       | Five steps placed in three lanes; hatched where proven on regtest only        |
| `/app` (empty state) | `apps/web/src/components/first-run-guide.tsx`       | Next-action panel, state tags with glyphs, blockers, the responsible party    |
| Onboarding logic     | `apps/web/src/lib/first-run.ts` (+ test)            | Adds who is responsible for each open step                                    |
| Network claims       | `apps/web/src/lib/network-claims.ts` (+ test)       | Sentence-case labels; the regtest claim carries a scope                       |
| Public links         | `apps/web/src/lib/site-links.ts` (+ test)           | One source for navigation and calls to action, aware of the read-only preview |
| Public header        | `apps/web/src/components/site-header.tsx`           | Wraps instead of hiding links; no script                                      |
| Public footer        | `apps/web/src/components/site-footer.tsx`           | Status sentence and links from the same sources                               |
| Status components    | `apps/web/src/components/status-pill.tsx`           | Capability stamp, scope tag, network stamp                                    |
| Logo                 | `apps/web/src/components/brand.tsx`, `app/icon.svg` | An O cut through at an oblique slant, in the header, footer and favicon       |

`package.json` and `package-lock.json` are unchanged. The typeface is loaded
with `next/font`, which ships with Next.js.

## The story, in reading order

A visitor should know within 30 seconds who Obliq serves and how a bill moves.

| Section                                     | Answers                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Hero                                        | Who it serves, the five-step workflow in one sentence, the non-custodial boundary, the network status |
| One bill, five steps, three authorities     | Capture, Control, Settle, Reconcile, Prove, and who acts at each                                      |
| On a public chain, your payables are public | The business problem                                                                                  |
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

## Motion

None. The Lanes system limits motion to a loading pulse, so the entrance
keyframes and smooth scrolling from the earlier revision are removed. The
landing page ships no client component of its own and the header needs no
script.

## Scope of the token change

`globals.css` is shared, so the Lanes tokens, typeface, buttons, sheets and
capability stamps now apply across the app. The structure of the dashboard,
record pages, documentation, security and proof pages is not changed here;
those follow under issues #3 and #4. The seven old colour names (`paper`,
`panel`, `muted`, `forest`, `mint` and so on) remain as aliases of the Lanes
roles until those pages migrate.

## Tests

Run on a production build served locally against PostgreSQL, in Chromium
driven by Playwright.

| Check                | Result                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 320px, 390px, 1440px | `scrollWidth` equals the viewport width on the landing page and on `/app`; nothing scrolls sideways                                             |
| Keyboard             | First Tab stop is "Skip to content", then brand, the three links, the primary action, then the page                                             |
| Focus indicator      | Every focused element matches `:focus-visible` and shows the violet outline                                                                     |
| Target size          | No link or button on the landing page is under 44px high at any of the three widths                                                             |
| Headings             | One `h1`; `h2` per section; `h3` beneath; no skipped level                                                                                      |
| Landmarks            | One header, one main, one footer; navigation regions are labelled                                                                               |
| Hidden content       | No element has an opacity below 1                                                                                                               |
| CTA links            | All twelve internal targets return 200                                                                                                          |
| Preview mode         | Built and started with the Render blueprint's environment: `/`, `/proof`, `/security` return 200 and contain no `/app` link; `/app` returns 404 |
| Onboarding, empty    | Vendor is next, for you; destination, verification and obligation are blocked with reasons; policy is done                                      |
| Onboarding, recorded | After adding a vendor and a destination: destination done, verification "Recorded but not verified"                                             |
| Onboarding, by role  | As Finance: verification reads "Waiting on an Owner, CFO or Treasury member"; next action is the obligation                                     |

Not tested: a screen reader, physical devices, browsers other than Chromium,
forced-colours mode, an OIDC deployment, and the hosted Render service (the
preview was run locally with the same build and start commands).

## Product behaviour

No change to authentication, sessions, capabilities, tenant predicates, policy
evaluation, approvals, quotes, intents, signing, broadcast, the observer,
reconciliation, or evidence. No server action, route handler, schema or
repository function is modified.

## Screenshots

| Surface                    | Desktop (1440px)                                             | Mobile (390px)                                             | Mobile (320px)                                         |
| -------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------ |
| Landing page               | [landing-desktop.png](./landing-desktop.png)                 | [landing-mobile.png](./landing-mobile.png)                 | [landing-mobile-320.png](./landing-mobile-320.png)     |
| Landing page, preview mode | [landing-preview-desktop.png](./landing-preview-desktop.png) | [landing-preview-mobile.png](./landing-preview-mobile.png) |                                                        |
| Workspace first-run guide  | [first-run-desktop.png](./first-run-desktop.png)             | [first-run-mobile.png](./first-run-mobile.png)             | [first-run-mobile-320.png](./first-run-mobile-320.png) |

The first-run screenshots show a local development database with one test
vendor whose destination is recorded but not verified.

## Open items

- The typeface is downloaded at build time by `next/font` and served from the
  app's own origin. A build without network access would need the font files
  committed instead.
- `/docs` and `/security` are prerendered, so their header takes the
  deployment mode from the build environment, not the runtime one.
- In an OIDC deployment "Open the workspace" still redirects straight to the
  identity provider. A sign-in page touches the authentication route and needs
  its own review.
