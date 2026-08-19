param(
  [string]$GeneratedRoot = 'C:\Users\Home\.codex\generated_images\019fc7e5-bd5b-7c23-aa46-46765c90d4a2'
)

Add-Type -AssemblyName System.Drawing

$items = [ordered]@{
  'unbalance' = 'exec-9f7a42f2-f410-4cf9-8ad9-e810d39df317.png'
  'parallel-misalignment' = 'exec-2ecb4c2c-bcd4-408e-8add-bdf39b2bc706.png'
  'angular-misalignment' = 'exec-5d24dca1-85f4-4bc1-aea0-61c8323e4c3e.png'
  'bent-shaft' = 'exec-4c7c6c00-4f74-4e3e-a376-1ab2efbe9c3c.png'
  'mechanical-looseness' = 'exec-f54cefe8-aac5-449f-b049-cb797f46f911.png'
  'loose-bearing-housing' = 'exec-14f85cb0-2de5-46b6-a60e-d6985bba0a58.png'
  'bearing-clearance' = 'exec-e96dd13a-b265-4433-934b-b00635691320.png'
  'soft-foot' = 'exec-988f11e1-8778-489b-99d8-3205085bb129.png'
  'uneven-supports' = 'exec-ccb40a18-64b1-4368-a1d4-9f9ee8d81e8f.png'
  'inclined-foundation' = 'exec-e9a0189e-4af8-4bd7-99b9-3467075e2421.png'
  'casing-deformation' = 'exec-189970a0-b036-4725-ad77-707c005b0229.png'
  'pipe-strain' = 'exec-3034b9cb-1e65-40b1-b1d7-69522f409475.png'
  'rub' = 'exec-805935ef-dc7b-4d41-983c-92d70954d0ef.png'
  'resonance' = 'exec-ba471a22-2dce-4aad-a240-c4af598010ef.png'
  'cavitation' = 'exec-cb0fa1d7-73d1-4083-a371-cd3e2ca87798.png'
  'surge' = 'exec-817981c2-16e3-424b-83c7-baba288bb224.png'
  'gears' = 'exec-b08e1046-4600-43b3-be95-84b0b7fe8229.png'
  'motor-electrical' = 'exec-910594ec-c3e2-4e08-98d8-98460656e887.png'
  'rotor-cage' = 'exec-a9e5937b-9815-49b3-940e-189b87cdc550.png'
  'lubrication' = 'exec-c99dab47-69ce-4bfe-805d-0b0aecdec402.png'
  'bearing-outer-race' = 'exec-bf415532-85a4-4d51-99b2-afa08f936330.png'
  'bearing-inner-race' = 'exec-beabc839-1e36-46f5-8bf0-1d374bcb439a.png'
  'bearing-rolling-elements' = 'exec-51ef0809-d4d9-466c-8ba1-a3a2e25359f0.png'
  'bearing-cage' = 'exec-8aafb735-8fb3-4dd4-b8e6-2803d9b908e5.png'
  'rotor-precession' = 'exec-9f5e9f2d-9ad8-4393-8074-0ee771db278b.png'
  'oil-whirl' = 'exec-00d2d5b8-5b83-4803-bec5-ae86856aacf9.png'
  'babbitt' = 'exec-62cd678d-1f5f-47cf-bef6-b456dfa1497b.png'
  'oil-coking' = 'exec-70dc8eb8-db7c-410c-b550-339cc06b06c5.png'
  'journal-bearing-misalignment' = 'exec-53faa56f-bd7a-42c1-98d9-292f1831f01e.png'
}

$outputRoot = Join-Path $PSScriptRoot '..\images\vibration-atlas\faults'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object MimeType -eq 'image/jpeg'
$parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality,
  [long]84
)
$panelNames = @('photo', 'mechanism')

foreach ($entry in $items.GetEnumerator()) {
  $sourcePath = Join-Path $GeneratedRoot $entry.Value
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Generated source not found: $sourcePath"
  }

  $source = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $middle = [math]::Floor($source.Width / 2)
    $bounds = @(0, $middle, $source.Width)
    for ($panel = 0; $panel -lt 2; $panel++) {
      $sourceX = $bounds[$panel]
      $sourceWidth = $bounds[$panel + 1] - $sourceX
      $target = New-Object System.Drawing.Bitmap(540, 720)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($target)
        try {
          $graphics.Clear([System.Drawing.Color]::FromArgb(12, 18, 27))
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.DrawImage(
            $source,
            (New-Object System.Drawing.Rectangle(0, 0, 540, 720)),
            (New-Object System.Drawing.Rectangle($sourceX, 0, $sourceWidth, $source.Height)),
            [System.Drawing.GraphicsUnit]::Pixel
          )
        }
        finally {
          $graphics.Dispose()
        }
        $output = Join-Path $outputRoot ("{0}-{1}.jpg" -f $entry.Key, $panelNames[$panel])
        $target.Save($output, $jpegCodec, $parameters)
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
if ($created.Count -ne ($items.Count * 2)) {
  throw "Expected $($items.Count * 2) files, found $($created.Count)."
}
Write-Output "Created $($created.Count) vibration fault atlas images in $outputRoot"
