# UX audit: current Obliq frontend

Audited at commit `d260cbb` by reading every route, layout and shared component
under `apps/web/src`. The app was not run against a database for this audit, so
findings describe what the code renders, and every finding cites its source
file. Contrast ratios were computed from the colour values in
`apps/web/src/app/globals.css` and the Tailwind classes in use.

Findings are tagged by kind:

- **U** usability: the user cannot tell what happened, what to do next, or how
  to recover.
- **H** visual hierarchy: the page does not show what matters first.
- **R** responsive: the layout fails or degrades at narrow widths.
- **A** accessibility: a WCAG 2.2 AA concern or an assistive-technology gap.
- **T** truthful language: the surface is inconsistent with the documented
  implementation status.

Severity is **High** (blocks or misleads a core journey), **Medium** (slows it
or harms a group of users) or **Low** (polish).

## 1. Surface inventory

Every current product surface, with the states it handles today.

### Public

| Route                                | Source                                  | Purpose                                            | States handled today                                              |
| ------------------------------------ | --------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| `/`                                  | `app/page.tsx`                          | Landing page                                       | Static only                                                       |
| `/security`                          | `app/security/page.tsx`                 | Authority model and current limits                 | Static only                                                       |
| `/proof`                             | `app/proof/page.tsx`                    | Capability register and runtime checks             | Database unavailable, not configured, audit chain invalid         |
| `/docs`                              | `app/docs/page.tsx`                     | Redirects to `/docs/overview`                      | None                                                              |
| `/docs/[slug]`                       | `app/docs/[slug]/page.tsx`              | Documentation article (18 pages in `content/docs`) | Not found (framework default)                                     |
| `/verify/[evidenceId]`               | `app/verify/[evidenceId]/page.tsx`      | Recipient view of an evidence package              | Rate limited, not found, integrity failure, revoked or superseded |
| `/verify/[evidenceId]/artifact.json` | `app/verify/[evidenceId]/artifact.json` | Canonical JSON download                            | Not audited as UI                                                 |

### Authentication

| Route            | Source                       | Purpose                 | States handled today                                        |
| ---------------- | ---------------------------- | ----------------------- | ----------------------------------------------------------- |
| `/auth/login`    | `app/auth/login/route.ts`    | Starts the OIDC flow    | Plain-text 404 (OIDC not configured) and 429 (rate limited) |
| `/auth/callback` | `app/auth/callback/route.ts` | Completes the OIDC flow | Plain-text 400, 401 and 429 responses                       |
| `/auth/logout`   | `app/auth/logout/route.ts`   | Ends the session        | Redirect only                                               |

### Authenticated workspace

| Route                                | Source                                     | Purpose                                             | States handled today                                        |
| ------------------------------------ | ------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------- |
| `/app`                               | `app/app/page.tsx`                         | Overview metrics and recent obligations             | Empty                                                       |
| `/app/obligations`                   | `app/app/obligations/page.tsx`             | List and search                                     | Empty                                                       |
| `/app/obligations/new`               | `app/app/obligations/new/page.tsx`         | Manual capture                                      | Prerequisite missing (no vendor)                            |
| `/app/obligations/upload`            | `app/app/obligations/upload/page.tsx`      | Invoice upload                                      | Seeded-extraction notice                                    |
| `/app/obligations/review/[sourceId]` | `app/app/obligations/review/[sourceId]`    | Human review of extracted fields                    | Not found                                                   |
| `/app/obligations/[id]`              | `app/app/obligations/[id]/page.tsx`        | Record, controls, approvals, readiness, observation | Created, updated, duplicate blocked, several empty sections |
| `/app/obligations/[id]/edit`         | `app/app/obligations/[id]/edit/page.tsx`   | Edit, creating a new version                        | Not found                                                   |
| `/app/vendors`                       | `app/app/vendors/page.tsx`                 | Vendor list                                         | Empty                                                       |
| `/app/vendors/new`                   | `app/app/vendors/new/page.tsx`             | Create vendor                                       | None                                                        |
| `/app/vendors/[id]`                  | `app/app/vendors/[id]/page.tsx`            | Destinations, manual verification, history          | Empty sections, role-gated verification form                |
| `/app/approvals`                     | `app/app/approvals/page.tsx`               | Approval inbox                                      | Empty                                                       |
| `/app/settlements`                   | `app/app/settlements/page.tsx`             | Settlement list                                     | Empty                                                       |
| `/app/settlements/[id]`              | `app/app/settlements/[id]/page.tsx`        | Signing review and receipts                         | Quote expired, per-state forms                              |
| `/app/evidence`                      | `app/app/evidence/page.tsx`                | Create and list evidence                            | Nothing eligible, nothing issued                            |
| `/app/evidence/preview/[id]`         | `app/app/evidence/preview/[id]/page.tsx`   | Mandatory recipient preview                         | Already issued, unavailable                                 |
| `/app/evidence/[id]`                 | `app/app/evidence/[id]/page.tsx`           | Issued package, share, supersede, revoke            | Non-active status                                           |
| `/app/policies`                      | `app/app/policies/page.tsx`                | Policy tiers and versions                           | No policy, read-only role                                   |
| `/app/ledger`, `/app/settings`       | `app/app/[section]/page.tsx`               | Planned-area placeholder                            | Planned                                                     |
| All of `/app`                        | `app/app/loading.tsx`, `app/app/error.tsx` | Shared loading skeleton and error boundary          | Loading, error                                              |

Shared components: `app-shell`, `site-header`, `site-footer`, `docs-shell`,
`brand`, `status-pill`, `finance-form`, `obligation-form`, `evidence-artifact`.

## 2. Journey map

| #   | Journey                         | Path                                                                                                             | Where it breaks down   |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------- |
| J1  | Evaluate the product            | `/` → `/proof`, `/security`, `/docs` → `/app`                                                                    | T1, T2, H1, R1         |
| J2  | Sign in                         | `/app` → `/auth/login` → identity provider → `/auth/callback` → `/app`                                           | U1                     |
| J3  | Capture a bill                  | `/app/vendors/new` → vendor, add and verify destination → `/app/obligations/new` or `upload` → `review` → record | U2, U3, U4, A3         |
| J4  | Control and approve             | Record: evaluate policy → resolve duplicates → `/app/approvals` → approve → evaluate readiness                   | U3, U5, U6, H2, H3     |
| J5  | Settle                          | Record: prepare intent → `/app/settlements` → signing review → signing receipt → broadcast → observer            | U3, U7, U8, U9, H4, R3 |
| J6  | Issue evidence                  | `/app/evidence` → preview → issue → share link → supersede or revoke                                             | U3, U5, U10, U11, H5   |
| J7  | Verify evidence (outside party) | `/verify/[evidenceId]` → download JSON or print                                                                  | H6, U12, A5            |
| J8  | Administer policy               | `/app/policies` → publish new version                                                                            | U3, U13                |

## 3. Findings

### 3.1 Truthful language

These are inconsistencies between surfaces. None overstates a capability, but
a reader cannot tell which statement is current.

| ID  | Sev    | Finding                                                                                                                                                                                                                                                                                                       | Source                                                                                       |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| T1  | High   | Four surfaces name four different phases. The landing hero says "Phase 2 control & approval engine", the docs header and article say "Phase 5", the workspace sidebar and proof page say "Phase 6", and the footer says "Foundation phase—no live settlement capability yet".                                 | `app/page.tsx`, `docs-shell.tsx`, `docs/[slug]/page.tsx`, `app-shell.tsx`, `site-footer.tsx` |
| T2  | High   | The landing page says "Zcash settlement and reconciliation remain explicitly unavailable—not simulated", while `/proof` reports end-to-end settlement as "VERIFIED · REGTEST" and `docs/architecture/implementation-status.md` records it as implemented on regtest. The landing understates and contradicts. | `app/page.tsx`, `app/proof/page.tsx`                                                         |
| T3  | Medium | The landing hero shows a product preview with invented vendors and amounts ("Northstar Labs", "$24.8k"). It is labelled, but the label is a `SEEDED` pill and "LAYOUT DATA ONLY" in 10px muted text. A skimming reader sees a working dashboard with customer data.                                           | `app/page.tsx` (`ProductPreview`)                                                            |
| T4  | Medium | `IMPLEMENTED` covers both capabilities exercised on any deployment and capabilities proven only on regtest. The regtest scope appears in the description text, not in the status. `CONTRIBUTING.md` asks for the `REGTEST VERIFIED` distinction to be preserved; the status pill cannot express it.           | `status-pill.tsx`, `app/proof/page.tsx`                                                      |
| T5  | Low    | The primary header button reads "Open foundation", which names an internal phase rather than what the link does.                                                                                                                                                                                              | `site-header.tsx`                                                                            |
| T6  | Low    | The workspace header shows a permanent `IMPLEMENTED` pill with no subject, and the overview has a "System readiness" card of hard-coded capability pills. Both read as live operational status but are static.                                                                                                | `app-shell.tsx`, `app/app/page.tsx`                                                          |

### 3.2 Usability

| ID  | Sev    | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                   | Source                                                                                                      |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| U1  | High   | There is no sign-in page. An unauthenticated visit to `/app` redirects straight to the identity provider, and every authentication failure is a bare plain-text response ("Authentication failed", "Too many authentication attempts") with no navigation, explanation or way back.                                                                                                                                                       | `app/app/layout.tsx`, `app/auth/login/route.ts`, `app/auth/callback/route.ts`                               |
| U2  | High   | Every server-action failure, including ordinary validation ("Select an invoice file", a rejected scan, an invalid decision), is thrown and lands on the workspace error boundary. That boundary always says "We could not load this financial record", which is wrong for a failed save, and the form's contents are lost. There is no field-level error anywhere in the product.                                                         | `app/app/actions.ts`, `app/app/error.tsx`                                                                   |
| U3  | High   | Most successful actions give no confirmation. Actions redirect with a flag (`?destination=added`, `?verified=1`, `?controls=evaluated`, `?approval=recorded`, `?readiness=evaluated`, `?duplicate=resolved`, `?prepared=`, `?signing=…`, `?broadcast=recorded`, `?issued=1`, `?revoked=1`, `?version=created`), but only the obligation page reads any, and only `created`, `updated` and `duplicate=blocked`. Everything else is silent. | `app/app/actions.ts`, all workspace detail pages                                                            |
| U4  | Medium | Forms give no pending feedback. No button shows that a submission is in progress, so a slow approval, issuance or upload looks like nothing happened.                                                                                                                                                                                                                                                                                     | All workspace forms (no client component uses `useFormStatus`)                                              |
| U5  | High   | Consequential, hard-to-reverse actions run on a single click with no confirmation step: approve, reject, issue evidence, revoke evidence, record a signing or broadcast outcome, and add a destination (which supersedes the current one and invalidates approvals).                                                                                                                                                                      | `obligations/[id]/page.tsx`, `evidence/[id]/page.tsx`, `settlements/[id]/page.tsx`, `vendors/[id]/page.tsx` |
| U6  | Medium | "Evaluate readiness" is disabled unless the state is `APPROVED`, with no explanation of why or what would enable it. "Edit record" is offered in every state, but the server rejects edits after broadcast, which sends the user to the generic error page.                                                                                                                                                                               | `obligations/[id]/page.tsx`                                                                                 |
| U7  | Medium | Preparing a settlement intent asks for an "exact zatoshi amount" as a raw integer, with no ZEC equivalent shown and no restatement of the business amount beside it. An error of one digit is a tenfold payment.                                                                                                                                                                                                                          | `obligations/[id]/page.tsx`                                                                                 |
| U8  | Medium | After preparing an intent, the user is sent to the settlements list rather than to the new signing review, and must find the row.                                                                                                                                                                                                                                                                                                         | `app/app/actions.ts` (`createSettlementIntentAction`)                                                       |
| U9  | Medium | On the signing review, quote expiry is a static timestamp with no remaining time. When it expires the page says "Re-quote; this intent cannot be signed" but offers no action to do so. The ZIP-321 request cannot be copied except by manual selection.                                                                                                                                                                                  | `settlements/[id]/page.tsx`                                                                                 |
| U10 | Medium | Evidence creation offers a template and a grid of field checkboxes with the rule "if none are checked, the template applies". Fields the user's role may not disclose are still selectable; the server rejects them, which per U2 lands on the error page. "Create corrected version" always uses the minimal template regardless of the original.                                                                                        | `evidence/page.tsx`, `evidence/[id]/page.tsx`                                                               |
| U11 | Medium | The share link is shown as a relative path (`/verify/…`) with no copy control, so it cannot be pasted to a recipient as shown.                                                                                                                                                                                                                                                                                                            | `evidence/[id]/page.tsx`                                                                                    |
| U12 | Medium | The recipient verification page uses the marketing header, including the "Open foundation" button and product navigation. A vendor or accountant arriving from a link is offered a product they are not a user of, and nothing explains what they are looking at or who sent it.                                                                                                                                                          | `verify/[evidenceId]/page.tsx`                                                                              |
| U13 | Low    | Record state is shown as the raw enum everywhere (`UNDER_REVIEW`, `READY_TO_SETTLE`, `BROADCAST_UNKNOWN`), people are shown as truncated UUIDs ("Actor 3f2a…"), and dates use the server's locale with no time zone.                                                                                                                                                                                                                      | All workspace pages                                                                                         |
| U14 | Low    | The obligations list supports a `state` filter in its query string, but the page offers no control for it, and no list has sorting or paging.                                                                                                                                                                                                                                                                                             | `obligations/page.tsx`                                                                                      |
| U15 | Low    | The workspace shows a hard-coded organization name ("Obliq Studio") and initials ("OS"). The signed-in person's name, role and organization are never shown, although role decides what they may approve.                                                                                                                                                                                                                                 | `app-shell.tsx`                                                                                             |
| U16 | Low    | There is no branded not-found page and no root error boundary. A wrong link, or a failure on `/verify` other than rate limiting, falls through to the framework default.                                                                                                                                                                                                                                                                  | `app/` (no `not-found.tsx`, no root `error.tsx`)                                                            |
| U17 | Low    | Documentation has no previous/next links and no index page, and the "On this page" outline is only present at the widest breakpoint.                                                                                                                                                                                                                                                                                                      | `docs/[slug]/page.tsx`                                                                                      |

### 3.3 Visual hierarchy

| ID  | Sev    | Finding                                                                                                                                                                                                                                                                                                           | Source                                            |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| H1  | Medium | The capability register on `/proof` is a flat list of 24 rows in no stated order, with implemented, seeded, blocked, planned and unavailable items interleaved. The one blocked item, public-network settlement, is row 13.                                                                                       | `app/proof/page.tsx`                              |
| H2  | High   | The obligation record is seven stacked cards of equal weight (details, control boundary, control, approvals, readiness, observation, history). Nothing shows where the obligation is in its lifecycle or what the next action is and whose it is. Two adjacent cards are titled "Control boundary" and "Control". | `obligations/[id]/page.tsx`                       |
| H3  | Medium | The obligation state pill is amber for every state, so settled, blocked and under review look the same. Elsewhere state is plain bold text.                                                                                                                                                                       | `obligations/[id]/page.tsx`                       |
| H4  | High   | The signing review presents a five-stage ceremony as unordered cards. The fact that the settlement is on regtest is one of eight equal detail rows. "Record non-success outcome" has no button styling at all (class `button` with no variant), so it renders as bare text.                                       | `settlements/[id]/page.tsx`                       |
| H5  | Medium | "Revoke without deleting", a destructive action, also has no button variant and renders as bare text, while the preview state pill is the same green as an active issued package.                                                                                                                                 | `evidence/[id]/page.tsx`, `evidence-artifact.tsx` |
| H6  | High   | On the verification page an integrity failure is a banner above the document, but the document below still renders in full with its normal styling and status pill. The verdict a recipient came for is not the dominant element in either the pass or the fail case.                                             | `verify/[evidenceId]/page.tsx`                    |
| H7  | Medium | The security page's "Current limits" is a single paragraph of roughly 230 words in an amber box. It holds the most important honesty content on the site and is the hardest block on the site to read.                                                                                                            | `app/security/page.tsx`                           |
| H8  | Low    | Nearly every heading has an uppercase tracked label above it ("Accounts payable", "Deliberate review", "Prove"). Used on every page, the label stops carrying information.                                                                                                                                        | `.eyebrow` in `globals.css`, all pages            |
| H9  | Low    | The overview places six metrics in a five-column grid, so the sixth wraps alone, and metrics are not links to the filtered list they count. Amounts in tables are not right-aligned, so magnitudes cannot be compared down a column.                                                                              | `app/app/page.tsx`, list pages                    |
| H10 | Low    | "Inter" is named first in the font stack but is never loaded, so the product renders in whichever fallback each operating system has. The brand has no consistent typeface today.                                                                                                                                 | `globals.css`, `app/layout.tsx`                   |

### 3.4 Responsive

| ID  | Sev    | Finding                                                                                                                                                                                               | Source                                                           |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| R1  | High   | Below 768px the public header hides its navigation and offers no replacement. Documentation, Security and Proof are reachable only from the footer.                                                   | `site-header.tsx`                                                |
| R2  | High   | Workspace tables set a minimum width (850px obligations, 760px approvals, 600px vendors) and scroll sideways on a phone. State and amount are off-screen in the obligations list at 390px.            | `obligations/page.tsx`, `approvals/page.tsx`, `vendors/page.tsx` |
| R3  | Medium | The settlements list hides its column headers below 768px and stacks the four values with no labels, so two amounts and a state appear as unlabelled lines.                                           | `settlements/page.tsx`                                           |
| R4  | Medium | Workspace navigation on mobile is nine pills in a horizontally scrolling strip, with no current-page indication and no marker on the two planned sections. Later items are hidden until scrolled.     | `app-shell.tsx`                                                  |
| R5  | Medium | Page headers that pair a title with action buttons do not wrap on the obligation and vendor pages (`flex` with `justify-between` and no wrap), so a long reference and two buttons compete for 390px. | `obligations/[id]/page.tsx`, `vendors/page.tsx`                  |
| R6  | Low    | The authority diagram on the security page keeps a horizontal row of arrows between two grids that stack vertically on mobile, so the arrows no longer point between anything.                        | `app/security/page.tsx` (`AuthorityDiagram`)                     |
| R7  | Low    | Inline forms inside records (approval note with two buttons, duplicate resolution, zatoshi entry) rely on `flex` rows that leave inputs very narrow at 390px.                                         | `obligations/[id]/page.tsx`                                      |

### 3.5 Accessibility

| ID  | Sev    | Finding                                                                                                                                                                                                                    | Source                                                                       | WCAG                                               |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| A1  | High   | Input and select borders are `rgb(20 33 29 / 0.11)` on the panel colour, a contrast of 1.24:1. The boundary of every form control is close to invisible.                                                                   | `.hairline` in `globals.css`, `finance-form.tsx`                             | 1.4.11                                             |
| A2  | High   | Planned documentation items are 8px text at 55% opacity of the muted colour, 2.12:1. Sidebar captions use white at 45% on the ink colour, 4.39:1 at 11px. Status pills are 10px.                                           | `docs-shell.tsx`, `app-shell.tsx`, `status-pill.tsx`                         | 1.4.3                                              |
| A3  | High   | Several inputs have a placeholder and no label: obligation search, both destination-verification inputs, and the duplicate-resolution note.                                                                                | `obligations/page.tsx`, `vendors/[id]/page.tsx`, `obligations/[id]/page.tsx` | 1.3.1, 3.3.2, 4.1.2                                |
| A4  | Medium | Navigation never marks the current page (`aria-current` is absent in the workspace, docs and public navigation). A planned section is marked only by a 6px dot with a `title` attribute.                                   | `app-shell.tsx`, `docs-shell.tsx`, `site-header.tsx`                         | 1.3.1, 2.4.8                                       |
| A5  | Medium | Pages that embed the evidence document have two `h1` elements, because `EvidenceArtifact` renders its own.                                                                                                                 | `evidence-artifact.tsx` and the three pages that use it                      | 1.3.1                                              |
| A6  | Medium | Data tables have no `scope` on header cells and no caption. Only the first header cell has padding, so the remaining headers sit flush against each other.                                                                 | `obligations/page.tsx`, `vendors/page.tsx`, `approvals/page.tsx`             | 1.3.1                                              |
| A7  | Medium | State is sometimes colour alone: the green dot beside the session label, the white dot for planned sections, policy findings distinguished by text colour, and the single-colour obligation state pill (H3).               | `app-shell.tsx`, `obligations/[id]/page.tsx`                                 | 1.4.1                                              |
| A8  | Medium | There is no skip link on any layout. The workspace has nine navigation links before the content.                                                                                                                           | All layouts                                                                  | 2.4.1                                              |
| A9  | Medium | Touch targets fall below 44px: mobile buttons are 40px high, mobile navigation pills about 28px, and "Sign out", "View all" and the back links are bare text.                                                              | `globals.css`, `app-shell.tsx`                                               | 2.5.8 (24px minimum met; 44px recommended not met) |
| A10 | Low    | Motion is not conditioned on user preference: smooth scrolling, the button hover lift and the loading pulse all run regardless of `prefers-reduced-motion`.                                                                | `globals.css`, `app/app/loading.tsx`                                         | 2.3.3                                              |
| A11 | Low    | Success and error messages on the obligation page are plain paragraphs with no live-region role, so a screen reader is not told that the page it landed on carries an outcome. Dates are text rather than `time` elements. | `obligations/[id]/page.tsx`                                                  | 4.1.3                                              |
| A12 | Low    | Body text passes AA but with little margin: the muted colour is 4.51:1 to 4.99:1 on the four backgrounds it sits on, and is used at 10px to 12px for a large share of the interface.                                       | `globals.css`                                                                | 1.4.3                                              |

## 4. What works and should be kept

- **The copy is honest.** Statements such as "READY_TO_SETTLE is not evidence
  of payment", "A timeout is UNKNOWN—not failure and never settlement" and the
  evidence disclaimer are the product's best material. The proposal keeps their
  meaning and gives them more prominence.
- **Authority is explained at the point of action.** Approval, signing and
  observation each say what they cannot do.
- **The mandatory evidence preview** before issuance is the right interaction.
- **Role restrictions are explained in place** on policies and approvals.
- **Foundations are present:** a global focus-visible outline, `lang`, labelled
  navigation landmarks, wrapping labels on the main forms, definition lists for
  record details, a screen-reader loading message, and long identifiers that
  wrap rather than overflow.

## 5. Priorities

1. **Make outcomes visible** (U2, U3, U4, U5). A finance user must always know
   whether an action was recorded. This is the largest gap and most of it is
   presentation.
2. **Give records a spine** (H2, H3, H4, H6). Show where a record is, in whose
   hands, and what happens next.
3. **Make it work on a phone** (R1, R2, R3, R4).
4. **Fix the control and text contrast failures** (A1, A2, A3).
5. **Reconcile the status language** (T1, T2, T4) so every surface says the
   same true thing.

`design-system.md` proposes the system that addresses these. Section 11 of that
document maps each finding to its remedy and notes which remedies need an owner
decision because they touch a server action.
