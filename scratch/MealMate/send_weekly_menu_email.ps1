# MealMate Weekly Menu Emailer (Agentmail Edition)
# Reads menu_status.json and emails it to recipients via Agentmail API with inline dish photos

$repoPath = "C:\Users\Ubu\.gemini\antigravity\scratch\MealMate"
$envPath = "$repoPath\.env"
$menuPath = "$repoPath\menu_status.json"
$logPath = "$repoPath\weekly_menu.log"
$imagesDir = "C:\Users\Ubu\.gemini\antigravity\scratch\agentic-platform\images"

function Log-Message($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$timestamp] $msg"
    Write-Output $formatted
    Add-Content -Path $logPath -Value $formatted
}

if (!(Test-Path $menuPath)) {
    Log-Message "❌ Error: menu_status.json not found."
    exit 1
}

$menuStatus = Get-Content $menuPath -Raw | ConvertFrom-Json
$menu = $menuStatus.menu

if ($null -eq $menu) {
    Log-Message "❌ Error: No menu data available in menu_status.json."
    exit 1
}

# 1. Load Agentmail credentials
$apiKey = ""
$inboxId = ""
if (Test-Path $envPath) {
    Get-Content $envPath | Foreach-Object {
        if ($_ -match "^AGENTMAIL_API_KEY=(.*)") { $apiKey = $Matches[1].Trim() }
        if ($_ -match "^AGENTMAIL_INBOX_ID=(.*)") { $inboxId = $Matches[1].Trim() }
    }
}

if ([string]::IsNullOrEmpty($apiKey) -or [string]::IsNullOrEmpty($inboxId)) {
    Log-Message "❌ Error: Agentmail credentials not found in .env"
    exit 1
}

# 2. Build HTML Body with inline images referenced by cid
$breakfastHtml = @"
<div style="margin-bottom: 25px; background-color: #1a2238; padding: 20px; border-radius: 8px; border-left: 4px solid #66fcf1;">
    <h3 style="color: #66fcf1; margin-top: 0;">🍳 Breakfast: $($menu.breakfast.name)</h3>
    <img src="cid:$($menu.breakfast.image)" style="width: 100%; max-width: 500px; border-radius: 8px; margin-bottom: 15px; display: block;" alt="$($menu.breakfast.name)">
    <p style="margin: 5px 0;"><em>Ingredients: $($menu.breakfast.ingredients | ForEach-Object { $_.name } -join ", ")</em></p>
    <p style="margin: 5px 0; line-height: 1.5;"><strong>Instructions:</strong> $($menu.breakfast.instructions)</p>
</div>
"@

$lunchHtml = @"
<div style="margin-bottom: 25px; background-color: #1a2238; padding: 20px; border-radius: 8px; border-left: 4px solid #66fcf1;">
    <h3 style="color: #66fcf1; margin-top: 0;">🥗 Lunch: $($menu.lunch.name)</h3>
    <img src="cid:$($menu.lunch.image)" style="width: 100%; max-width: 500px; border-radius: 8px; margin-bottom: 15px; display: block;" alt="$($menu.lunch.name)">
    <p style="margin: 5px 0;"><em>Ingredients: $($menu.lunch.ingredients | ForEach-Object { $_.name } -join ", ")</em></p>
    <p style="margin: 5px 0; line-height: 1.5;"><strong>Instructions:</strong> $($menu.lunch.instructions)</p>
</div>
"@

$dinnersHtml = ""
foreach ($dinner in $menu.dinners) {
    $dinnersHtml += @"
<div style="margin-bottom: 25px; background-color: #1a2238; padding: 20px; border-radius: 8px; border-left: 4px solid #9b59b6;">
    <h3 style="color: #9b59b6; margin-top: 0;">🍽️ Dinner ($($dinner.day)): $($dinner.name)</h3>
    <img src="cid:$($dinner.image)" style="width: 100%; max-width: 500px; border-radius: 8px; margin-bottom: 15px; display: block;" alt="$($dinner.name)">
    <p style="margin: 5px 0;"><em>Ingredients: $($dinner.ingredients | ForEach-Object { $_.name } -join ", ")</em></p>
    <p style="margin: 5px 0; line-height: 1.5;"><strong>Instructions:</strong> $($dinner.instructions)</p>
</div>
"@
}

$shoppingHtml = "<ul>"
foreach ($key in $menu.shoppingList.psobject.Properties.Name) {
    $item = $menu.shoppingList.$key
    $bogoText = if ($item.bogo) { " <span style='color: #2ecc71; font-weight: bold;'>[BOGO Deal!]</span>" } else { "" }
    $shoppingHtml += "<li><strong>$($item.name)</strong>: $($item.amount) $($item.unit) — Buy at <strong>$($item.store)</strong> (`$$($item.price)/$($item.unit) | Total: `$$($item.total))$bogoText</li>"
}
$shoppingHtml += "</ul>"

$htmlBody = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', sans-serif; background-color: #0b0c10; color: #c5c6c7; margin: 0; padding: 20px; }
        .container { max-width: 650px; margin: 0 auto; background-color: #1f2833; padding: 40px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        .header { text-align: center; border-bottom: 2px solid #66fcf1; padding-bottom: 15px; margin-bottom: 25px; }
        h1 { color: #66fcf1; margin: 0; font-size: 22px; letter-spacing: 2px; }
        h2 { color: #66fcf1; font-size: 18px; border-bottom: 1px solid #455a64; padding-bottom: 5px; margin-top: 30px; }
        p, li { line-height: 1.6; }
        ul { padding-left: 20px; }
        .footer { margin-top: 40px; border-top: 1px solid #455a64; padding-top: 15px; text-align: center; font-size: 11px; color: #8892b0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ANTIGRAVITY WEEKLY PLAN</h1>
        </div>
        <p>Good morning! Here is your custom weekly menu and optimized shopping list. Prices are compared and optimized across grocery stores for Zip 32825.</p>
        
        <h2>📅 Weekly Coordinated Menu ($($menu.season) Season)</h2>
        <p>Cuisine Style: <strong>$($menu.cuisine)</strong>. Modified for any allergies or dietary exclusions.</p>
        
        $breakfastHtml
        $lunchHtml
        $dinnersHtml
        
        <h2>🛒 Optimized Grocery Shopping List</h2>
        $shoppingHtml
        
        <p style="margin-top: 30px; background-color: #2c3e50; padding: 15px; border-radius: 6px; border-left: 4px solid #f1c40f;">
            <strong>Action Required:</strong> Please reply directly to this email with <strong>Approve</strong>, <strong>Yes</strong>, or <strong>OK</strong> to confirm. We will automatically inventory your pantry and assemble your online checkout cart!
        </p>

        <div class="footer">
            Generated autonomously by Antigravity MealMate via Agentmail.
        </div>
    </div>
</body>
</html>
"@

# 3. Collect and Base64 Encode Images for Attachments
$attachments = @()
$usedImages = @()
if ($menu.breakfast.image) { $usedImages += $menu.breakfast.image }
if ($menu.lunch.image) { $usedImages += $menu.lunch.image }
foreach ($dinner in $menu.dinners) {
    if ($dinner.image) { $usedImages += $dinner.image }
}

$uniqueImages = $usedImages | Select-Object -Unique

foreach ($imgName in $uniqueImages) {
    $imgPath = Join-Path $imagesDir $imgName
    if (Test-Path $imgPath) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($imgPath)
            $base64 = [System.Convert]::ToBase64String($bytes)
            $attachments += @{
                content = $base64
                filename = $imgName
                content_type = "image/png"
            }
        } catch {
            Log-Message "Warning: Failed to encode image $imgPath. $_"
        }
    } else {
        Log-Message "Warning: Image not found at $imgPath"
    }
}

$emails = @("michaelkenna3@gmail.com", "mlawren18@gmail.com")
$subject = "Antigravity - Weekly Catered Menu & Coordinated Shopping List"

# Send Email via Agentmail API
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type"  = "application/json"
}

$textFallback = $htmlBody -replace '<[^>]+>', '' # simple regex to strip tags for plain text fallback

$bodyJson = @{
    to = $emails
    subject = $subject
    html = $htmlBody
    text = $textFallback
    attachments = $attachments
} | ConvertTo-Json -Depth 5

Log-Message "Sending weekly menu with $(($attachments.Count)) photos via Agentmail ($inboxId)..."
try {
    $uri = "https://api.agentmail.to/v0/inboxes/$inboxId/messages/send"
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $bodyJson -ContentType "application/json"
    Log-Message "Successfully sent weekly menu via Agentmail. Message ID: $($response.message_id)"
} catch {
    Log-Message "❌ Error: Failed to send weekly menu via Agentmail. Error: $_"
}
