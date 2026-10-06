# Contributing to Obliq

Obliq is financial operations software with strict tenant, authorization,
privacy and evidence boundaries. A visual change must not weaken those
boundaries, and an unsupported capability must never be presented as live.

## Branch and issue workflow

- `main` is the stable integration branch. Collaborators must not commit to it
  directly.
- Start from an up-to-date `main` and use one focused issue per feature branch
  and pull request where practical.
- Use a descriptive branch such as `design/issue-2-landing` or
  `fix/issue-4-evidence-mobile`.
- Reference the issue in the PR body using `Closes #<number>` when the PR fully
  resolves it. Explain partial delivery without closing the issue.
- Resolve merge conflicts and rerun the complete validation suite before merge.
- Approved PRs should normally be squash merged.

## Pull-request requirements

Every PR requires review before merge and must pass:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run security:secrets
```

Changes affecting persistence must also run migrations and database integration
tests against PostgreSQL. Changes to the observer must run Rust formatting,
locked compilation and tests. Do not bypass failing checks to improve a demo.

PR descriptions must include:

- the linked issue and scope;
- implementation and test notes;
- risks, limitations and intentionally deferred work;
- accessibility considerations;
- desktop and mobile screenshots for visual changes;
- confirmation that no secrets, private financial data or key material were
  added.

## Frontend safety boundary

Frontend and UX work may change presentation, responsive layout, typography,
interaction clarity and accessible states. It must preserve existing server
actions, route contracts and domain semantics. Do not silently modify:

- database schemas, migrations or tenant predicates;
- authentication, sessions, capabilities or role checks;
- policy decisions, approvals or readiness transitions;
- quotes, settlement intents, signing or broadcast behavior;
- observer, reconciliation or network-state handling;
- evidence disclosure permissions, canonical hashing or integrity checks.

If a design requires one of those changes, stop and open or update an issue for
owner review. Do not work around a server-side restriction in the client.

Never add fabricated financial states, approvals, transactions, confirmations,
proof, customers or success messages. Preserve the distinctions between
`SEEDED`, `REGTEST VERIFIED`, `PUBLIC NETWORK BLOCKED`, `PLANNED` and
`UNAVAILABLE`.

## Visual and accessibility quality

- Check keyboard navigation, focus visibility, semantic headings, labels,
  validation messages, status semantics and contrast.
- Financial state must not be communicated by color alone.
- Check narrow mobile and desktop layouts without horizontal overflow.
- Include loading, empty, permission-denied, unavailable, error and recovery
  states where the affected workflow needs them.
- Avoid copying the existing visual direction by default; approved design work
  may establish an original system while preserving product behavior.

## Sensitive material

Never commit `.env` files, database exports, invoice documents, wallet or node
state, observer caches, UFVK/UIVK material, seeds, spending keys, PCZTs, raw
transactions, signer credentials, session secrets or generated cloud
credentials. Use `.env.example` only for non-secret variable names and obvious
placeholders. Run the secret scan before opening a PR.

Security concerns should be reported privately to the repository owner rather
than placed in a public issue with exploit details or sensitive data.

## Merge enforcement

The intended `main` protection requires one approving review, passing `validate`
CI, resolved review conversations, and blocks force pushes/deletion. Repository
settings are the enforcement authority; this document alone is not a technical
control. If GitHub reports those settings unavailable or inactive, the owner
must treat merges as manually gated and record the limitation accurately.
