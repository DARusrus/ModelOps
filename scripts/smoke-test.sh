#!/usr/bin/env bash
# Cross-platform, unauthenticated production smoke test. This is intentionally
# read-only: authenticated mutation coverage belongs to the Playwright suite.
set -uo pipefail

BASE_URL="${1:-}"
if [[ ! "$BASE_URL" =~ ^https://[^/]+/?$ ]]; then
  echo "Usage: ./scripts/smoke-test.sh https://your-app.example"
  exit 2
fi
BASE_URL="${BASE_URL%/}"
passed=0
failed=0
tmp_dir="$(mktemp -d)"
trap 'rm -rf -- "$tmp_dir"' EXIT

check() {
  if [[ "$1" == "true" ]]; then
    printf 'PASS  %s\n' "$2"
    passed=$((passed + 1))
  else
    printf 'FAIL  %s\n' "$2" >&2
    failed=$((failed + 1))
  fi
}

request() {
  local method="$1" path="$2" headers="$3" body="$4"
  curl --silent --show-error --max-time 15 --request "$method" \
    --dump-header "$headers" --output "$body" --write-out '%{http_code}' \
    -H 'Content-Type: application/json' "$BASE_URL$path"
}

health_status="$(request GET /api/health "$tmp_dir/health.headers" "$tmp_dir/health.body")" || health_status="000"
check "$([[ "$health_status" == "200" ]] && echo true || echo false)" 'GET /api/health returns HTTP 200.'
check "$(grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' "$tmp_dir/health.body" && grep -Eq '"database"[[:space:]]*:[[:space:]]*"ok"' "$tmp_dir/health.body" && echo true || echo false)" 'Health response confirms database readiness.'
check "$(grep -Eiq '^x-content-type-options:[[:space:]]*nosniff' "$tmp_dir/health.headers" && echo true || echo false)" 'Security header X-Content-Type-Options is present.'
check "$(grep -Eiq '^x-request-id:[[:space:]]*[^[:space:]]+' "$tmp_dir/health.headers" && echo true || echo false)" 'Server generates a request correlation ID.'

login_status="$(request GET /login "$tmp_dir/login.headers" "$tmp_dir/login.body")" || login_status="000"
check "$([[ "$login_status" == "200" ]] && echo true || echo false)" 'GET /login returns HTTP 200.'
check "$(grep -Eiq "^content-security-policy:.*default-src 'self'" "$tmp_dir/login.headers" && echo true || echo false)" 'Login page has a Content Security Policy.'
check "$(grep -Eiq '^strict-transport-security:[[:space:]]*.*max-age=' "$tmp_dir/login.headers" && echo true || echo false)" 'HTTPS transport security is enabled.'

protected_status="$(request GET /modelops "$tmp_dir/protected.headers" "$tmp_dir/protected.body")" || protected_status="000"
check "$([[ "$protected_status" =~ ^30[12378]$ ]] && echo true || echo false)" 'Unauthenticated GET /modelops redirects.'
check "$(grep -Eiq '^location:[[:space:]]*(https://[^/]+)?/login([?[:space:]]|$)' "$tmp_dir/protected.headers" && echo true || echo false)" 'Protected-route redirect targets /login.'

# No domain data is sent. A 401 proves mutations cannot be reached before auth.
modelops_status="$(request POST /api/modelops "$tmp_dir/modelops.headers" "$tmp_dir/modelops.body")" || modelops_status="000"
check "$([[ "$modelops_status" == "401" ]] && echo true || echo false)" 'Unauthenticated POST /api/modelops is rejected with HTTP 401.'
compare_status="$(request POST /api/modelops/compare "$tmp_dir/compare.headers" "$tmp_dir/compare.body")" || compare_status="000"
check "$([[ "$compare_status" == "401" ]] && echo true || echo false)" 'Unauthenticated POST /api/modelops/compare is rejected with HTTP 401.'

printf '\nSmoke checks: %d passed, %d failed.\n' "$passed" "$failed"
if (( failed > 0 )); then
  echo 'Unauthenticated production smoke check failed. Do not promote this deployment.' >&2
  exit 1
fi
echo 'Unauthenticated production smoke check passed.'
