param(
    [string]$Workspace = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $Workspace 'src/assets/ui'
$manifestPath = Join-Path $assetRoot 'ui_assets.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$policy = $manifest.equipmentIconPolicy
$variantRoot = Join-Path $assetRoot 'equipment/variants'

function Resolve-Pattern([string]$pattern, [string]$typeId, [string]$gradeId, [string]$qualityId) {
    return $pattern.Replace('{type}', $typeId.ToLowerInvariant()).
        Replace('{grade}', $gradeId.ToLowerInvariant()).
        Replace('{quality}', $qualityId.ToLowerInvariant())
}

function Draw-Diamond($graphics, [int]$centerX, [int]$centerY, [int]$radius, $fillColor) {
    $points = [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new($centerX, $centerY - $radius),
        [System.Drawing.Point]::new($centerX + $radius, $centerY),
        [System.Drawing.Point]::new($centerX, $centerY + $radius),
        [System.Drawing.Point]::new($centerX - $radius, $centerY)
    )
    $brush = [System.Drawing.SolidBrush]::new($fillColor)
    $outline = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(235, 255, 255, 255), 2)
    try {
        $graphics.FillPolygon($brush, $points)
        $graphics.DrawPolygon($outline, $points)
    } finally {
        $brush.Dispose()
        $outline.Dispose()
    }
}

$generated = 0
foreach ($type in $policy.types) {
    $masterPath = Join-Path $assetRoot $type.master
    if (-not (Test-Path -LiteralPath $masterPath)) {
        throw "Missing equipment icon master: $($type.master)"
    }

    foreach ($grade in $policy.grades) {
            $gradeColor = [System.Drawing.ColorTranslator]::FromHtml($grade.color)
            foreach ($quality in $policy.qualities) {
                # GDI+ may stop rendering a repeatedly reused PNG decoder after several
                # DrawImage calls. Open a fresh bitmap for every exported variant.
                $master = [System.Drawing.Bitmap]::new($masterPath)
                $relativePath = Resolve-Pattern $policy.filePattern $type.id $grade.id $quality.id
                $outputPath = Join-Path $assetRoot $relativePath
                $outputDirectory = Split-Path -Parent $outputPath
                New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

                try {
                    $bitmap = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
                    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
                    try {
                        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#10131A'))
                        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
                        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
                        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
                        $graphics.DrawImage($master, [System.Drawing.Rectangle]::new(12, 12, 232, 232))

                        $frameWidth = [int]$quality.frameWidth
                        $outerPen = [System.Drawing.Pen]::new($gradeColor, $frameWidth)
                        $innerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(150, $gradeColor), 2)
                        try {
                            $graphics.DrawRectangle($outerPen, 4, 4, 247, 247)
                            $graphics.DrawRectangle($innerPen, 11, 11, 233, 233)
                            foreach ($corner in @(
                                @(4, 4), @(232, 4), @(4, 232), @(232, 232)
                            )) {
                                $brush = [System.Drawing.SolidBrush]::new($gradeColor)
                                try { $graphics.FillRectangle($brush, $corner[0], $corner[1], 20, 20) }
                                finally { $brush.Dispose() }
                            }
                        } finally {
                            $outerPen.Dispose()
                            $innerPen.Dispose()
                        }

                        $markerCount = [int]$quality.markerCount
                        $spacing = 24
                        $firstX = 128 - [int](($markerCount - 1) * $spacing / 2)
                        for ($index = 0; $index -lt $markerCount; $index++) {
                            Draw-Diamond $graphics ($firstX + ($index * $spacing)) 230 9 $gradeColor
                        }
                    } finally {
                        $graphics.Dispose()
                    }

                    try {
                        if (Test-Path -LiteralPath $outputPath) {
                            Remove-Item -LiteralPath $outputPath -Force
                        }
                        $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
                        $generated++
                    } finally {
                        $bitmap.Dispose()
                    }
                } finally {
                    $master.Dispose()
                }
            }
        }
}

Write-Output (@{
    status = 'PASS'
    generated = $generated
    outputRoot = $variantRoot
} | ConvertTo-Json)
