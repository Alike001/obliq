# Obliq design system: Direction B, "Lanes"

**Status: proposed.** This is the full specification of Direction B, the
recommended one of the three directions in [`directions.md`](./directions.md).
It becomes the approved system only if the owner chooses that direction. Until
then nothing in `apps/web` uses it.

It answers the findings in [`audit.md`](./audit.md). Rendered examples are in
[`directions/b-lanes/`](./directions/b-lanes) and [`proposals/`](./proposals).

## 1. Direction

Obliq is accounts-payable software whose central promise is a separation: the
people who approve a payment, the signer that authorizes it, and the observer
that sees it settle are three different authorities, and Obliq holds no
spending authority at all. The second promise is that it never shows something
as real when it is not.

The design makes those two promises visible and keeps everything else quiet.

1. **Hatching marks what is not live.** One oblique hatch pattern appears on
   anything that is seeded, planned, unavailable, on a test network, or
   unknown. A solid surface means a persisted fact. A user learns one rule and
   can read the truth status of any screen at a glance. The hatch is drawn at
   the slant the product is named for.
2. **Authority has lanes.** A record's progress is drawn as three lanes
   (business approval, signature, observation) with an oblique hand-off where
   authority passes from one to the next. The same drawing explains the product
   on the landing page and locates a real obligation in the workspace.
3. **Hue means state.** The interface is ink on a cool paper grey. Green, amber
   and red appear only where they report a state, always with a shape and a
   word. One violet marks what is interactive or current. Nothing is coloured
   for decoration.
4. **Every record page leads with the next action.** The first panel says what
   is needed, from whom, and what it will and will not do.
5. **Words stay exact.** Capability and network terms are a controlled
   vocabulary. The design gives them fixed shapes and never paraphrases them.

### What this replaces

The current interface is a warm cream page with a forest-green accent, pill
buttons, large rounded cards and an uppercase label above every heading. This
proposal deliberately shares none of that: cool neutrals, a violet interactive
hue, 4px controls, flat surfaces separated by a single border, and headings
that stand without a label.

## 2. Colour

Tokens are semantic. Components reference the role, never the hex value.

| Token             | Value     | Role                                                   |
| ----------------- | --------- | ------------------------------------------------------ |
| `--ink`           | `#14233B` | Text, primary buttons, workspace rail                  |
| `--ink-2`         | `#47556B` | Secondary text                                         |
| `--ink-3`         | `#5F6B80` | Tertiary text and inactive glyphs, on `--surface` only |
| `--line`          | `#CCD4DE` | Dividers and container borders (decorative)            |
| `--line-strong`   | `#7E8A9C` | Borders of inputs and secondary buttons                |
| `--canvas`        | `#EDF1F4` | Page background                                        |
| `--surface`       | `#FFFFFF` | Records, forms, tables                                 |
| `--sunken`        | `#F5F7F9` | Table headers, code, lane background                   |
| `--violet`        | `#5A32A3` | Links, focus ring, current-page marker                 |
| `--violet-tint`   | `#EFE9F8` | Hover background for quiet buttons                     |
| `--violet-on-ink` | `#B9A6E8` | Focus ring and current marker on the ink rail          |
| `--clear`         | `#17603D` | Completed, passed, recorded; on `--clear-bg` `#E3F2E9` |
| `--hold`          | `#7A4B00` | Waiting, caution, test scope; on `--hold-bg` `#FBEFCF` |
| `--stop`          | `#9B1C1C` | Blocked, failed, destructive; on `--stop-bg` `#FBE6E4` |
| `--neutral-bg`    | `#E6EAEF` | Neutral tag and disabled control background            |
| `--hatch`         | pattern   | `-55deg`, 1px line every 6px, ink at 13% opacity       |

### Contrast

Computed with the WCAG 2 relative-luminance formula.

| Pair                                        | Ratio         | Requirement met          |
| ------------------------------------------- | ------------- | ------------------------ |
| `--ink` on `--surface` / `--canvas`         | 15.75 / 13.87 | AAA text                 |
| `--ink-2` on `--surface` / `--canvas`       | 7.55 / 6.65   | AA text (AAA on surface) |
| `--ink-3` on `--surface`                    | 5.38          | AA text                  |
| `--violet` on `--surface` / `--canvas`      | 8.68 / 7.64   | AAA / AA text            |
| white on `--ink`                            | 15.75         | AAA text                 |
| `#C3CCD8` on `--ink` (rail text)            | 9.71          | AAA text                 |
| `--violet-on-ink` on `--ink`                | 7.26          | 3:1 focus indicator      |
| `--line-strong` on `--surface` / `--canvas` | 3.50 / 3.08   | 3:1 control boundary     |
| `--clear` on `--clear-bg`                   | 6.53          | AA text                  |
| `--hold` on `--hold-bg`                     | 6.47          | AA text                  |
| `--stop` on `--stop-bg`                     | 6.81          | AA text                  |
| `--ink` on any state background             | ≥ 13.16       | AAA text                 |

Rules:

- State-tag text is always `--ink`. The state hue colours only the glyph and
  the background, so the label never depends on a tinted pair.
- `--line` (1.50:1) is decorative only. Anything a user must perceive to
  operate a control uses `--line-strong`.
- The light theme is the only theme in version 1. Evidence is printed and
  shared, and one well-tested theme is worth more than two partly tested ones.
  Because tokens are semantic, a dark theme can be added later without touching
  components.

## 3. Typography

One superfamily, IBM Plex, in three voices. Each voice has one job, so the
typeface itself tells the reader what kind of thing they are looking at.

| Voice | Family         | Used for                                                                  |
| ----- | -------------- | ------------------------------------------------------------------------- |
| Serif | IBM Plex Serif | Statements of record: the public headline and the evidence document title |
| Sans  | IBM Plex Sans  | The interface: every heading, label, control and paragraph                |
| Mono  | IBM Plex Mono  | Machine identifiers only: hashes, transaction IDs, payment requests       |

Amounts are set in the sans face with tabular lining figures
(`font-variant-numeric: tabular-nums lining-nums`) and never wrap. Mono is not
used for amounts, labels or state.

The families are open source (SIL Open Font License). They should be
self-hosted through `next/font` so that no visitor's browser contacts a font
service, which matters for a privacy product. The static proposals load them
from Google Fonts for convenience only.

### Scale

| Token         | Size                  | Line height | Weight | Use                                  |
| ------------- | --------------------- | ----------- | ------ | ------------------------------------ |
| `--text-3xl`  | 52px (clamps to 38px) | 1.08        | 500    | Public headline, serif               |
| `--text-2xl`  | 38px                  | 1.1         | 500    | Lower bound of the headline clamp    |
| `--text-xl`   | 28px                  | 1.2         | 600    | Page title; document title in serif  |
| `--text-lg`   | 21px                  | 1.3         | 600    | Wordmark                             |
| `--text-md`   | 17px                  | 1.55        | 400    | Lede, section heading at 600         |
| `--text-base` | 15px                  | 1.5         | 400    | Body, controls, table cells          |
| `--text-sm`   | 13px                  | 1.45        | 400    | Supporting text, field labels at 600 |
| `--text-xs`   | 12px                  | 1.4         | 600    | Capability stamp, scope tag          |

12px is the floor, and it is used only at weight 600 for two short-label
components. Reading text is never below 13px. Prose is limited to 68
characters per line.

Headings are sentence case and stand alone. There are no uppercase tracked
labels above headings.

## 4. Space, shape and elevation

- **Space** uses a 4px base: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5`
  24, `--s6` 32, `--s7` 48, `--s8` 72.
- **Radius** is 4px for controls and tags, 6px for containers, 2px for stamps
  and scope tags. There are no pills.
- **Elevation** is not used. A surface is separated from the canvas by a 1px
  `--line` border and its white fill. A shadow is permitted only on a modal
  dialog.
- **Density.** The workspace uses 15px body text and 12px to 16px cell padding.
  Public and documentation pages use the same scale with more vertical space
  (`--s8` between bands).

## 5. Layout and responsive behaviour

Two breakpoints only.

| Width          | Workspace                                                                                    | Public and docs                        |
| -------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| 900px and up   | 240px ink rail, top bar, content up to 1216px, record pages split main and 336px side column | Content up to 1216px, two-column bands |
| 720px to 899px | Rail becomes a "Menu" disclosure in the top bar; one column                                  | One column                             |
| Below 720px    | As above, and every table becomes a stacked list                                             | As above                               |

Rules:

- **No horizontal scrolling at any width.** Tables do not set a minimum width.
  Below 720px each row becomes a block: the primary cell is a heading and every
  other cell is a labelled line. Labels come from a `data-label` attribute on
  each cell, and header cells remain in the accessibility tree.
- **The network scope tag stays in the top bar at every width.** A user on a
  phone always knows which network they are looking at.
- **Navigation is complete at every width.** The mobile menu lists every
  section, marks the current one, and marks planned sections. The public header
  wraps instead of hiding links.
- **Page headers wrap.** Title block and actions are a wrapping flex row;
  actions drop below the title on narrow screens.
- **Touch targets** are at least 44px high for buttons, inputs, menu items and
  navigation links.
- **The authority track** is a staircase on wide screens and a grouped vertical
  list below 900px, in the same order.

Record page anatomy, wide and narrow:

```text
+------+------------------------------------------------+
| rail | top bar                    [Regtest] session    |
|      +------------------------------------------------+
|      | Obligations                                     |
|      | SPECIMEN-0006                    [Edit record]  |
|      | vendor, amount, due      (state tag)            |
|      | +--------------------------------------------+ |
|      | | Next action: what, who, what it does not do | |
|      | +--------------------------------------------+ |
|      | Authority track: three lanes                    |
|      | +---------------------------+ +--------------+ |
|      | | Policy findings           | | Business     | |
|      | | Network observation       | | details      | |
|      | | History                   | |              | |
|      | +---------------------------+ +--------------+ |
+------+------------------------------------------------+

+----------------------+
| obliq  [Regtest] Menu|
| Obligations          |
| SPECIMEN-0006        |
| (state tag)          |
| [Edit record]        |
| Next action          |
| Track, lane by lane  |
| Policy findings      |
| Network observation  |
| History              |
| Business details     |
+----------------------+
```

## 6. The three status components

The current single status pill is replaced by three components, because three
different questions were sharing one shape (audit T4, H3).

### 6.1 Capability stamp: what the product can do

A bordered 2px-radius label for the documented implementation vocabulary. The
five terms are unchanged.

| Term        | Treatment                      |
| ----------- | ------------------------------ |
| Implemented | Solid ink border, white fill   |
| Seeded      | Dashed border, hatched fill    |
| Planned     | Dashed border, hatched fill    |
| Unavailable | Dashed border, hatched fill    |
| Blocked     | Solid `--stop` border and text |

### 6.2 Scope tag: which network a fact is about

A small label with a hatched leading edge, reading "Regtest". It is attached to
every network-derived fact: a settled state, an observation, a transaction
reference, the settlement network on an evidence document, and the workspace
top bar. A regtest result is never shown without it. It is derived from the
existing runtime network value and adds no new domain status.

"Implemented" plus the scope tag is how the design expresses "verified on
regtest" without changing the `ImplementationStatus` type. Public-network
settlement continues to carry the Blocked stamp.

### 6.3 State tag: where a record is

A filled 4px-radius tag with a glyph and a sentence-case label. The glyph shape
carries the meaning; the hue reinforces it.

| Tone    | Glyph                | Meaning                                         |
| ------- | -------------------- | ----------------------------------------------- |
| Neutral | Open ring            | Not started, or in progress with no one waiting |
| Hold    | Half-filled ring     | Waiting on a person or a signer                 |
| Hold    | Triangle             | Needs attention before it can proceed           |
| Clear   | Filled disc          | Done and recorded                               |
| Stop    | Filled square        | Blocked, rejected or failed                     |
| Unknown | Dashed ring on hatch | Outcome not known                               |

Proposed presentation of existing states. This is a display mapping only; the
stored values and transitions are untouched.

| Obligation state           | Label                    | Tone and glyph       |
| -------------------------- | ------------------------ | -------------------- |
| `DRAFT`                    | Draft                    | Neutral, open ring   |
| `UNDER_REVIEW`             | Under review             | Neutral, open ring   |
| `APPROVAL_REQUIRED`        | Approval required        | Hold, half ring      |
| `APPROVED`                 | Approved                 | Clear, half ring     |
| `READY_TO_SETTLE`          | Ready to settle          | Clear, half ring     |
| `SETTLEMENT_PREPARED`      | Settlement prepared      | Hold, half ring      |
| `SIGNING`                  | Signing                  | Hold, half ring      |
| `BROADCAST`                | Broadcast                | Neutral, open ring   |
| `CONFIRMING`               | Confirming               | Neutral, open ring   |
| `SETTLED`                  | Settled                  | Clear, filled disc   |
| `REJECTED`                 | Rejected                 | Stop, square         |
| `CANCELLED`                | Cancelled                | Neutral, square      |
| `EXPIRED`                  | Expired                  | Stop, square         |
| `BLOCKED`                  | Blocked                  | Stop, square         |
| `SETTLEMENT_FAILED`        | Settlement failed        | Stop, square         |
| `RECONCILIATION_EXCEPTION` | Reconciliation exception | Unknown, dashed ring |

| Settlement state     | Label              | Tone and glyph       |
| -------------------- | ------------------ | -------------------- |
| `NOT_CREATED`        | Not created        | Neutral, open ring   |
| `PREPARED`           | Prepared           | Neutral, open ring   |
| `AWAITING_SIGNATURE` | Awaiting signature | Hold, half ring      |
| `SIGNED`             | Signed             | Clear, half ring     |
| `BROADCAST`          | Broadcast          | Neutral, open ring   |
| `BROADCAST_UNKNOWN`  | Broadcast unknown  | Unknown, dashed ring |
| `DETECTED`           | Detected           | Neutral, open ring   |
| `CONFIRMING`         | Confirming         | Neutral, open ring   |
| `SETTLED`            | Settled            | Clear, filled disc   |
| `FAILED`             | Failed             | Stop, square         |
| `UNAVAILABLE`        | Unavailable        | Unknown, dashed ring |

| Evidence status | Label               | Tone and glyph              |
| --------------- | ------------------- | --------------------------- |
| Preview         | Preview, not issued | Neutral on hatch, open ring |
| `ACTIVE`        | Active              | Clear, filled disc          |
| `SUPERSEDED`    | Superseded          | Hold, triangle              |
| `REVOKED`       | Revoked             | Hold, triangle              |

Only "Settled" and "Active" use the filled disc. "Approved" and "Ready to
settle" are green but half-filled, because the business step is complete and
the payment is not. This is deliberate: the most dangerous misreading in this
product is taking readiness for payment.

Any state the mapping does not recognise is shown as its raw value in a neutral
tag. The interface never guesses a tone.

## 7. Components

| Component         | Purpose and rules                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button            | Primary (ink fill), secondary (white, strong border), quiet (violet text), danger (red border and text). One primary per panel. Labels say what happens: "Record signing receipt", not "Submit". 44px high. |
| Field             | Visible label above every control. Optional hint below. Error text below in `--stop`, linked by `aria-describedby`, with a 2px red border on the control. Placeholders are never used as labels.            |
| Amount field      | Currency and amount side by side under one group label. Where a unit conversion matters (zatoshis), the converted value and the business amount are shown beside the input before submission.               |
| Notice            | Bordered panel with a glyph, a bold one-line statement and supporting text. Tones: neutral, hold, stop, clear, and hatched for test or planned scope.                                                       |
| Ledger table      | Sunken header row, 1px row dividers, amounts right-aligned in tabular figures, state tag in its own column, primary cell is the link. Stacks below 720px (section 5).                                       |
| Facts list        | A definition list for record details. One column in the side panel; auto-filling columns in the main panel.                                                                                                 |
| Identifier        | Mono text for a hash or ID. Truncated in the middle in running text, shown in full in a facts list, always paired with a "Copy" button where a user must carry it elsewhere.                                |
| Authority track   | Three lanes with steps. Each step has a glyph, a name and one line of status. The current step has a white fill and an ink top rule and is marked `aria-current="step"`.                                    |
| Ceremony list     | A numbered ordered list for the signing ceremony. Each step states where it happens ("In Obliq", "Outside Obliq, on the signer you operate"). Only the current step shows its form.                         |
| Next-action panel | The first panel on a record. Heading states the need ("Your approval is needed"), body states what the action does and does not do, then the form.                                                          |
| Verdict bar       | The top of an evidence document. States integrity and status in one sentence. On failure the document body below is replaced by the reason; it is not rendered as if valid.                                 |
| Page header       | Breadcrumb link, title, one line of key facts, state tag, then actions. Wraps.                                                                                                                              |
| Workspace rail    | Wordmark, organization and role, navigation with `aria-current`, planned sections marked with a dashed "Planned" label, deployment mode at the foot.                                                        |
| Filter row        | Link-styled filters above a list. The active filter is ink-filled and carries `aria-current`.                                                                                                               |
| Skeleton          | Grey blocks in the shape of the page they replace. Pulses only when motion is allowed.                                                                                                                      |
| Empty state       | A bold statement of what is absent, one sentence of explanation, and the action that fills it. Left-aligned, no illustration.                                                                               |
| Specimen banner   | A hatched bar across the top of any page that contains example data. Required on every mock-up and every seeded surface.                                                                                    |

Interactive states for every control:

| State    | Treatment                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------- |
| Default  | As specified above                                                                              |
| Hover    | Background shifts one step (ink to `#22375A`, white to `--sunken`); no movement                 |
| Focus    | 3px `--violet` outline, 2px offset; `--violet-on-ink` on the rail and footer                    |
| Pressed  | Same as hover                                                                                   |
| Disabled | `--neutral-bg` fill, `--ink-2` text, `not-allowed` cursor, and a sentence nearby saying why     |
| Pending  | Label changes to the present participle ("Recording…"), control is disabled, `aria-busy` is set |
| Invalid  | 2px `--stop` border, error text below                                                           |

## 8. States every workflow must address

Examples of each are rendered in
[`proposals/states.html`](./proposals/states.html).

| State        | Rule                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading      | A skeleton shaped like the destination page, with a screen-reader status message. No number, count or state is shown until it has been read from the database.                                               |
| Empty        | Three distinct cases: first use (explain the object, offer the action), no match (name the query, offer to clear it), and prerequisite missing (name the prerequisite, link to it).                          |
| Validation   | A summary notice at the top of the form with a link to each invalid field, plus an error under each field. The user's input is preserved. Errors say what to enter, not only what was wrong.                 |
| Unavailable  | A hold notice that says what cannot be done and, separately, what that does not imply. "The observer is unavailable. This says nothing about whether a payment was made."                                    |
| Planned      | A hatched notice with the Planned stamp. It states that nothing on the surface can move funds or record that funds moved.                                                                                    |
| Unknown      | The unknown tag on a hatched ground, with the two possibilities stated and the safe next step. Never coloured as failure or success.                                                                         |
| Permission   | The action stays visible and disabled, with a sentence naming the role that can act and, where relevant, the separation-of-duties rule that applies. Hiding the action leaves the user guessing.             |
| Error        | A stop notice that says what was not done, confirms the record is unchanged, and offers the retry. A failed save and a failed page load use different words.                                                 |
| Success      | A clear notice at the top of the page the action lands on, announced as a status. It states what was recorded and what has still not happened: "The obligation is approved. It has not been signed or paid." |
| Confirmation | Approve, reject, issue, revoke, add destination and record an outcome each show a confirmation step that restates the amount or subject and the consequence before the action is submitted.                  |

## 9. Voice and vocabulary

- Sentence case everywhere. Plain verbs. No exclamation marks.
- An action keeps one name from button to confirmation: "Approve" leads to
  "Approval recorded".
- State what is not true when it is the likely misreading. Keep the existing
  disclaimers; the proposals reuse their meaning.
- Capability terms (Implemented, Seeded, Planned, Blocked, Unavailable) and
  "Regtest" are fixed. They are never reworded, abbreviated or softened.
- People are shown by display name, with role where it matters. A truncated
  UUID is not a name.
- Dates are written as "21 Oct 2026" and times as "09:14" with the zone stated
  once per page, inside a `time` element.
- One phase statement, in one place. Surfaces do not carry their own phase
  labels (audit T1).

## 10. Accessibility baseline

The target is WCAG 2.2 AA.

- Text contrast at least 4.5:1; control boundaries and focus indicators at
  least 3:1 (section 2).
- State is never colour alone: every tag has a glyph and a label, every notice
  a glyph and a heading.
- One `h1` per page. The evidence document title is an `h2` inside the page.
- A skip link is the first focusable element in every layout.
- `aria-current="page"` on navigation and `aria-current="step"` on tracks.
- Tables have a caption and `scope` on header cells.
- Outcomes are announced: `role="status"` for success and neutral changes,
  `role="alert"` for errors.
- Targets are at least 44px high.
- Motion is limited to the skeleton pulse and runs only under
  `prefers-reduced-motion: no-preference`. There is no smooth scrolling and no
  hover movement.
- The evidence document has a print stylesheet that removes site chrome.

## 11. How the audit findings are addressed

| Findings       | Remedy                                                                    | Touches a server action?                                |
| -------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| T1, T2, T5, T6 | One status statement; landing copy matches `implementation-status.md`     | No                                                      |
| T3             | Remove the invented dashboard preview; the hero shows the authority lanes | No                                                      |
| T4, H3         | Capability stamp, scope tag and state tag (section 6)                     | No                                                      |
| U1, U16        | Sign-in page, branded not-found and root error pages                      | Sign-in page: yes (proposed change P3)                  |
| U3, A11        | Success notices driven by the redirect flags that already exist           | No                                                      |
| U2             | Field-level validation with input preserved                               | Yes: actions must return errors (proposed change P1)    |
| U4             | Pending state on submit buttons                                           | No (client component around the button)                 |
| U5             | Confirmation step before consequential actions                            | No (the same form is submitted after confirmation)      |
| U6, U15        | Explain disabled actions; show person, role and organization              | No                                                      |
| U7, U9, U11    | Show ZEC beside zatoshis; show time remaining; copy buttons; full link    | No                                                      |
| U8             | Land on the new signing review after preparing an intent                  | Yes: the redirect target (proposed change P2)           |
| U10            | Disable fields the role may not disclose, with the reason                 | No (uses the role already in session; server unchanged) |
| U12, H6, A5    | Recipient layout and verdict bar for `/verify`                            | No                                                      |
| U13            | State labels, names and dates (sections 6 and 9)                          | No                                                      |
| U14            | State filter links using the existing `state` parameter                   | No; sorting and paging are proposed change P4           |
| U17            | Docs index, previous and next links, outline at all widths                | No                                                      |
| H1             | Group the capability register by status, blocked first                    | No                                                      |
| H2, H4         | Next-action panel, authority track, ceremony list                         | No                                                      |
| H5             | Danger button variant; distinct preview tag                               | No                                                      |
| H7             | Break "Current limits" into a list of headed limits                       | No (same content)                                       |
| H8, H9, H10    | No labels above headings; right-aligned amounts; loaded typeface          | No                                                      |
| R1 to R7       | Layout rules in section 5                                                 | No                                                      |
| A1 to A12      | Tokens in section 2 and the baseline in section 10                        | No                                                      |

## 12. Decisions for the owner

| #   | Decision                                                                                                               | Recommendation                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| D1  | Show record states as sentence-case labels ("Ready to settle") instead of the stored value (`READY_TO_SETTLE`).        | Yes. Show the stored value in the history and in exports, where exactness matters.    |
| D2  | Express "verified on regtest" as a status plus a Regtest scope tag, with no change to the `ImplementationStatus` type. | Yes. It keeps the distinction `CONTRIBUTING.md` asks for and needs no domain change.  |
| D3  | Adopt IBM Plex, self-hosted through `next/font`.                                                                       | Yes. It adds a build-time font download; the alternative is to commit the font files. |
| D4  | Ship one light theme first.                                                                                            | Yes.                                                                                  |

Changes that would alter how a server action or route handler behaves are not
design decisions. They are described separately, and not implemented, in
[`proposed-behavior-changes.md`](./proposed-behavior-changes.md).

## 13. Implementation notes

For the engineers who implement issues #2, #3 and #4 after approval.

- The token block in [`proposals/obliq.css`](./proposals/obliq.css) maps
  directly onto a Tailwind v4 `@theme` block in `apps/web/src/app/globals.css`.
  Replace the existing colour and font tokens rather than adding beside them.
- Build the three status components first (`CapabilityStamp`, `ScopeTag`,
  `StateTag`) and delete `StatusPill` once nothing imports it. The state
  mapping in section 6.3 belongs in one presentation module in `apps/web`, not
  in `@obliq/domain`.
- Success notices can be added page by page by reading the search parameters
  the actions already set. That change is purely presentational.
- The authority track is derived from values the obligation page already loads
  (obligation state, settlement state, observations). It needs no new query.
- Nothing in this system requires a change to database schemas, sessions,
  capabilities, policy evaluation, approvals, quotes, intents, signing,
  broadcast, the observer, reconciliation, or evidence hashing and disclosure.
  The few changes that would alter behaviour are listed in
  `proposed-behavior-changes.md` and are not part of this system.

## 14. Limits of this proposal

- The screens are static HTML. They have not been tested with real records,
  with a screen reader, or on physical devices.
- The audit was done by reading source at one commit, not by observing users.
  Severity ratings are a designer's judgement.
- Seven surfaces are drawn: landing, dashboard, obligations list, obligation
  detail, signing review, evidence verification, and the state sheet. Vendors,
  approvals inbox, policies, evidence creation, documentation, security and
  proof follow the same components but have not been drawn.
- All example values in the proposals are labelled placeholders. They are not
  product data, customers, approvals or transactions.
