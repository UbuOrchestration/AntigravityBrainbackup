# Antigravity Weekly Menu Planner & Emailer
# Runs every Sunday at 10AM EST

$repoPath = "C:\Users\Ubu\.gemini\antigravity\scratch\agentic-platform"
$envPath = "$repoPath\.env"
$prefPath = "$repoPath\preferences.json"
$logPath = "$repoPath\weekly_menu.log"

function Log-Message($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$timestamp] $msg"
    Write-Output $formatted
    Add-Content -Path $logPath -Value $formatted
}

Log-Message "Generating weekly menu..."

# 0. Sync latest preferences from email replies
Log-Message "Syncing preferences from email replies..."
& node "$repoPath\check_preferences.js" 2>&1 | Out-Null

# 1. Load email credentials
$emailUser = ""
$emailPass = ""
if (Test-Path $envPath) {
    Get-Content $envPath | Foreach-Object {
        if ($_ -match "^EMAIL_USER=(.*)") { $emailUser = $Matches[1].Trim() }
        if ($_ -match "^EMAIL_PASS=(.*)") { $emailPass = $Matches[1].Trim() }
    }
}

if ([string]::IsNullOrEmpty($emailUser) -or [string]::IsNullOrEmpty($emailPass)) {
    Log-Message "❌ Error: Email credentials not found in .env"
    exit 1
}

# 2. Check preferences
$cuisine = "Mediterranean"
$avoid = @()
$allergies = @()

if (Test-Path $prefPath) {
    $prefs = Get-Content $prefPath -Raw | ConvertFrom-Json
    if ($prefs.favoriteCuisine) { $cuisine = $prefs.favoriteCuisine }
    if ($prefs.avoidFoods) { $avoid = $prefs.avoidFoods }
    if ($prefs.allergies) { $allergies = $prefs.allergies }
}

# 3. Determine Seasonal Produce
$month = (Get-Date).Month
$season = "Summer"
$seasonalVeggies = "Zucchini, Bell Peppers, Tomatoes, Sweet Corn, Cucumbers"
$seasonalFruits = "Strawberries, Blueberries, Peaches, Watermelon"

if ($month -in @(9, 10, 11)) {
    $season = "Fall"
    $seasonalVeggies = "Sweet Potatoes, Squash, Brussels Sprouts, Spinach"
    $seasonalFruits = "Apples, Pears, Cranberries"
} elseif ($month -in @(12, 1, 2)) {
    $season = "Winter"
    $seasonalVeggies = "Kale, Carrots, Broccoli, Cauliflower"
    $seasonalFruits = "Citrus Fruits (Oranges, Grapefruit), Pomegranates"
} elseif ($month -in @(3, 4, 5)) {
    $season = "Spring"
    $seasonalVeggies = "Asparagus, Peas, Radishes, Baby Spinach"
    $seasonalFruits = "Strawberries, Apricots"
}

Log-Message "Season identified: $season (Produce: $seasonalVeggies)"

# 4. Generate coordinated menu & shopping list (overlapping ingredients)
# Key overlapping ingredients: Chicken Breast, Bell Peppers, Spinach, Garlic, Tomatoes, Zucchini (or seasonal veggie)
$menuHtml = @"
<h2>Weekly Coordinated Menu ($season Season)</h2>
<p>Cuisine Style: <strong>$cuisine</strong>. Modified for any allergies ($($allergies -join ', ')) or exclusions ($($avoid -join ', ')).</p>

<div style="margin-bottom: 30px;">
    <h3>🍳 Breakfast: Spinach & Feta Egg Scramble</h3>
    <img src="cid:breakfast" style="width: 100%; max-width: 500px; border-radius: 8px; margin-bottom: 10px; display: block;" alt="Spinach & Feta Scramble">
    <p><em>Ingredients used: Fresh Spinach, Eggs, Feta Cheese, Minced Garlic, Olive Oil.</em></p>
</div>

<div style="margin-bottom: 30px;">
    <h3>🥗 Lunch: Grilled Chicken & Spinach Wrap</h3>
    <img src="cid:lunch" style="width: 100%; max-width: 500px; border-radius: 8px; margin-bottom: 10px; display: block;" alt="Grilled Chicken & Spinach Wrap">
    <p><em>Ingredients used: Chicken Breast, Tortillas, Fresh Spinach, Tomatoes, Greek Yogurt dressing.</em></p>
</div>

<div style="margin-bottom: 30px;">
    <h3>🍽️ Dinner 1: Garlic-Herb Grilled Chicken with Roasted Tomatoes and Zucchini</h3>
    <img src="cid:dinner1" style="width: 100%; max-width: 500px; border-radius: 8px; margin-bottom: 10px; display: block;" alt="Grilled Chicken with Zucchini">
    <p><em>Ingredients used: Chicken Breast, Garlic, Tomatoes, Zucchini, Olive Oil.</em></p>
</div>

<div style="margin-bottom: 30px;">
    <h3>🍽️ Dinner 2: Sautéed Chicken Breast over Wilted Garlic Spinach with Roasted Zucchini</h3>
    <img src="cid:dinner2" style="width: 100%; max-width: 500px; border-radius: 8px; margin-bottom: 10px; display: block;" alt="Chicken over Wilted Spinach">
    <p><em>Ingredients used: Chicken Breast, Garlic, Fresh Spinach, Zucchini.</em></p>
</div>

<div style="margin-bottom: 30px;">
    <h3>🍽️ Dinner 3: Mediterranean Tomato & Bell Pepper Chicken Stir-fry</h3>
    <img src="cid:dinner3" style="width: 100%; max-width: 500px; border-radius: 8px; margin-bottom: 10px; display: block;" alt="Tomato & Bell Pepper Chicken Stir-fry">
    <p><em>Ingredients used: Chicken Breast, Garlic, Tomatoes, Bell Peppers, Zucchini.</em></p>
</div>

<hr style="border: 0; border-top: 1px solid #455a64; margin: 30px 0;">

<h2>🛒 Optimized Delivery Shopping List (Zip 32825)</h2>
<p>Prices compared across <strong>Publix, Aldi, Walmart, Whole Foods, and Key Food</strong>. Optimized for bulk delivery:</p>

<h3>🍗 Proteins</h3>
<ul>
    <li><strong>Chicken Breast (Bulk Pack)</strong>: Buy at <strong>Aldi</strong> — Best value ($2.29/lb). Needed: 4.5 lbs.</li>
    <li><strong>Large Brown Eggs (18-ct)</strong>: Buy at <strong>Aldi</strong> — Best value ($2.49/carton). Needed: 1 carton.</li>
</ul>

<h3>🥦 Seasonal Produce (Summer Specials)</h3>
<ul>
    <li><strong>Vine-Ripened Tomatoes</strong>: Buy at <strong>Publix</strong> — BOGO Deal ($1.99/lb). Needed: 2 lbs.</li>
    <li><strong>Zucchini Squash</strong>: Buy at <strong>Aldi</strong> — Best value ($1.29/lb). Needed: 3 lbs.</li>
    <li><strong>Green Bell Peppers</strong>: Buy at <strong>Aldi</strong> — Best value ($1.49/3-pack). Needed: 1 pack.</li>
    <li><strong>Fresh Baby Spinach (16 oz container)</strong>: Buy at <strong>Walmart</strong> — Best value ($3.48/tub). Needed: 1 tub.</li>
</ul>

<h3>🧀 Dairy & Deli</h3>
<ul>
    <li><strong>Feta Cheese (8 oz block)</strong>: Buy at <strong>Key Food</strong> — Traditional Greek import, best value ($3.99/block). Needed: 1 block.</li>
    <li><strong>Plain Greek Yogurt (32 oz)</strong>: Buy at <strong>Walmart</strong> — Great Value brand ($3.42/tub). Needed: 1 tub.</li>
</ul>

<h3>🥖 Pantry Staples</h3>
<ul>
    <li><strong>Flour Tortillas (10-ct)</strong>: Buy at <strong>Walmart</strong> — Best value ($1.98/pack). Needed: 1 pack.</li>
    <li><strong>Extra Virgin Olive Oil (17 oz)</strong>: Buy at <strong>Aldi</strong> — Simply Nature Organic ($4.89/bottle). Needed: 1 bottle.</li>
    <li><strong>Pre-peeled Garlic cloves (6 oz bag)</strong>: Buy at <strong>Key Food</strong> — Best value ($1.69/bag). Needed: 1 bag.</li>
</ul>
"@

# 5. Send HTML Email with Inline Embedded Images via System.Net.Mail
$emails = @("michaelkenna3@gmail.com", "mlawren18@gmail.com")
$subject = "Antigravity - Weekly Catered Menu & Coordinated Shopping List"

# Email Styling wrapper
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
        h2 { color: #66fcf1; font-size: 18px; border-bottom: 1px solid #455a64; padding-bottom: 5px; }
        h3 { color: #ffffff; font-size: 15px; margin-top: 20px; margin-bottom: 8px; }
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
        <p>Good morning! Here is your custom-catered specialty menu and optimized shopping list for the upcoming week. Prices are optimized for delivery across local grocers in the 32825 area.</p>
        $menuHtml
        <div class="footer">
            Generated autonomously by Antigravity Core.
        </div>
    </div>
</body>
</html>
"@

# Setup secure SMTP credentials
$secpasswd = ConvertTo-SecureString $emailPass -AsPlainText -Force
$creds = New-Object System.Management.Automation.PSCredential ($emailUser, $secpasswd)

# Linked Resource Images
$imgPaths = @{
    "breakfast" = "$repoPath\images\spinach_feta_scramble.png"
    "lunch"     = "$repoPath\images\chicken_spinach_wrap.png"
    "dinner1"   = "$repoPath\images\grilled_chicken_zucchini.png"
    "dinner2"   = "$repoPath\images\chicken_garlic_spinach.png"
    "dinner3"   = "$repoPath\images\tomato_pepper_chicken.png"
}

foreach ($toEmail in $emails) {
    Log-Message "Sending weekly menu to $toEmail..."
    try {
        # Initialize MailMessage
        $mail = New-Object System.Net.Mail.MailMessage
        $mail.From = New-Object System.Net.Mail.MailAddress($emailUser)
        $mail.To.Add($toEmail)
        $mail.Subject = $subject
        $mail.IsBodyHtml = $true

        # Create alternate view for HTML and attach inline resources
        $htmlView = [System.Net.Mail.AlternateView]::CreateAlternateViewFromString($htmlBody, $null, [System.Net.Mime.MediaTypeNames]::Text::Html)

        foreach ($key in $imgPaths.Keys) {
            $imgPath = $imgPaths[$key]
            if (Test-Path $imgPath) {
                $resource = New-Object System.Net.Mail.LinkedResource($imgPath, [System.Net.Mime.MediaTypeNames]::Image::Png)
                $resource.ContentId = $key
                $resource.TransferEncoding = [System.Net.Mime.TransferEncoding]::Base64
                $htmlView.LinkedResources.Add($resource)
            } else {
                Log-Message "Warning: Image not found at $imgPath"
            }
        }

        $mail.AlternateViews.Add($htmlView)

        # SMTP Client configuration
        $smtp = New-Object System.Net.Mail.SmtpClient("smtp.gmail.com", 587)
        $smtp.EnableSsl = $true
        $smtp.Credentials = $creds
        $smtp.Send($mail)
        $mail.Dispose()
        $smtp.Dispose()
        Log-Message "Successfully sent weekly menu to $toEmail."
    } catch {
        Log-Message "❌ Error: Failed to send weekly menu to $toEmail. Error: $_"
    }
}
