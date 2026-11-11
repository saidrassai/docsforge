$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js was not found on PATH."
}
& node (Join-Path $PSScriptRoot "docs-toolkit.mjs") status @args
exit $LASTEXITCODE
