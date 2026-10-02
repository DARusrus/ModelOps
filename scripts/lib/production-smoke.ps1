# Shared response contracts for the HTTPS runner and deterministic fixture tests.
# Anonymous probes do not establish authenticated workflows or commit identity.
function Get-SmokeTargets {
  $card = '11111111-1111-4111-8111-111111111111'
  @{ Path = '/api/health'; Kind = 'health' }
  foreach ($path in '/login', '/signup', '/signup/check-email', '/forgot-password', '/reset-password', '/forbidden', '/select-organization', '/invite/accept') {
    @{ Path = $path; Kind = 'public' }
  }
  foreach ($path in '/dashboard', '/evaluations', '/evaluations/new', "/evaluations/$card", '/compare', '/reviews', '/modelops', '/settings/members', '/onboarding') {
    @{ Path = $path; Kind = 'protected' }
  }
  foreach ($path in '/api/dashboard', '/api/reviews', '/api/modelops', "/api/modelops/$card", "/api/modelops/$card/history", "/api/modelops/$card/export", '/api/organization/active', '/api/organization/governance', '/api/organization/members', '/api/organization/invitations') {
    @{ Path = $path; Kind = 'api' }
  }
}

function Invoke-SmokeRequest($Client, [string]$Url) {
  $response = $Client.GetAsync($Url).GetAwaiter().GetResult()
  try {
    $headers = @{}
    foreach ($header in $response.Headers) { $headers[$header.Key] = $header.Value -join ', ' }
    foreach ($header in $response.Content.Headers) { $headers[$header.Key] = $header.Value -join ', ' }
    return @{ Status = [int]$response.StatusCode; Headers = $headers; Body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() }
  } finally { $response.Dispose() }
}

function Test-SmokeLoginRedirect([string]$BaseUrl, [string]$Location, [string]$ExpectedPath) {
  if ([string]::IsNullOrWhiteSpace($Location)) { return $false }
  try {
    $origin = [Uri]$BaseUrl
    $target = [Uri]::new($origin, $Location)
    if ($target.GetLeftPart([UriPartial]::Authority) -ne $origin.GetLeftPart([UriPartial]::Authority) -or
        $target.AbsolutePath -cne '/login' -or $target.Fragment -or $target.UserInfo) { return $false }
    $nextValues = @($target.Query.TrimStart('?').Split('&') | ForEach-Object {
      $pair = $_.Split('=', 2)
      if ([Uri]::UnescapeDataString($pair[0]) -ceq 'next') {
        if ($pair.Length -eq 2) { [Uri]::UnescapeDataString($pair[1]) } else { '' }
      }
    })
    return $nextValues.Count -eq 1 -and $nextValues[0] -ceq $ExpectedPath
  } catch { return $false }
}

function Get-SmokeFailures($Target, $Response, [string]$BaseUrl) {
  $headers = $Response.Headers
  if ($headers['X-Content-Type-Options'] -cne 'nosniff') { 'Missing nosniff header.' }
  if ($headers['X-Request-Id'] -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') { 'Missing valid request correlation ID.' }
  if ($headers['Strict-Transport-Security'] -notmatch '(?i)(?:^|;\s*)max-age=[1-9][0-9]*') { 'Missing HTTPS transport security.' }
  switch ($Target.Kind) {
    'protected' {
      if ($Response.Status -notin 301, 302, 303, 307, 308) { "Protected page did not redirect (HTTP $($Response.Status))." }
      if (-not (Test-SmokeLoginRedirect $BaseUrl $headers['Location'] $Target.Path)) { 'Protected redirect must target same-origin /login with the original next path.' }
    }
    'public' {
      if ($Response.Status -ne 200) { 'Public page did not return HTTP 200.' }
      if ($headers['Content-Type'] -notmatch '^text/html(?:\s*;|$)') { 'Public page did not return HTML.' }
      if ($headers['Content-Security-Policy'] -notmatch "(?:^|;\s*)default-src 'self'(?:;|$)") { 'Missing expected Content Security Policy.' }
    }
    { $_ -in 'api', 'health' } {
      $expectedStatus = if ($Target.Kind -eq 'health') { 200 } else { 401 }
      if ($Response.Status -ne $expectedStatus) { "Expected HTTP $expectedStatus, received $($Response.Status)." }
      if ($headers['Content-Type'] -notmatch '^application/json(?:\s*;|$)') { 'Expected JSON content type.' }
      if ($headers['Cache-Control'] -notmatch '(?:^|,\s*)no-store(?:,|$)') { 'Missing no-store cache policy.' }
      try {
        $body = $Response.Body | ConvertFrom-Json -ErrorAction Stop
        if (-not $Response.Body.TrimStart().StartsWith('{') -or $body -isnot [PSCustomObject]) { 'Expected a JSON object.'; break }
        if ($Target.Kind -eq 'health') {
          if ($body.status -cne 'ok' -or $body.checks.database -cne 'ok') { 'Database readiness is not confirmed.' }
        } elseif ($body.success -isnot [bool] -or $body.success -ne $false -or $body.code -cne 'UNAUTHENTICATED') {
          'Expected explicit UNAUTHENTICATED error contract.'
        }
      } catch { 'Invalid JSON response.' }
    }
  }
}
