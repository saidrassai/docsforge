$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js was not found on PATH."
}
& node (Join-Path $PSScriptRoot "docs-toolkit.mjs") uninstall @args
exit $LASTEXITCODE
