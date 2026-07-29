#!/usr/bin/env bash
# =============================================================================
# ModelOps — Production Smoke Test Script
# Owner: Ahmed Amir Rusrus (Integration Lead)
# Required for: Final submission checklist S-11
#
# Usage:
#   ./scripts/smoke-test.sh https://your-app.vercel.app
#
# The script runs all checks defined in docs/release-checklist.md §"Production
# Smoke Tests" and docs/api-contracts.md. It exits with code 1 on the first
# failure so CI can catch it.
# =============================================================================

set -euo pipefail

# ── Resolve production URL ────────────────────────────────────────────────────
PROD_URL="${1:-}"
if [ -z "$PROD_URL" ]; then
  echo ""
  echo "Usage: ./scripts/smoke-test.sh <PROD_URL>"
  echo "  Example: ./scripts/smoke-test.sh https://modelops.vercel.app"
  echo ""
  exit 1
fi

# Strip trailing slash
PROD_URL="${PROD_URL%/}"

PASS=0
FAIL=0

# ── Helpers ───────────────────────────────────────────────────────────────────
green()  { echo -e "\033[0;32m✅ PASS\033[0m  $1"; }
red()    { echo -e "\033[0;31m❌ FAIL\033[0m  $1"; }
header() { echo ""; echo "── $1 ──────────────────────────────────────────────"; }

check() {
  local label="$1"
  local result="$2"  # "pass" or "fail"
  if [ "$result" = "pass" ]; then
    green "$label"
    PASS=$((PASS + 1))
  else
    red "$label"
    FAIL=$((FAIL + 1))
  fi
}

# ── Test 1: App loads (GET /) ─────────────────────────────────────────────────
header "1. App loads"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
if [ "$HTTP_STATUS" = "200" ]; then
  check "GET $PROD_URL → 200" "pass"
else
  check "GET $PROD_URL → expected 200, got $HTTP_STATUS" "fail"
fi

# ── Test 2: POST /api/modelops with valid payload → 200 + ModelCardOutput ────
header "2. POST /api/modelops — valid payload"
VALID_PAYLOAD='{
  "model_name": "smoke-test-model",
  "version": "1.0.0",
  "dataset": "smoke-test-dataset",
  "intended_use": "Automated smoke test to verify the production deployment.",
  "metrics": { "accuracy": 0.92 },
  "tests": ["unit test"],
  "reproducibility": "seed=42"
}'

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$PROD_URL/api/modelops" \
  -H "Content-Type: application/json" \
  -d "$VALID_PAYLOAD")

BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1)

if [ "$STATUS" = "200" ]; then
  check "POST /api/modelops valid payload → 200" "pass"
else
  check "POST /api/modelops valid payload → expected 200, got $STATUS" "fail"
fi

# Verify success field
if echo "$BODY" | grep -q '"success":true'; then
  check "Response contains success:true" "pass"
else
  check "Response missing success:true — body: $BODY" "fail"
fi

# Verify decision is always pending_human_review (governance rule)
if echo "$BODY" | grep -q '"decision":"pending_human_review"'; then
  check "Governance rule: decision = pending_human_review" "pass"
else
  check "Governance rule VIOLATED: decision is not pending_human_review" "fail"
fi

# Verify readiness_score is present
if echo "$BODY" | grep -q '"readiness_score"'; then
  check "readiness_score field present in response" "pass"
else
  check "readiness_score field MISSING from response" "fail"
fi

# ── Test 3: POST /api/modelops with empty body → 400 ─────────────────────────
header "3. POST /api/modelops — empty body → 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$PROD_URL/api/modelops" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$STATUS" = "400" ]; then
  check "POST /api/modelops empty body → 400" "pass"
else
  check "POST /api/modelops empty body → expected 400, got $STATUS" "fail"
fi

# ── Test 4: POST /api/modelops with invalid JSON → 400 ───────────────────────
header "4. POST /api/modelops — invalid JSON → 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$PROD_URL/api/modelops" \
  -H "Content-Type: application/json" \
  -d 'not-valid-json')

if [ "$STATUS" = "400" ]; then
  check "POST /api/modelops invalid JSON → 400" "pass"
else
  check "POST /api/modelops invalid JSON → expected 400, got $STATUS" "fail"
fi

# ── Test 5: POST /api/modelops/compare with two valid runs → 200 ─────────────
header "5. POST /api/modelops/compare — valid payload"
COMPARE_PAYLOAD='{
  "run1": { "model_name": "Model-A", "metrics": { "accuracy": 0.90, "loss": 0.21 } },
  "run2": { "model_name": "Model-B", "metrics": { "accuracy": 0.95, "loss": 0.17 } }
}'

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$PROD_URL/api/modelops/compare" \
  -H "Content-Type: application/json" \
  -d "$COMPARE_PAYLOAD")

BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1)

if [ "$STATUS" = "200" ]; then
  check "POST /api/modelops/compare valid payload → 200" "pass"
else
  check "POST /api/modelops/compare valid payload → expected 200, got $STATUS" "fail"
fi

if echo "$BODY" | grep -q '"metrics_diff"'; then
  check "Compare response contains metrics_diff" "pass"
else
  check "Compare response missing metrics_diff — body: $BODY" "fail"
fi

# ── Test 6: POST /api/modelops/compare with missing run2 → 400 ───────────────
header "6. POST /api/modelops/compare — missing run2 → 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$PROD_URL/api/modelops/compare" \
  -H "Content-Type: application/json" \
  -d '{"run1": {"model_name": "Only-One"}}')

if [ "$STATUS" = "400" ]; then
  check "POST /api/modelops/compare missing run2 → 400" "pass"
else
  check "POST /api/modelops/compare missing run2 → expected 400, got $STATUS" "fail"
fi

# ── Test 7: No API key visible in response headers ───────────────────────────
header "7. Security — no secret in response headers"
HEADERS=$(curl -s -I "$PROD_URL/api/modelops" 2>&1)

if echo "$HEADERS" | grep -qi "GROQ_API_KEY\|GEMINI_API_KEY"; then
  check "SECURITY FAIL: API key visible in response headers" "fail"
else
  check "No API key visible in response headers" "pass"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo "  Smoke Test Results"
echo "  URL: $PROD_URL"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo "══════════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "❌ $FAIL check(s) failed. Do not ship this build."
  exit 1
else
  echo "✅ All checks passed. Production smoke test complete."
  exit 0
fi
