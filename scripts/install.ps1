# DocsForge - Windows PowerShell installer
# Requires Node.js on PATH. No administrator rights or symlinks required.

$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js was not found on PATH. Install Node.js 22.22.0 or newer first."
}
& node (Join-Path $PSScriptRoot "docs-toolkit.mjs") install @args
exit $LASTEXITCODE
