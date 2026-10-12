# Hackathon submission checklist

Deadline supplied by the owner: **October 12, 2026**. The owner must verify the actual portal deadline and timezone inside the authenticated competition dashboard; no public source inspected for this package exposed the event-specific form.

## Repository and release candidate

- [x] Public repository exists: https://github.com/Alike001/obliq
- [x] Product history through Phase 7B is on `main`.
- [x] Root README explains customer, product, Zcash role, architecture, evidence, and limitations.
- [x] Architecture, threat model, ADRs, runbooks, and evidence records are linked.
- [x] License obligations for studied references are documented; no external contract code was copied.
- [ ] Merge PR #27 after owner review so the final visual polish and approved screenshots reach `main`.
- [ ] Merge the Issue #7 documentation PR after owner review.
- [ ] Tag or record one final submission commit SHA; do not submit a moving branch name alone.
- [ ] Confirm repository visibility and judge access without changing collaborator permissions unnecessarily.
- [ ] Confirm no secrets, private `.data/`, wallet files, observer caches, viewing material, mail payloads, or local screenshots are tracked.

## Validation

- [ ] Run `npm ci` from a clean checkout at the final SHA.
- [ ] Run formatting, ESLint, strict TypeScript, unit tests, migrated PostgreSQL integration tests, and production build.
- [ ] Run preview configuration/build and route-denial smoke tests.
- [ ] Run Rust formatting, locked check, tests, and `cargo audit`.
- [ ] Run repository secret scan, GitGuardian, and production `npm audit`.
- [ ] Confirm GitHub Actions is green on the final SHA.
- [ ] Save the final command results and test counts in the submission notes.
- [ ] Confirm no check blocked by missing infrastructure is reported as passed.

## Product and deployment links

- [x] Repository: https://github.com/Alike001/obliq
- [x] Read-only preview: https://obliq-7xh9.onrender.com
- [ ] Verify the preview deploys the final accepted frontend revision.
- [ ] Verify `/`, `/docs`, `/security`, `/proof`, `/health/live`, and `/health/ready` from a clean browser.
- [ ] Verify preview still returns 404/no-store for `/app`, `/auth`, `/verify`, `/payables/invitation`, and mutation methods.
- [ ] State beside the URL that the preview intentionally excludes authenticated product operations.
- [ ] Confirm preview reports `deploymentMode=preview`, `network=disabled`, and `PUBLIC_NETWORK_BLOCKED`.
- [ ] Do not submit a local-only URL as a live product link.

## Submission form

- [ ] Register every required team member in the organizer portal.
- [ ] Use “Obliq” and the tagline “Pay your business bills without publishing your business.”
- [ ] Paste an approved short description from [PROJECT_DESCRIPTION.md](./PROJECT_DESCRIPTION.md).
- [ ] Select the exact Zcash/privacy/payments track offered by the authenticated form.
- [ ] Add team background without inventing credentials or customer relationships.
- [ ] Add the repository, preview URL, pitch/demo video, and any required technical walkthrough.
- [ ] Disclose third-party/open-source dependencies and licenses if requested.
- [ ] Confirm every mandatory field, consent, eligibility rule, and submission-time timezone in the live form.
- [ ] Save a private screenshot or export of the completed form before final submission.

## Demo recording

- [ ] Keep the final combined video under three minutes unless the actual portal states otherwise.
- [ ] Follow [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) and rehearse to 2:50–3:00.
- [ ] Record at 1080p with readable text and no desktop notifications.
- [ ] Show the problem and customer within the first 20 seconds.
- [ ] Demonstrate a persisted obligation, controls/approvals, Private Payables Link, and independent review.
- [ ] Show `/proof` as historical isolated-regtest evidence, not live demo activity.
- [ ] Say explicitly that the mail sink is development-only and public settlement is unverified.
- [ ] Do not display invitation fragments, verification codes, receiver strings, UFVKs, RPC credentials, environment files, local paths, or real identities.
- [ ] Add captions or a transcript and check audio intelligibility.
- [ ] Upload to an organizer-supported host and test access in a signed-out browser.
- [ ] Keep a second private/local copy and checksum as backup.

## Screenshots and media

- [ ] After PR #27 merges, select approved desktop/mobile images from `docs/design/implementation/final-polish/`.
- [ ] Prefer landing, obligation, Private Payables panel, recipient entry, independent destination review, and proof timeline.
- [ ] Do not use a settlement/evidence screenshot backed by an invented database record.
- [ ] Label fixture screens `SEEDED` or “demo record” where necessary.
- [ ] Confirm screenshots contain no token, code, full destination, viewing material, private memo, email, or unnecessary organization identifiers.
- [ ] Prepare required icon, cover, aspect ratios, and file sizes from the actual submission form.
- [ ] Keep original files and an optimized upload set.

## Evidence and claims

- [x] Isolated Z3 regtest end-to-end transaction is recorded and linked.
- [x] UFVK-only public-testnet synchronization is recorded and linked.
- [x] Private Payables isolated local browser acceptance is recorded and linked.
- [ ] Confirm all surfaces say funded public-testnet settlement is not verified.
- [ ] Confirm no production AI, email, live pricing, native PDF, customer, revenue, or mainnet claim appears.
- [ ] Confirm `IMPLEMENTED`, `SEEDED`, `PLANNED`, `BLOCKED`, `UNAVAILABLE`, `REGTEST VERIFIED`, and `READY FOR FUNDED TEST` are used consistently.
- [ ] Confirm evidence is described as application-generated, integrity-protected financial evidence—not automatically a ZK proof or independent audit attestation.

## Backup demonstration evidence

- [ ] Keep the approved screenshots available offline.
- [ ] Keep the redacted regtest transaction/intent facts from `apps/web/src/content/phase4-proof.ts` available offline.
- [ ] Keep GitHub CI URLs and the final SHA in presenter notes.
- [ ] Keep the sanitized acceptance report and screenshots private unless reviewed for fixture identifiers before sharing.
- [ ] Prepare a 30-second verbal contingency explanation for preview cold start or local database failure.

## Owner-only final gate

- [ ] Review the complete submission in a signed-out browser.
- [ ] Confirm PR #27 and the documentation PR were merged in the intended order without conflicts.
- [ ] Confirm the deployment revision equals the final accepted `main` SHA.
- [ ] Confirm the video and repository are accessible to judges.
- [ ] Submit before the verified portal deadline.
- [ ] Record submission confirmation privately.

No checklist item authorizes infrastructure purchases, wallet creation, faucet use, signing, broadcast, deployment, or public-network status changes.
