[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$')]
  [string]$Release,

  [ValidatePattern('^[a-z0-9][a-z0-9-]*$')]
  [string]$Organization = 'arab-acdmey-for-science-techno',

  [ValidatePattern('^[a-z0-9][a-z0-9_-]*$')]
  [string]$Project = 'model_ops',

  [ValidatePattern('^https://[a-z0-9.-]+$')]
  [string]$SentryUrl = 'https://de.sentry.io'
)

$authToken = Read-Host 'Paste the Sentry source-map token (input is hidden)' -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($authToken)
$scopedNames = @(
  'SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_URL',
  'SENTRY_RELEASE', 'NEXT_PUBLIC_SENTRY_RELEASE'
)
$originalEnvironment = @{}

try {
  foreach ($name in $scopedNames) {
    $existing = Get-Item "Env:$name" -ErrorAction SilentlyContinue
    if ($null -ne $existing) { $originalEnvironment[$name] = $existing.Value }
  }

  $env:SENTRY_AUTH_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
  $env:SENTRY_ORG = $Organization
  $env:SENTRY_PROJECT = $Project
  $env:SENTRY_URL = $SentryUrl
  $env:SENTRY_RELEASE = $Release
  $env:NEXT_PUBLIC_SENTRY_RELEASE = $Release

  # Use the project-local Next.js CLI directly. The system-wide npm shim is
  # optional and may be unavailable or misconfigured on a developer machine.
  & node "$PSScriptRoot\..\node_modules\next\dist\bin\next" build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $headers = @{ Authorization = "Bearer $env:SENTRY_AUTH_TOKEN" }
  $releaseUri = "$SentryUrl/api/0/organizations/$Organization/releases/$Release/"
  $releaseDetails = Invoke-RestMethod -Uri $releaseUri -Headers $headers -Method Get -ErrorAction Stop
  if ([string]::IsNullOrWhiteSpace($releaseDetails.version)) {
    throw 'Sentry did not return a release version after the upload build.'
  }

  # Current Sentry JavaScript uploads use Debug IDs. Confirming the release
  # alone is insufficient, so verify that one ID embedded in the generated
  # browser bundle resolves to an uploaded debug artifact in Sentry.
  $debugIdPattern = '//# debugId=([0-9a-fA-F-]{36})'
  $debugId = $null
  Get-ChildItem -LiteralPath "$PSScriptRoot\..\.next\static" -Recurse -Filter '*.js' | ForEach-Object {
    if ($null -ne $debugId) { return }
    $match = [regex]::Match([System.IO.File]::ReadAllText($_.FullName), $debugIdPattern)
    if ($match.Success) { $debugId = $match.Groups[1].Value }
  }
  if ($null -eq $debugId) {
    throw 'The production browser bundle did not contain a Sentry Debug ID.'
  }

  $debugFilesUri = "$SentryUrl/api/0/projects/$Organization/$Project/files/dsyms/?debug_id=$debugId"
  $debugArtifacts = @(Invoke-RestMethod -Uri $debugFilesUri -Headers $headers -Method Get -ErrorAction Stop)
  if ($debugArtifacts.Count -lt 1) {
    throw 'Sentry did not return an uploaded debug artifact for the generated browser bundle.'
  }

  Write-Host "Sentry source-map upload verified for release: $($releaseDetails.version)"
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
  $scopedNames | ForEach-Object {
    if ($originalEnvironment.ContainsKey($_)) { Set-Item "Env:$_" $originalEnvironment[$_] }
    else { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
  }
}
