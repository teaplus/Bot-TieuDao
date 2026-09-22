param([string]$Workspace = (Get-Location).Path)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class TieuDaoIconTransparency {
    private static bool IsBackground(Color color) {
        int min = Math.Min(color.R, Math.Min(color.G, color.B));
        int max = Math.Max(color.R, Math.Max(color.G, color.B));
        return min >= 220 && max - min <= 7;
    }

    public static void RemoveConnectedCheckerboard(string inputPath, string outputPath) {
        using (var source = new Bitmap(inputPath)) {
            var target = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
            using (var graphics = Graphics.FromImage(target)) graphics.DrawImageUnscaled(source, 0, 0);
            int width = target.Width, height = target.Height;
            var visited = new bool[width * height];
            var queue = new Queue<int>();
            Action<int, int> enqueue = (x, y) => {
                int index = y * width + x;
                if (!visited[index] && IsBackground(target.GetPixel(x, y))) {
                    visited[index] = true;
                    queue.Enqueue(index);
                }
            };
            for (int x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
            for (int y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }
            while (queue.Count > 0) {
                int index = queue.Dequeue();
                int x = index % width, y = index / width;
                Color color = target.GetPixel(x, y);
                target.SetPixel(x, y, Color.FromArgb(0, color.R, color.G, color.B));
                if (x > 0) enqueue(x - 1, y);
                if (x + 1 < width) enqueue(x + 1, y);
                if (y > 0) enqueue(x, y - 1);
                if (y + 1 < height) enqueue(x, y + 1);
            }
            target.Save(outputPath, ImageFormat.Png);
            target.Dispose();
        }
    }
}
"@

$assetRoot = Join-Path $Workspace "src/assets/ui"
$manifest = Get-Content -LiteralPath (Join-Path $assetRoot "ui_assets.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$policy = $manifest.itemResourceIconPolicy
if ($null -eq $policy) { throw "ITEM_RESOURCE_ICON_POLICY_MISSING" }

function Resolve-Pattern([string]$pattern, [string]$semanticId) {
    return $pattern.Replace("{semantic}", $semanticId.ToLowerInvariant())
}

$generated = 0
foreach ($semantic in $policy.semantics) {
    $masterPath = Join-Path $assetRoot (Resolve-Pattern $policy.masterPattern $semantic.id)
    if (-not (Test-Path -LiteralPath $masterPath)) {
        throw "ITEM_RESOURCE_MASTER_MISSING:$($semantic.id)"
    }

    $cleanPath = "$masterPath.clean.png"
    [TieuDaoIconTransparency]::RemoveConnectedCheckerboard($masterPath, $cleanPath)
    Move-Item -LiteralPath $cleanPath -Destination $masterPath -Force

    $outputPath = Join-Path $assetRoot (Resolve-Pattern $policy.sourcePattern $semantic.id)
    New-Item -ItemType Directory -Path (Split-Path -Parent $outputPath) -Force | Out-Null
    $source = [System.Drawing.Bitmap]::new($masterPath)
    $target = [System.Drawing.Bitmap]::new(
        [int]$policy.sourceSize,
        [int]$policy.sourceSize,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
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
    background = "CONNECTED_CHECKERBOARD_REMOVED"
    sourceSize = "$($policy.sourceSize)x$($policy.sourceSize)"
} | ConvertTo-Json)
