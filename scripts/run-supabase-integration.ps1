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
  $env:RUN_SUPABASE_INTEGRATION = 'true'
  $env:SUPABASE_INTEGRATION_CONFIRMATION = 'RUN_ON_DISPOSABLE_TEST_PROJECT'
  $env:SUPABASE_INTEGRATION_URL = $IntegrationUrl
  $env:SUPABASE_INTEGRATION_PUBLISHABLE_KEY = $PublishableKey
  $env:SUPABASE_INTEGRATION_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)

  & node "$PSScriptRoot\..\node_modules\vitest\vitest.mjs" run --config "$PSScriptRoot\..\vitest.integration.config.ts"
  exit $LASTEXITCODE
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  Remove-Item Env:RUN_SUPABASE_INTEGRATION -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_INTEGRATION_CONFIRMATION -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_INTEGRATION_URL -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_INTEGRATION_PUBLISHABLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_INTEGRATION_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
}
