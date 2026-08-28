## Summary

<!-- One sentence: what does this PR change and why? -->

## Related Issue

Closes #<!-- issue number -->

---

## Type of Change

<!-- Mark all that apply -->

- [ ] New feature
- [ ] Bug fix
- [ ] Refactoring (no behavior change)
- [ ] Documentation update
- [ ] Test addition or fix
- [ ] Configuration / environment change

---

## Module Ownership

<!-- Which module does this PR touch? -->

- [ ] Architecture / Integration (Ahmed)
- [ ] API route / AI providers / schema / service (Haneen Abdelghany)
- [ ] UI / components / pages (Mohamed)
- [ ] Deterministic tools / corpus / evaluation (Zein)

---

## Pre-Merge Checklist

### Code Quality

- [ ] `npm run lint` passes locally with no new errors
- [ ] `npx tsc --noEmit` passes with no new TypeScript errors
- [ ] `npm test` passes — existing tests not broken
- [ ] New logic has at least one test (normal case + one failure/edge case)

### Schema & Contract

- [ ] Any change to `ModelCardOutput` or `ExperimentMetadata` is reflected in `docs/api-contracts.md`
- [ ] `readiness_score` is **not** set by AI output — only by `readiness_score()` in `tools.ts`
- [ ] `decision` field is **not** auto-approved — always `"pending_human_review"` until human confirms

### Security

- [ ] No API key, secret, or token is present in any client-side file (`src/app/`, components)
- [ ] No `.env.local` or `.env` file is included in this PR
- [ ] All new inputs are validated by Zod before reaching the AI provider or any tool
- [ ] Tool arguments are validated before execution (no unchecked user input passed to tools)
- [ ] Server error responses do not expose stack traces or internal messages to the client

### Integration

- [ ] This branch is compatible with current `dev` — no unresolved merge conflicts
- [ ] Any new environment variable is added to `.env.example` with a placeholder value
- [ ] If an API contract changed, the lead (Ahmed) was consulted before implementation

---

## Evidence

<!-- Add screenshots, curl/Postman outputs, test results, or links that show the change works. -->

---

## Notes for Reviewer

<!-- Anything the reviewer needs to know: edge cases, assumptions, follow-up tasks. -->
