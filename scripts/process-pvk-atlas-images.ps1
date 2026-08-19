param(
  [string]$GeneratedRoot = 'C:\Users\Home\.codex\generated_images\019fc7e5-bd5b-7c23-aa46-46765c90d4a2'
)

Add-Type -AssemblyName System.Drawing

$items = [ordered]@{
  'linear-crack' = 'exec-05cbdd75-33d3-4f34-a676-189c55027265.png'
  'branched-crack' = 'exec-cd0176e1-2532-40a3-8fb2-32b9200afa8a.png'
  'microcrack-cluster' = 'exec-b4a0ab2a-701d-4f71-9267-166180c47ebe.png'
  'fatigue-concentrator' = 'exec-cf7465d3-ee1d-439a-b814-356a5330764a.png'
  'grinding-thermal-crack' = 'exec-3e68d60a-f0e6-4eee-be11-c926a9f1dee3.png'
  'surface-incomplete-penetration' = 'exec-92fc5ca3-8d06-491c-887a-81236cf06455.png'
  'surface-lack-of-fusion' = 'exec-ceef2c67-2500-40fc-95e5-b4aa35fb484b.png'
  'open-pore' = 'exec-11528cf5-d3ea-43bd-9a51-728664d4c92a.png'
  'pore-cluster' = 'exec-bb19a47b-adfe-4e65-9ac9-392fdae2074d.png'
  'pinhole' = 'exec-4a329c08-0eaf-4fd7-bea5-d52f0838bff9.png'
  'overlay-boundary' = 'exec-aaf82ac5-756d-4e3f-be54-e339c87e4c32.png'
  'scratch' = 'exec-4ae99c6f-a0c0-457e-a813-c7d9bdf271de.png'
  'roughness' = 'exec-c2e688f5-8cf1-48c1-8eaa-8be9b3288b52.png'
  'geometric-edge' = 'exec-bbdd8a47-e27f-4c47-b597-118ed1a839b8.png'
  'thread-groove-hole' = 'exec-69494668-6e6b-43e3-9728-2f225de82f57.png'
  'loose-joint' = 'exec-d32d5303-a22c-4ea1-862f-5a39da306529.png'
  'scale' = 'exec-0a7d3d3c-d3e8-4928-ab16-da429363f88c.png'
  'contamination' = 'exec-ec5c2ae2-ec1a-48eb-b153-98ebe6d27e1d.png'
  'coating-residue' = 'exec-1a6e316f-f72b-487b-9cca-d0f8632af56a.png'
  'porous-surface' = 'exec-92065b7d-4b63-44b4-8885-62a14de22a47.png'
  'weld-spatter' = 'exec-931c5d6c-d7c4-45cd-b7a5-22bbc38e2981.png'
  'insufficient-cleaning' = 'exec-47ba5024-4663-4972-98e5-d1df851a63cc.png'
  'excess-penetrant' = 'exec-b07abc06-d113-4b94-aa0a-8792ac7bd678.png'
  'overcleaning' = 'exec-31bef618-1b65-4667-a4be-7b2a96b10e74.png'
  'thick-developer' = 'exec-eb8ecc76-30ce-4abd-840d-d013ce577d11.png'
  'uneven-developer' = 'exec-6463e51b-40a1-4e23-b068-095c0fc23068.png'
  'short-dwell' = 'exec-52d92fc0-a9f1-4789-804d-9fe2a1e95f8d.png'
  'overdrying' = 'exec-41a1e153-4ac6-41f3-82b0-c36d013ec4c7.png'
  'lint' = 'exec-7a04b33a-5e44-40ed-ba56-f470f697e869.png'
  'incompatible-materials' = 'exec-c51919ca-567c-481b-8650-1b57cc953e6f.png'
  'insufficient-lighting' = 'exec-8c60fd4c-e58c-4b12-b3d8-badc04005ef2.png'
}

$outputRoot = Join-Path $PSScriptRoot '..\images\pvk-atlas\indications'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object MimeType -eq 'image/jpeg'
$encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality,
  [long]82
)

$panelNames = @('white', 'uv', 'diagram')

foreach ($entry in $items.GetEnumerator()) {
  $sourcePath = Join-Path $GeneratedRoot $entry.Value
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Generated source not found: $sourcePath"
  }

  $source = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $boundaries = @(0, [math]::Floor($source.Width / 3), [math]::Floor(2 * $source.Width / 3), $source.Width)

    for ($panelIndex = 0; $panelIndex -lt 3; $panelIndex++) {
      $sourceX = $boundaries[$panelIndex]
      $sourceWidth = $boundaries[$panelIndex + 1] - $sourceX
      $target = New-Object System.Drawing.Bitmap(540, 810)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($target)
        try {
          $graphics.Clear([System.Drawing.Color]::FromArgb(12, 18, 27))
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.DrawImage(
            $source,
            (New-Object System.Drawing.Rectangle(0, 0, 540, 810)),
            (New-Object System.Drawing.Rectangle($sourceX, 0, $sourceWidth, $source.Height)),
            [System.Drawing.GraphicsUnit]::Pixel
          )
        }
        finally {
          $graphics.Dispose()
        }

        $outputPath = Join-Path $outputRoot ("{0}-{1}.jpg" -f $entry.Key, $panelNames[$panelIndex])
        $target.Save($outputPath, $jpegCodec, $encoderParameters)
      }
      finally {
        $target.Dispose()
      }
    }
  }
  finally {
    $source.Dispose()
  }
}

$created = Get-ChildItem -LiteralPath $outputRoot -Filter '*.jpg'
if ($created.Count -ne ($items.Count * 3)) {
  throw "Expected $($items.Count * 3) output files, found $($created.Count)."
}

Write-Output "Created $($created.Count) optimized PVK atlas images in $outputRoot"
