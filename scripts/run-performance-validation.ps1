[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^https://.+\.supabase\.co$')]
  [string]$IntegrationUrl,

  [Parameter(Mandatory)]
  [ValidatePattern('^(sb_publishable_|eyJ).+')]
  [string]$PublishableKey,

  [ValidateRange(2, 8)]
  [int]$CreateRequests = 8,

  [ValidateRange(1, 8)]
  [int]$Concurrency = 4,

  [ValidateRange(10, 1800)]
  [int]$StabilitySeconds = 15,

  [ValidateRange(1, 10)]
  [int]$ReadsPerSecond = 2,

  [ValidateRange(100, 10000)]
  [int]$CreateMaxBudgetMs = 6500,

  [ValidateRange(100, 10000)]
  [int]$MutationMaxBudgetMs = 3000,

  [ValidateRange(100, 10000)]
  [int]$ReadP95BudgetMs = 1000,

  [Parameter(Mandatory)]
  [switch]$ConfirmDisposableProject
)

if (-not $ConfirmDisposableProject) {
  throw 'This validation creates and deletes users and governance records. Pass -ConfirmDisposableProject only for the disposable Supabase project.'
}

$secretKey = Read-Host 'Paste the disposable project secret/service-role key (input is hidden)' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretKey)
$variables = @(
  'RUN_MODELOPS_PERFORMANCE', 'MODELOPS_PERFORMANCE_BASE_URL',
  'MODELOPS_PERFORMANCE_CREATE_REQUESTS', 'MODELOPS_PERFORMANCE_CONCURRENCY',
  'MODELOPS_PERFORMANCE_STABILITY_SECONDS', 'MODELOPS_PERFORMANCE_READS_PER_SECOND',
  'MODELOPS_PERFORMANCE_CREATE_MAX_BUDGET_MS', 'MODELOPS_PERFORMANCE_MUTATION_MAX_BUDGET_MS',
  'MODELOPS_PERFORMANCE_READ_P95_BUDGET_MS',
  'SUPABASE_INTEGRATION_CONFIRMATION', 'SUPABASE_INTEGRATION_URL',
  'SUPABASE_INTEGRATION_PUBLISHABLE_KEY', 'SUPABASE_INTEGRATION_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY', 'AI_EGRESS_MODE'
)

try {
  $env:RUN_MODELOPS_PERFORMANCE = 'true'
  $env:MODELOPS_PERFORMANCE_BASE_URL = 'http://127.0.0.1:3200'
  $env:MODELOPS_PERFORMANCE_CREATE_REQUESTS = [string]$CreateRequests
  $env:MODELOPS_PERFORMANCE_CONCURRENCY = [string]([Math]::Min($Concurrency, $CreateRequests))
  $env:MODELOPS_PERFORMANCE_STABILITY_SECONDS = [string]$StabilitySeconds
  $env:MODELOPS_PERFORMANCE_READS_PER_SECOND = [string]$ReadsPerSecond
  $env:MODELOPS_PERFORMANCE_CREATE_MAX_BUDGET_MS = [string]$CreateMaxBudgetMs
  $env:MODELOPS_PERFORMANCE_MUTATION_MAX_BUDGET_MS = [string]$MutationMaxBudgetMs
  $env:MODELOPS_PERFORMANCE_READ_P95_BUDGET_MS = [string]$ReadP95BudgetMs
  $env:SUPABASE_INTEGRATION_CONFIRMATION = 'RUN_ON_DISPOSABLE_TEST_PROJECT'
  $env:SUPABASE_INTEGRATION_URL = $IntegrationUrl
  $env:SUPABASE_INTEGRATION_PUBLISHABLE_KEY = $PublishableKey
  $env:SUPABASE_INTEGRATION_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  $env:NEXT_PUBLIC_SUPABASE_URL = $IntegrationUrl
  $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $PublishableKey
  $env:SUPABASE_SECRET_KEY = $env:SUPABASE_INTEGRATION_SERVICE_ROLE_KEY
  $env:AI_EGRESS_MODE = 'disabled'

  & node "$PSScriptRoot\..\node_modules\playwright\cli.js" install chromium
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & node "$PSScriptRoot\..\node_modules\playwright\cli.js" test --config "$PSScriptRoot\..\playwright.performance.config.ts"
  exit $LASTEXITCODE
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  $variables | ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
}
