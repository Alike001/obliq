## Linked issue

Closes #

## Scope

Describe the focused change and what is intentionally out of scope.

## Implementation

-

## Validation

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run security:secrets`
- [ ] PostgreSQL migrations/integration tests run if persistence changed
- [ ] Rust checks/tests run if observer code changed

## Security and financial invariants

- [ ] No secret, private financial data, viewing authority or spending material added
- [ ] Tenant, authentication and authorization behavior is unchanged or explicitly reviewed
- [ ] No fabricated approval, transaction, confirmation, reconciliation or proof state
- [ ] Regtest/public-network and implemented/planned labels remain truthful
- [ ] Frontend work did not silently change database, policy, settlement, observer, signer or evidence-security logic

## UX and accessibility

Describe keyboard, focus, labels, validation, contrast, responsive behavior and
failure states considered.

## Visual evidence

Attach desktop and mobile screenshots for visual changes. Write `Not applicable`
and explain why for non-visual changes.

## Risks and limitations

List residual risks, deployment requirements and deferred work.

## Reviewer notes

Call out the files, states or trust boundaries that deserve close review.
