param(
  [string]$GeneratedRoot = 'C:\Users\Home\.codex\generated_images\019fc7e5-bd5b-7c23-aa46-46765c90d4a2'
)

Add-Type -AssemblyName System.Drawing

$items = @(
  [pscustomobject]@{ Area = 'base-metal'; Slug = 'corrosion'; Source = 'exec-430a4d27-c439-4401-bfe0-daf28c5d028f.png' },
  [pscustomobject]@{ Area = 'base-metal'; Slug = 'service-cracks'; Source = 'exec-a1e1b890-5b3a-48f6-887b-d6e2a0000229.png' },
  [pscustomobject]@{ Area = 'base-metal'; Slug = 'lamination'; Source = 'exec-ac14534f-6d14-4b08-b575-06ec75318acb.png' },
  [pscustomobject]@{ Area = 'fractography'; Slug = 'ductile'; Source = 'exec-3bb2c0a4-356e-4449-b2ca-f122efda7523.png' },
  [pscustomobject]@{ Area = 'fractography'; Slug = 'brittle'; Source = 'exec-67010f95-4fe0-4cf0-8529-4a2810d95d5d.png' },
  [pscustomobject]@{ Area = 'fractography'; Slug = 'fatigue'; Source = 'exec-0cdcf93e-9636-4c8d-967e-1914c6509309.png' },
  [pscustomobject]@{ Area = 'fractography'; Slug = 'intergranular'; Source = 'exec-bf32c061-cfcb-4f26-90ff-fce30934a8b8.png' },
  [pscustomobject]@{ Area = 'fractography'; Slug = 'stress-corrosion'; Source = 'exec-e2a7e5a2-f5f4-400a-803b-d6b5798a7aec.png' },
  [pscustomobject]@{ Area = 'fractography'; Slug = 'overload'; Source = 'exec-54adc916-a58f-4c65-b9ca-e098702e9b33.png' }
)

$outputRoot = Join-Path $PSScriptRoot '..\images\vik-atlas'
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object MimeType -eq 'image/jpeg'
$parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality,
  [long]84
)

foreach ($item in $items) {
  $sourcePath = Join-Path $GeneratedRoot $item.Source
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Generated source not found: $sourcePath"
  }

  $outputDir = Join-Path $outputRoot $item.Area
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

  $source = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $middle = [math]::Floor($source.Width / 2)
    $bounds = @(0, $middle, $source.Width)
    $panelNames = @('overview', 'detail')

    for ($panel = 0; $panel -lt 2; $panel++) {
      $sourceX = $bounds[$panel]
      $sourceWidth = $bounds[$panel + 1] - $sourceX
      $target = New-Object System.Drawing.Bitmap(600, 800)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($target)
        try {
          $graphics.Clear([System.Drawing.Color]::FromArgb(12, 18, 27))
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.DrawImage(
            $source,
            (New-Object System.Drawing.Rectangle(0, 0, 600, 800)),
            (New-Object System.Drawing.Rectangle($sourceX, 0, $sourceWidth, $source.Height)),
            [System.Drawing.GraphicsUnit]::Pixel
          )
        }
        finally {
          $graphics.Dispose()
        }

        $outputPath = Join-Path $outputDir ("{0}-{1}.jpg" -f $item.Slug, $panelNames[$panel])
        $target.Save($outputPath, $jpegCodec, $parameters)
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

$created = Get-ChildItem -LiteralPath $outputRoot -Recurse -Filter '*.jpg'
if ($created.Count -ne ($items.Count * 2)) {
  throw "Expected $($items.Count * 2) JPEG files, found $($created.Count)."
}

Write-Output "Created $($created.Count) optimized VIK and fractography images in $outputRoot"
