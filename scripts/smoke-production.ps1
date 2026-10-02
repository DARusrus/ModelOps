[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^https://[^/]+/?$')]
  [string]$AppUrl,
  # Hidden input: never place the Vercel automation bypass secret in history.
  [switch]$UseVercelProtectionBypass
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
. "$PSScriptRoot/lib/production-smoke.ps1"
$baseUrl = $AppUrl.TrimEnd('/')
$origin = [Uri]$baseUrl
if ($baseUrl -match '(?i)(actual-deployment-url|your-vercel-domain)' -or $origin.UserInfo -or $origin.Query -or $origin.Fragment -or $origin.AbsolutePath -ne '/') {
  throw 'Use the real HTTPS deployment origin, without credentials or placeholders.'
}
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$handler.UseCookies = $false # Every probe is anonymous, even if a response sets cookies.
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(15)
$failed = $false
$bypassPointer = [IntPtr]::Zero
try {
  if ($UseVercelProtectionBypass) {
    $bypassSecret = Read-Host 'Paste the Vercel Protection Bypass for Automation secret (input is hidden)' -AsSecureString
    $bypassPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($bypassSecret)
    $client.DefaultRequestHeaders.Add('x-vercel-protection-bypass', [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bypassPointer))
  }
  foreach ($target in Get-SmokeTargets) {
    try {
      $response = Invoke-SmokeRequest $client "$baseUrl$($target.Path)"
      $failures = @(Get-SmokeFailures $target $response $baseUrl)
      if ($failures.Count -eq 0) {
        Write-Host "PASS  GET $($target.Path): $($target.Kind) contract verified." -ForegroundColor Green
      } else {
        $failed = $true
        foreach ($failure in $failures) { Write-Host "FAIL  GET $($target.Path): $failure" -ForegroundColor Red }
      }
    } catch {
      # Do not echo exception URLs/headers: protection credentials must stay hidden.
      $failed = $true
      Write-Host "FAIL  GET $($target.Path): request timed out or transport failed." -ForegroundColor Red
      break
    }
  }
} finally {
  if ($bypassPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bypassPointer) }
  $client.Dispose()
  $handler.Dispose()
}
if ($failed) {
  Write-Host 'Unauthenticated production smoke check failed. Do not promote this deployment.' -ForegroundColor Red
  exit 1
}
Write-Host 'Unauthenticated production smoke check passed. Authenticated workflows and release commit identity still require verification.' -ForegroundColor Green
