[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^https://[^/]+/?$')]
  [string]$AppUrl,

  # Vercel Deployment Protection stays enabled. When this switch is supplied,
  # the script requests the project bypass secret interactively and never puts
  # it in command history or output.
  [switch]$UseVercelProtectionBypass
)

$baseUrl = $AppUrl.TrimEnd('/')
if ($baseUrl -match '(?i)(actual-deployment-url|your-vercel-domain)') {
  throw 'Replace the example URL with the real Ready deployment URL shown in Vercel → Project → Deployments.'
}
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$client = [System.Net.Http.HttpClient]::new($handler)
$failed = $false
$bypassPointer = [IntPtr]::Zero

function Check([bool]$condition, [string]$message) {
  if ($condition) {
    Write-Host "PASS  $message" -ForegroundColor Green
  } else {
    Write-Host "FAIL  $message" -ForegroundColor Red
    $script:failed = $true
  }
}

function Get-HeaderValue([System.Net.Http.HttpResponseMessage]$response, [string]$name) {
  [System.Collections.Generic.IEnumerable[string]]$values = $null
  if ($response.Headers.TryGetValues($name, [ref]$values)) { return @($values)[0] }
  if ($response.Content.Headers.TryGetValues($name, [ref]$values)) { return @($values)[0] }
  return $null
}

function Describe-Redirect([System.Net.Http.HttpResponseMessage]$response) {
  $location = Get-HeaderValue $response 'Location'
  if (-not [string]::IsNullOrWhiteSpace($location)) {
    Write-Host "INFO  Redirect destination: $location" -ForegroundColor Yellow
  }
}

try {
  if ($UseVercelProtectionBypass) {
    $bypassSecret = Read-Host 'Paste the Vercel Protection Bypass for Automation secret (input is hidden)' -AsSecureString
    $bypassPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($bypassSecret)
    $client.DefaultRequestHeaders.Add('x-vercel-protection-bypass', [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bypassPointer))
  }

  $health = $client.GetAsync("$baseUrl/api/health").GetAwaiter().GetResult()
  Check ([int]$health.StatusCode -eq 200) 'GET /api/health returns HTTP 200.'
  $healthBodyText = $health.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  if ([int]$health.StatusCode -eq 200) {
    try {
      $healthBody = $healthBodyText | ConvertFrom-Json -ErrorAction Stop
      Check ($healthBody.status -eq 'ok' -and $healthBody.checks.database -eq 'ok') 'Health endpoint confirms database readiness.'
    } catch {
      Check $false 'Health endpoint returned HTTP 200 but not the expected JSON readiness response.'
    }
  } else {
    Check $false "Health endpoint returned HTTP $([int]$health.StatusCode), so database readiness could not be confirmed."
    Describe-Redirect $health
  }
  Check ((Get-HeaderValue $health 'X-Content-Type-Options') -eq 'nosniff') 'Security header X-Content-Type-Options is present.'
  Check (-not [string]::IsNullOrWhiteSpace((Get-HeaderValue $health 'X-Request-Id'))) 'Server generates a request correlation ID.'

  $login = $client.GetAsync("$baseUrl/login").GetAwaiter().GetResult()
  Check ([int]$login.StatusCode -eq 200) 'GET /login returns HTTP 200.'
  if ([int]$login.StatusCode -ne 200) { Describe-Redirect $login }
  Check ((Get-HeaderValue $login 'Content-Security-Policy') -match "default-src 'self'") 'Login page has a Content Security Policy.'
  Check ((Get-HeaderValue $login 'Strict-Transport-Security') -match 'max-age=') 'HTTPS transport security is enabled.'

  $protected = $client.GetAsync("$baseUrl/modelops").GetAwaiter().GetResult()
  $location = Get-HeaderValue $protected 'Location'
  Check ([int]$protected.StatusCode -in 301, 302, 303, 307, 308) 'Unauthenticated GET /modelops redirects rather than serving protected content.'
  Check ($location -match '/login') 'Protected-route redirect targets /login.'
  if ([int]$protected.StatusCode -in 301, 302, 303, 307, 308) { Describe-Redirect $protected }
} catch {
  Check $false "Smoke request failed: $($_.Exception.Message)"
} finally {
  if ($bypassPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bypassPointer)
  }
  $client.Dispose()
  $handler.Dispose()
}

if ($failed) {
  Write-Host 'Unauthenticated production smoke check failed. Do not promote this deployment.' -ForegroundColor Red
  exit 1
}

Write-Host 'Unauthenticated production smoke check passed.' -ForegroundColor Green
Write-Host 'Next: sign in manually and create one non-sensitive test evaluation to verify the protected workflow.' -ForegroundColor Yellow
