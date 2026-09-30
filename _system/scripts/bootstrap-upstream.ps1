$ErrorActionPreference = "Stop"

$UpstreamUrl = "https://github.com/androoAGI/starnet.git"
$UpstreamBranch = if ($env:UPSTREAM_BRANCH) { $env:UPSTREAM_BRANCH } else { "feat/harness-backend" }
$Target = "vendor/starnet"

if (Test-Path "$Target/.git") {
  Write-Host "Upstream already present at $Target"
  exit 0
}

New-Item -ItemType Directory -Force -Path "vendor" | Out-Null
git clone --depth 1 --branch $UpstreamBranch $UpstreamUrl $Target

Write-Host "Upstream runtime cloned to $Target"
Write-Host "Crown & Core configuration remains in this repository root."
