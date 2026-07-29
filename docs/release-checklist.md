# ModelOps — Release Checklist

> **Owner:** Ahmed Amir Rusrus — Integration Lead / Solution Architect
> **When to use:** Before every production deployment and before the Session 5 final release.

---

## Pre-Release Gate (Must All Pass Before Deploying)

### Code Quality

- [ ] `npm run lint` — zero unresolved errors
- [ ] `npx tsc --noEmit` — zero TypeScript errors
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — production build completes without errors
- [ ] No `console.log` left with sensitive data
- [ ] No `any` types added since last review (check with `grep -r ": any" src/`)

### Security

- [ ] `GROQ_API_KEY` and `GEMINI_API_KEY` are **not** in any client-side file (`src/app/`, components)
- [ ] `.env.local` is in `.gitignore` and has never been committed (`git log -- .env.local` returns nothing)
- [ ] `.env.example` has all variable names with placeholder values only
- [ ] `git log --all --full-history -- "*.env"` — no secrets in git history
- [ ] `npm audit` — no critical or high severity vulnerabilities unaddressed
- [ ] API route validates all input before calling any provider (confirmed in `src/app/api/modelops/route.ts`)
- [ ] Tool arguments (`compare_runs`, `readiness_score`) are validated before execution

### Functional Verification

- [ ] `POST /api/modelops` — valid payload returns `200` with `ModelCardOutput`
- [ ] `POST /api/modelops` — missing `model_name` returns `400` with field error
- [ ] `POST /api/modelops` — missing/invalid JSON body returns `400`
- [ ] `POST /api/modelops/compare` — valid two-run payload returns `200` with metric diffs
- [ ] `readiness_score` in response is a number computed by the deterministic function — never an AI value
- [ ] `decision` field in response is always `"pending_human_review"` — never auto-approved
- [ ] Rate limiting responds with `429` when the threshold is exceeded
- [ ] Provider fallback: if `GROQ_API_KEY` is invalid, Gemini takes over without a 500
- [ ] Offline fallback: if both providers fail, a deterministic card is returned without an unhandled exception

### UI / UX

- [ ] Main workflow completes on desktop (form submit → result render)
- [ ] Main workflow completes on mobile (375px viewport)
- [ ] Loading state is visible during API call
- [ ] Error state is visible when the API returns 4xx or 5xx
- [ ] Evidence panel shows gaps explicitly when a field is missing
- [ ] RunComparison renders metric diffs correctly with direction indicators

---

## Environment Configuration

- [ ] All environment variables are set in the Vercel dashboard (not in the repo)
- [ ] `GROQ_API_KEY` is set and validated in Vercel → Project → Settings → Environment Variables
- [ ] `GEMINI_API_KEY` is set and validated in Vercel → Project → Settings → Environment Variables
- [ ] `NEXT_PUBLIC_APP_URL` is set to the production domain
- [ ] Environment is set to **Production** (not Preview) for the release deployment

---

## Production Smoke Tests (Run After Deploy)

Execute these against the live production URL:

| Test | Expected result |
|------|----------------|
| `GET {PROD_URL}` | 200 — app loads, no console errors |
| `POST {PROD_URL}/api/modelops` with valid payload | 200 + `ModelCardOutput` |
| `POST {PROD_URL}/api/modelops` with empty body | 400 + validation error |
| `POST {PROD_URL}/api/modelops/compare` with two runs | 200 + `metrics_diff` |
| Open main page on mobile (375px) | Layout renders correctly |
| Check browser DevTools → Network | No API key visible in any request/response |
| Check browser DevTools → Console | No unhandled errors |

---

## Documentation & Evidence

- [ ] `README.md` is accurate and setup instructions work from a clean environment
- [ ] `docs/architecture.md` reflects current module ownership and file structure
- [ ] `docs/api-contracts.md` matches the live API behavior
- [ ] `docs/known-gaps-and-limitations.md` is up to date
- [ ] `docs/source-register.md` lists all sources used (Zein confirmed)
- [ ] All `AI_USAGE.md` entries collected from every team member
- [ ] Contribution matrix is complete (who wrote what)
- [ ] 10-case evaluation report is complete (Zein confirmed)
- [ ] Repository has a tagged release (e.g., `git tag v1.0.0`)

---

## Release Procedure

```bash
# 1. Ensure dev branch is merged and up to date
git checkout dev
git pull origin dev

# 2. Create the release branch
git checkout -b release/v1.0.0

# 3. Run the full pre-release gate above — all boxes must be checked

# 4. Merge release branch into main
git checkout main
git merge --no-ff release/v1.0.0

# 5. Tag the release
git tag -a v1.0.0 -m "Production release v1.0.0 — Session 5"
git push origin main --tags

# 6. Vercel auto-deploys from main — confirm deployment succeeded in Vercel dashboard

# 7. Run production smoke tests against the live URL

# 8. Record the production URL below
```

**Production URL:** _(fill in after deployment)_

---

## Rollback Procedure

If the production deployment fails or the smoke tests reveal a critical issue:

```bash
# Option 1 — Instant rollback via Vercel dashboard
# Vercel → Project → Deployments → find the last working deployment → "Promote to Production"

# Option 2 — Git revert if a bad commit was pushed to main
git revert <bad-commit-hash>
git push origin main
# Vercel will redeploy automatically from the revert commit

# Option 3 — Force-push the previous known-good tag (last resort)
git checkout main
git reset --hard v0.9.0    # replace with last known-good tag
git push --force-with-lease origin main
```

**Recovery notes:**
- Environment variables in Vercel are not affected by a code rollback — they persist across deployments.
- If a provider API key was rotated and broke production, update the key in Vercel dashboard → no redeploy needed (it takes effect on next request).
- After any rollback, open an issue describing what failed, what was rolled back, and what must change before re-deploying.

---

## Known Limitations at Release

Carry forward the current state of `docs/known-gaps-and-limitations.md`. Confirm these are documented before sign-off:

- [ ] Metric direction detection is name-based (may misfire on unusual metric names)
- [ ] Missing metrics default to 0 in `compare_runs()` — can produce misleading "improved" labels
- [ ] Test quality not evaluated — presence only
- [ ] Source register covers MLflow documentation only
- [ ] English-only — no multilingual support

---

*Sign off: Ahmed Amir Rusrus confirms all boxes above are checked before the production URL is shared publicly.*
