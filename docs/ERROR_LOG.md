# ERROR_LOG.md

# ModelOps — Error Log

Append-only log for tracking issues, bugs, root causes, solutions, and lessons learned.

---

## [2026-07-22] - Next.js CLI Global Binary Missing in Test Script
- **Timestamp:** 2026-07-22 T22:17:35
- **Problem:** `npm run lint` failed with exit code 1 because `next` command binary was missing from global PATH.
- **Root Cause:** Next.js devDependency was installed locally in `node_modules`, but `npm run lint` invoked `next lint` directly without local `npx`.
- **Solution:** Executed ESLint via local `npx` runner `npx --no-install eslint src/lib src/app/api`.
- **Reason for Fix:** Allows linting of backend files without requiring global CLI installation.
- **Affected Files:** `package.json`
- **Lessons Learned:** Always verify local package binary invocation method when running CLI utilities in CI/CD environments.
---
  
## [2026-07-22] - Next lint flat config conflict with ESLint 8  
- **Timestamp:** 2026-07-22 T23:33:00  

---

## [2026-07-29] - Vercel Next.js Vulnerability Block
- **Timestamp:** 2026-07-29 T13:00:00
- **Problem:** Vercel blocked the production deployment with the error: "Vulnerable version of Next.js detected, please update immediately."
- **Root Cause:** Next.js version deployed was outdated and contained known vulnerabilities, causing Vercel's automated security scanner to fail the build.
- **Solution:** Updated `next` to `^16.2.12` using `npm install next@latest` and updated `package-lock.json`.
- **Affected Files:** `package.json`, `package-lock.json`
- **Lessons Learned:** Always monitor automated deployment security checks and keep core frameworks up to date before a release block occurs.

---

## [2026-07-29] - Next.js 16 CLI Lint Bug in CI/CD
- **Timestamp:** 2026-07-29 T13:30:00
- **Problem:** GitHub Actions CI workflow failed on the linting step with the error: `Invalid project directory provided, no such directory: C:\...\lint`.
- **Root Cause:** Upgrading to Next.js 16 triggered a known CLI bug where running `npm run lint` (`next lint`) incorrectly parsed the word "lint" as a target directory name rather than the command itself.
- **Solution:** Bypassed the broken Next.js CLI wrapper in `package.json` by updating the lint script to run the native engine directly: `"lint": "eslint src"`.
- **Affected Files:** `package.json`
- **Lessons Learned:** When bleeding-edge framework updates introduce CLI bugs, bypassing the wrapper to use the underlying tool directly (ESLint) is a safe and effective hotfix.
