$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
. "$PSScriptRoot/lib/production-smoke.ps1"
$baseUrl = 'https://smoke-fixture.test'
$checks = [System.Collections.Generic.List[string]]::new()
function Assert-Contract($Target, $Response, [bool]$Expected, [string]$Name) {
  $failures = @(Get-SmokeFailures $Target $Response $baseUrl)
  if (($failures.Count -eq 0) -ne $Expected) { throw "$Name failed: $($failures -join ' ')" }
  $checks.Add($Name)
}
function Fixture([int]$Status, [string]$Body, [string]$ContentType = 'application/json') {
  return @{ Status = $Status; Body = $Body; Headers = @{
    'Content-Type' = $ContentType; 'X-Content-Type-Options' = 'nosniff'
    'X-Request-Id' = '11111111-1111-4111-8111-111111111111'
    'Strict-Transport-Security' = 'max-age=31536000; includeSubDomains'
    'Cache-Control' = 'no-store'; 'Content-Security-Policy' = "default-src 'self'; object-src 'none'"
  } }
}
$targets = @(Get-SmokeTargets)
if ($targets.Count -ne 28 -or @($targets.Path | Select-Object -Unique).Count -ne 28) { throw 'Smoke inventory must contain 28 unique routes.' }
foreach ($target in $targets) {
  $response = switch ($target.Kind) {
    'health' { Fixture 200 '{"status":"ok","checks":{"database":"ok"}}' }
    'api' { Fixture 401 '{"success":false,"code":"UNAUTHENTICATED","error":"Authentication is required"}' }
    'public' { Fixture 200 '<!doctype html><title>Fixture</title>' 'text/html; charset=utf-8' }
    'protected' {
      $r = Fixture 307 '' 'text/html'
      $r.Headers['Location'] = '/login?next=' + [Uri]::EscapeDataString($target.Path)
      $r
    }
  }
  Assert-Contract $target $response $true "Valid $($target.Kind) $($target.Path)"
  $response.Status = 404
  Assert-Contract $target $response $false "Missing $($target.Path) is rejected"
}
$protected = @{ Path = '/dashboard'; Kind = 'protected' }
foreach ($location in '/forbidden', '/not-login', '/other?next=/login', 'https://external.test/login?next=%2Fdashboard', '//external.test/login?next=%2Fdashboard', '/login', '/login?next=%2Freviews', '/login?next=%2Fdashboard&next=%2Fdashboard', '/login?next=%2Fdashboard#fragment') {
  $r = Fixture 307 '' 'text/html'; $r.Headers['Location'] = $location
  Assert-Contract $protected $r $false "Unsafe or incorrect redirect: $location"
}
$r = Fixture 302 '' 'text/html'; $r.Headers['Location'] = "$baseUrl/login?next=%2Fdashboard"
Assert-Contract $protected $r $true 'Same-origin absolute login redirect is accepted'
$api = @{ Path = '/api/dashboard'; Kind = 'api' }
foreach ($body in 'not-json', '{"success":true,"code":"UNAUTHENTICATED"}', '{"success":false,"code":"INTERNAL_ERROR"}', '{"success":"false","code":"UNAUTHENTICATED"}', '{}') {
  Assert-Contract $api (Fixture 401 $body) $false "Invalid auth contract: $body"
}
Assert-Contract $api (Fixture 200 '{"success":false,"code":"UNAUTHENTICATED"}') $false 'HTTP 200 is not an auth denial'
Assert-Contract $api (Fixture 401 '<html>SSO</html>' 'text/html') $false 'Platform HTML is not an API response'
$health = @{ Path = '/api/health'; Kind = 'health' }
foreach ($body in 'not-json', '{}', '[{"status":"ok","checks":{"database":"ok"}}]', '[{"status":"ok","checks":{"database":"ok"}},{"status":"ok","checks":{"database":"ok"}}]', '{"status":"ok","checks":{"database":"unavailable"}}') {
  Assert-Contract $health (Fixture 200 $body) $false "Invalid readiness contract: $body"
}
Assert-Contract $health (Fixture 503 '{"status":"ok","checks":{"database":"ok"}}') $false 'Unhealthy HTTP status fails readiness'
foreach ($name in 'X-Content-Type-Options', 'X-Request-Id', 'Strict-Transport-Security', 'Cache-Control', 'Content-Type') {
  $r = Fixture 401 '{"success":false,"code":"UNAUTHENTICATED"}'
  $r.Headers.Remove($name)
  Assert-Contract $api $r $false "Missing API header $name is rejected"
}
$r = Fixture 200 '<html></html>' 'text/html'; $r.Headers.Remove('Content-Security-Policy')
Assert-Contract @{ Path = '/login'; Kind = 'public' } $r $false 'Missing public-page CSP is rejected'

# Exercise the actual request function with a handler that never completes until
# HttpClient cancels it. No sockets, external credentials or network are used.
Add-Type -TypeDefinition @'
using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
public sealed class SmokeStalledHandler : HttpMessageHandler {
  protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) {
    await Task.Delay(Timeout.Infinite, token);
    return new HttpResponseMessage();
  }
}
'@
$handler = [SmokeStalledHandler]::new()
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromMilliseconds(100)
$watch = [Diagnostics.Stopwatch]::StartNew()
try {
  $timedOut = $false
  try { Invoke-SmokeRequest $client "$baseUrl/stalled" | Out-Null } catch { $timedOut = $true }
  if (-not $timedOut -or $watch.Elapsed.TotalSeconds -gt 5) { throw 'Stalled HTTP request was not bounded.' }
  $checks.Add('Actual request function bounds a stalled transport through HttpClient cancellation')
} finally { $client.Dispose(); $handler.Dispose() }
$reportPath = Join-Path $PSScriptRoot '../test-results/production-smoke-regression.json'
New-Item -ItemType Directory -Force (Split-Path $reportPath) | Out-Null
@{ generated_at = [DateTime]::UtcNow.ToString('o'); scope = 'Deterministic response contracts and cancellable synthetic transport; no network or credentials'; assertions = $checks.Count; checks = @($checks) } |
  ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportPath -Encoding utf8
Write-Host "PASS $($checks.Count) production smoke regression assertions."
