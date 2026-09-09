[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^https://.+\.supabase\.co$')]
  [string]$IntegrationUrl,

  [Parameter(Mandatory)]
  [ValidatePattern('^(sb_publishable_|eyJ).+')]
  [string]$PublishableKey
)

$secretKey = Read-Host 'Paste the disposable project secret/service-role key (input is hidden)' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretKey)

try {
  $env:RUN_MODELOPS_BROWSER_E2E = 'true'
  $env:MODELOPS_BROWSER_E2E_BASE_URL = 'http://127.0.0.1:3100'
  $env:SUPABASE_INTEGRATION_CONFIRMATION = 'RUN_ON_DISPOSABLE_TEST_PROJECT'
  $env:SUPABASE_INTEGRATION_URL = $IntegrationUrl
  $env:SUPABASE_INTEGRATION_PUBLISHABLE_KEY = $PublishableKey
  $env:SUPABASE_INTEGRATION_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  $env:NEXT_PUBLIC_SUPABASE_URL = $IntegrationUrl
  $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $PublishableKey
  $env:SUPABASE_SECRET_KEY = $env:SUPABASE_INTEGRATION_SERVICE_ROLE_KEY
  $env:AI_EGRESS_MODE = 'disabled'
  # Playwright pins browser binaries to its package revision. This is a no-op
  # after the required Chromium and headless shell are already present.
  & node "$PSScriptRoot\..\node_modules\playwright\cli.js" install chromium
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & node "$PSScriptRoot\..\node_modules\playwright\cli.js" test
  exit $LASTEXITCODE
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  @('RUN_MODELOPS_BROWSER_E2E', 'MODELOPS_BROWSER_E2E_BASE_URL', 'SUPABASE_INTEGRATION_CONFIRMATION', 'SUPABASE_INTEGRATION_URL', 'SUPABASE_INTEGRATION_PUBLISHABLE_KEY', 'SUPABASE_INTEGRATION_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'AI_EGRESS_MODE') | ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
}
