[CmdletBinding()]
param()

$root = Split-Path -Parent $PSScriptRoot
$prompt = Join-Path $root 'codex\MASTER_PROMPT.md'

if (-not (Test-Path -LiteralPath $prompt)) {
    throw "Master prompt not found: $prompt"
}

Get-Content -LiteralPath $prompt -Raw | Set-Clipboard
Write-Host "Copied codex\MASTER_PROMPT.md to the clipboard." -ForegroundColor Green
Write-Host "Project root: $root"
Write-Host "Paste the prompt into Codex with the repository/folder opened."
