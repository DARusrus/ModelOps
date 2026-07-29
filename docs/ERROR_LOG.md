# ERROR_LOG.md

# ModelOps — Error Log

Append-only log for tracking issues, bugs, root causes, solutions, and lessons learned.

---

## [2026-07-29] - Documentation drift during release preparation
- **Timestamp:** 2026-07-29
- **Problem:** The public documentation described an earlier, partially outdated architecture and API contract.
- **Root Cause:** The implementation had evolved beyond the initial docs, but release documentation had not been refreshed.
- **Solution:** Aligned the README, architecture notes, API contract, AI usage notes, and release checklist with the current implementation and verified runtime behavior.
- **Reason for Fix:** Keeps the repository documentation consistent with the shipping product.
- **Affected Files:** `README.md`, `docs/architecture.md`, `docs/api-contracts.md`, `docs/ai-usage.md`, `docs/release-checklist.md`
- **Lessons Learned:** Release documentation should be updated alongside implementation changes rather than deferred until the end of the cycle.

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
