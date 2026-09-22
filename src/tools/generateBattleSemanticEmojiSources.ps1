param([string]$Workspace = (Get-Location).Path)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $Workspace "src/assets/ui"
$manifest = Get-Content -LiteralPath (Join-Path $assetRoot "ui_assets.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$policy = $manifest.battleSemanticIconPolicy
if ($null -eq $policy) { throw "BATTLE_SEMANTIC_ICON_POLICY_MISSING" }

function Resolve-Pattern([string]$pattern, [string]$semanticId) {
    return $pattern.Replace("{semantic}", $semanticId.ToLowerInvariant())
}

$generated = 0
foreach ($semantic in $policy.semantics) {
    $masterPath = Join-Path $assetRoot (Resolve-Pattern $policy.masterPattern $semantic.id)
    if (-not (Test-Path -LiteralPath $masterPath)) {
        throw "BATTLE_SEMANTIC_MASTER_MISSING:$($semantic.id)"
    }

    $outputPath = Join-Path $assetRoot (Resolve-Pattern $policy.sourcePattern $semantic.id)
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

Write-Output (@{
    status = "PASS"
    generated = $generated
    sourceSize = "$($policy.sourceSize)x$($policy.sourceSize)"
} | ConvertTo-Json)
