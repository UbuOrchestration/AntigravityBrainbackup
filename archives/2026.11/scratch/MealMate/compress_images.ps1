Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [int]$Width,
        [int]$Quality
    )
    
    $src = [System.Drawing.Image]::FromFile($InputPath)
    
    # Calculate height to maintain aspect ratio
    $ratio = $src.Height / $src.Width
    $Height = [int]($Width * $ratio)
    
    $dest = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    
    # High-quality interpolation
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $Width, $Height)
    
    # Setup JPEG compression encoder
    $encoder = [System.Drawing.Imaging.Encoder]::Quality
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, $Quality)
    
    # Find JPEG encoder codec info
    $encoders = [System.Drawing.Imaging.ImageCodecInfo]::GetImageDecoders()
    $jpegCodec = $encoders | Where-Object { $_.FormatDescription -eq "JPEG" }
    
    $dest.Save($OutputPath, $jpegCodec, $encoderParams)
    
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
}

$imagesDir = "C:\Users\Ubu\.gemini\antigravity\scratch\MealMate\public\images"
Resize-Image -InputPath "$imagesDir\spinach_feta_scramble.png" -OutputPath "$imagesDir\spinach_feta_scramble.jpg" -Width 250 -Quality 50
Resize-Image -InputPath "$imagesDir\chicken_spinach_wrap.png" -OutputPath "$imagesDir\chicken_spinach_wrap.jpg" -Width 250 -Quality 50
Resize-Image -InputPath "$imagesDir\grilled_chicken_zucchini.png" -OutputPath "$imagesDir\grilled_chicken_zucchini.jpg" -Width 250 -Quality 50

Write-Output "Image compression completed successfully."
