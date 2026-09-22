param([string]$Workspace = (Get-Location).Path)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $Workspace "src/assets/ui"
$manifest = Get-Content -LiteralPath (Join-Path $assetRoot "ui_assets.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$policy = $manifest.shopAreaIconPolicy
if ($null -eq $policy) { throw "SHOP_AREA_ICON_POLICY_MISSING" }

function Resolve-Pattern([string]$pattern, [string]$areaId) {
    return $pattern.Replace("{area}", $areaId.ToLowerInvariant())
}

$generated = 0
foreach ($area in $policy.areas) {
    $masterPath = Join-Path $assetRoot (Resolve-Pattern $policy.masterPattern $area.id)
    if (-not (Test-Path -LiteralPath $masterPath)) { throw "SHOP_AREA_MASTER_MISSING:$($area.id)" }
    $outputPath = Join-Path $assetRoot (Resolve-Pattern $policy.sourcePattern $area.id)
    New-Item -ItemType Directory -Path (Split-Path -Parent $outputPath) -Force | Out-Null
    $source = [System.Drawing.Bitmap]::new($masterPath)
    $target = [System.Drawing.Bitmap]::new([int]$policy.sourceSize, [int]$policy.sourceSize)
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(
            0, 0, [int]$policy.sourceSize, [int]$policy.sourceSize
        ))
    } finally {
        $graphics.Dispose()
        $source.Dispose()
    }
    try {
        if (Test-Path -LiteralPath $outputPath) { Remove-Item -LiteralPath $outputPath -Force }
        $target.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $generated++
    } finally {
        $target.Dispose()
    }
}

Write-Output (@{ status = "PASS"; generated = $generated; sourceSize = "$($policy.sourceSize)x$($policy.sourceSize)" } | ConvertTo-Json)
