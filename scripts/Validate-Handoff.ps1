[CmdletBinding()]
param(
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

Write-Host "Camping handoff validation" -ForegroundColor Cyan
Write-Host "Root: $Root"

$required = @(
    'README.md',
    'CODEX_START_HERE.md',
    'PROJECT_SPEC.md',
    'DECISIONS.md',
    'CHECKLIST_TAXONOMY.md',
    'DATA_MODEL.md',
    'UI_UX_SPEC.md',
    'ROADMAP.md',
    'SPRINTS.md',
    'RESEARCH_FINDINGS.md',
    'POSSIBLE_ADDITIONS.md',
    'ACCEPTANCE_TESTS.md',
    'IMPLEMENTATION_NOTES.md',
    'codex\MASTER_PROMPT.md',
    'codex\TASK_ORDER.md',
    'data\checklist_seed.json'
)

$missing = foreach ($relative in $required) {
    $path = Join-Path $Root $relative
    if (-not (Test-Path -LiteralPath $path)) { $relative }
}

if ($missing) {
    Write-Host "Missing required files:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}

$seedPath = Join-Path $Root 'data\checklist_seed.json'
$seed = Get-Content -LiteralPath $seedPath -Raw | ConvertFrom-Json

$requiredCategories = @('food','gear','clothes','hygiene-first-aid','extras')
$actualCategories = @($seed.categories.id)

foreach ($category in $requiredCategories) {
    if ($category -notin $actualCategories) {
        throw "Missing category: $category"
    }
}

$names = @($seed.items.name)

foreach ($requiredName in @('Propane Torch','Battery Bank','Mayonnaise','Ketchup','BBQ Sauce','Hot Sauce')) {
    if ($requiredName -notin $names) {
        throw "Missing clarified seed item: $requiredName"
    }
}

if ('Sauce' -in $names) {
    throw "Generic Sauce item must not exist."
}

$duplicateIds = $seed.items | Group-Object id | Where-Object Count -gt 1
if ($duplicateIds) {
    throw "Duplicate seed IDs: $($duplicateIds.Name -join ', ')"
}

Write-Host "PASS: handoff structure and seed sanity checks." -ForegroundColor Green
Write-Host "Seed items: $($seed.items.Count)"
