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
