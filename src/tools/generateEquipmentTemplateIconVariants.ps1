param([string]$Workspace = (Get-Location).Path)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $Workspace "src/assets/ui"
$manifest = Get-Content -LiteralPath (Join-Path $assetRoot "ui_assets.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$policy = $manifest.equipmentTemplateIconPolicy
$framePolicy = $manifest.equipmentIconPolicy
$emojiPolicy = $manifest.applicationEmojiPolicy
$quadrants = @{ WEAPON = @(0, 0); ARMOR = @(1, 0); NECKLACE = @(0, 1); RING = @(1, 1) }

function Resolve-Pattern([string]$pattern, [string]$templateId, [string]$gradeId = "", [string]$qualityId = "") {
    return $pattern.Replace("{template}", $templateId.ToLowerInvariant()).Replace("{grade}", $gradeId.ToLowerInvariant()).Replace("{quality}", $qualityId.ToLowerInvariant())
}

function Save-Bitmap($bitmap, [string]$outputPath) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $outputPath) -Force | Out-Null
    if (Test-Path -LiteralPath $outputPath) { Remove-Item -LiteralPath $outputPath -Force }
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Draw-Diamond($graphics, [int]$centerX, [int]$centerY, [int]$radius, $color) {
    $points = [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new($centerX, $centerY - $radius),
        [System.Drawing.Point]::new($centerX + $radius, $centerY),
        [System.Drawing.Point]::new($centerX, $centerY + $radius),
        [System.Drawing.Point]::new($centerX - $radius, $centerY)
    )
    $brush = [System.Drawing.SolidBrush]::new($color)
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 1)
    try { $graphics.FillPolygon($brush, $points); $graphics.DrawPolygon($pen, $points) }
    finally { $brush.Dispose(); $pen.Dispose() }
}

$masterCount = 0
$variantCount = 0
$emojiSourceCount = 0
foreach ($sheetDefinition in $policy.sheets) {
    $sheetPath = Join-Path $assetRoot $sheetDefinition.file
    if (-not (Test-Path -LiteralPath $sheetPath)) { throw "Missing template icon sheet: $($sheetDefinition.file)" }
    $sheet = [System.Drawing.Bitmap]::new($sheetPath)
    try {
        $cellWidth = [int][Math]::Floor($sheet.Width / 2)
        $cellHeight = [int][Math]::Floor($sheet.Height / 2)
        foreach ($templateProperty in $sheetDefinition.templates.PSObject.Properties) {
            $equipmentType = $templateProperty.Name
            $templateId = [string]$templateProperty.Value
            $quadrant = $quadrants[$equipmentType]
            if ($null -eq $quadrant) { throw "Unsupported equipment quadrant: $equipmentType" }

            $sourceRect = [System.Drawing.Rectangle]::new($quadrant[0] * $cellWidth, $quadrant[1] * $cellHeight, $cellWidth, $cellHeight)
            $master = [System.Drawing.Bitmap]::new([int]$policy.masterSize, [int]$policy.masterSize)
            $graphics = [System.Drawing.Graphics]::FromImage($master)
            try {
                $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#10131A"))
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($sheet, [System.Drawing.Rectangle]::new(0, 0, $policy.masterSize, $policy.masterSize), $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
            } finally { $graphics.Dispose() }
            $masterPath = Join-Path $assetRoot (Resolve-Pattern $policy.masterPattern $templateId)
            try {
                Save-Bitmap $master $masterPath
                $masterCount++
                if ($null -ne $emojiPolicy) {
                    $emojiSize = [int]$emojiPolicy.sourceSize
                    $emojiSource = [System.Drawing.Bitmap]::new($emojiSize, $emojiSize)
                    $emojiGraphics = [System.Drawing.Graphics]::FromImage($emojiSource)
                    try {
                        $emojiGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#10131A"))
                        $emojiGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
                        $emojiGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
                        $emojiGraphics.DrawImage($master, [System.Drawing.Rectangle]::new(0, 0, $emojiSize, $emojiSize))
                    } finally { $emojiGraphics.Dispose() }
                    $emojiSourcePath = Join-Path $assetRoot (Resolve-Pattern $emojiPolicy.sourcePattern $templateId)
                    try { Save-Bitmap $emojiSource $emojiSourcePath; $emojiSourceCount++ }
                    finally { $emojiSource.Dispose() }
                }
            } finally { $master.Dispose() }

            foreach ($grade in $framePolicy.grades) {
                $gradeColor = [System.Drawing.ColorTranslator]::FromHtml($grade.color)
                foreach ($quality in $framePolicy.qualities) {
                    $freshMaster = [System.Drawing.Bitmap]::new($masterPath)
                    $variantSize = [int]$policy.variantSize
                    $variant = [System.Drawing.Bitmap]::new($variantSize, $variantSize)
                    $variantGraphics = [System.Drawing.Graphics]::FromImage($variant)
                    try {
                        $variantGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#10131A"))
                        $variantGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
                        $variantGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
                        $padding = [Math]::Max(2, [int][Math]::Round($variantSize * 0.0625))
                        $contentSize = $variantSize - ($padding * 2)
                        $variantGraphics.DrawImage($freshMaster, [System.Drawing.Rectangle]::new($padding, $padding, $contentSize, $contentSize))
                        $frameWidth = [Math]::Max(1, [int][Math]::Round(([int]$quality.frameWidth / 8) * ($variantSize / 32)))
                        $outer = [System.Drawing.Pen]::new($gradeColor, $frameWidth)
                        $inner = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(150, $gradeColor), 1)
                        try {
                            $variantGraphics.DrawRectangle($outer, 0, 0, $variantSize - 1, $variantSize - 1)
                            $variantGraphics.DrawRectangle($inner, $padding, $padding, $contentSize - 1, $contentSize - 1)
                            $cornerBrush = [System.Drawing.SolidBrush]::new($gradeColor)
                            try {
                                $cornerSize = [Math]::Max(2, [int][Math]::Round($variantSize * 0.09375))
                                $farCorner = $variantSize - $cornerSize
                                foreach ($corner in @(@(0,0), @($farCorner,0), @(0,$farCorner), @($farCorner,$farCorner))) {
                                    $variantGraphics.FillRectangle($cornerBrush, $corner[0], $corner[1], $cornerSize, $cornerSize)
                                }
                            } finally { $cornerBrush.Dispose() }
                        } finally { $outer.Dispose(); $inner.Dispose() }
                        $count = [int]$quality.markerCount
                        $spacing = [Math]::Max(3, [int][Math]::Round($variantSize * 0.125))
                        $centerX = [int][Math]::Floor($variantSize / 2)
                        $firstX = $centerX - [int](($count - 1) * $spacing / 2)
                        $markerY = $variantSize - [Math]::Max(3, [int][Math]::Round($variantSize * 0.125))
                        $markerRadius = [Math]::Max(1, [int][Math]::Round($variantSize * 0.03125))
                        for ($index = 0; $index -lt $count; $index++) {
                            Draw-Diamond $variantGraphics ($firstX + ($index * $spacing)) $markerY $markerRadius $gradeColor
                        }
                    } finally { $variantGraphics.Dispose(); $freshMaster.Dispose() }
                    $outputPath = Join-Path $assetRoot (Resolve-Pattern $policy.filePattern $templateId $grade.id $quality.id)
                    try { Save-Bitmap $variant $outputPath; $variantCount++ } finally { $variant.Dispose() }
                }
            }
        }
    } finally { $sheet.Dispose() }
}

Write-Output (@{
    status = "PASS"
    masters = $masterCount
    variants = $variantCount
    applicationEmojiSources = $emojiSourceCount
} | ConvertTo-Json)
