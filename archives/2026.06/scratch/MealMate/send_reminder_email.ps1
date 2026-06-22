# MealMate Email Notification Utility (Agentmail Edition)
# Usage: .\send_reminder_email.ps1 -Type [WeeklyReminder|Skip|LowStockCheck|StockpileAudit] [-Items "garlic_powder, oregano"] [-Details "item details"]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("WeeklyReminder", "Skip", "LowStockCheck", "StockpileAudit")]
    [string]$Type,
    
    [string]$Items = "",
    [string]$Details = ""
)

$repoPath = "C:\Users\Ubu\.gemini\antigravity\scratch\MealMate"
$envPath = "$repoPath\.env"

function Log-Message($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$timestamp] $msg"
    Write-Output $formatted
    Add-Content -Path "$repoPath\reminder_email.log" -Value $formatted
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

$emails = @("michaelkenna3@gmail.com", "mlawren18@gmail.com")

# 2. Build email content depending on Type
$subject = ""
$body = ""

switch ($Type) {
    "WeeklyReminder" {
        $subject = "Antigravity - Reminder: Weekly Catered Menu Approval Required"
        $body = @"
<html>
<body style="font-family: Arial, sans-serif; background-color: #0b0c10; color: #c5c6c7; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1f2833; padding: 30px; border-radius: 8px; border-top: 4px solid #66fcf1;">
        <h2 style="color: #66fcf1; text-align: center;">Weekly Menu Reminder</h2>
        <p>Good afternoon! We haven't received your approval for this week's catered menu yet.</p>
        <p>Please reply to this email with <strong>Approve</strong>, <strong>Yes</strong>, or <strong>OK</strong> to approve the menu and trigger the grocery delivery cart build.</p>
        <p style="color: #ff5555; font-size: 13px;">Note: If no response is received by 5:00 PM today, this week's meals will be automatically skipped.</p>
        <hr style="border: 0; border-top: 1px solid #455a64; margin: 20px 0;">
        <p style="font-size: 11px; color: #8892b0; text-align: center;">Generated autonomously by Antigravity MealMate via Agentmail.</p>
    </div>
</body>
</html>
"@
    }
    "Skip" {
        $subject = "Antigravity - Weekly Catered Menu Skipped"
        $body = @"
<html>
<body style="font-family: Arial, sans-serif; background-color: #0b0c10; color: #c5c6c7; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1f2833; padding: 30px; border-radius: 8px; border-top: 4px solid #ff5555;">
        <h2 style="color: #ff5555; text-align: center;">Weekly Meals Skipped</h2>
        <p>Hello. No menu approval was received by the 5:00 PM Sunday deadline.</p>
        <p>This week's catered meals and automated grocery orders have been <strong>skipped</strong>. We will contact you next Sunday with the new menu proposal.</p>
        <hr style="border: 0; border-top: 1px solid #455a64; margin: 20px 0;">
        <p style="font-size: 11px; color: #8892b0; text-align: center;">Generated autonomously by Antigravity MealMate via Agentmail.</p>
    </div>
</body>
</html>
"@
    }
    "LowStockCheck" {
        $subject = "Antigravity - Stockpile Verification Required"
        $itemList = $Items.Split(",") | ForEach-Object { "<li><strong>$($_ -replace '_', ' ' | Get-Culture | % { $_.TextInfo.ToTitleCase($_) })</strong> (low or out of stock)</li>" }
        $body = @"
<html>
<body style="font-family: Arial, sans-serif; background-color: #0b0c10; color: #c5c6c7; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1f2833; padding: 30px; border-radius: 8px; border-top: 4px solid #f1c40f;">
        <h2 style="color: #f1c40f; text-align: center;">Stockpile Verification Needed</h2>
        <p>Hello! Our records show we are running low on or out of the following ingredients needed for your approved menu:</p>
        <ul>
            $($itemList -join "")
        </ul>
        <p>Please reply directly to this email to confirm if we need to purchase them. Use the format:</p>
        <pre style="background-color: #0b0c10; padding: 15px; border-radius: 4px; color: #66fcf1; font-weight: bold;">
BUY $($Items.Split(",")[0].Replace('_',' '))
KEEP $($Items.Split(",")[-1].Replace('_',' '))
        </pre>
        <p>Once you confirm, we will build your optimized grocery delivery cart.</p>
        <hr style="border: 0; border-top: 1px solid #455a64; margin: 20px 0;">
        <p style="font-size: 11px; color: #8892b0; text-align: center;">Generated autonomously by Antigravity MealMate via Agentmail.</p>
    </div>
</body>
</html>
"@
    }
    "StockpileAudit" {
        $subject = "Antigravity - Monthly Stockpile Check-Up"
        
        $stockpileHtml = "<h3>Stockpile Status</h3>"
        if (Test-Path "$repoPath\stockpile.json") {
            $stockpile = Get-Content "$repoPath\stockpile.json" -Raw | ConvertFrom-Json
            foreach ($category in $stockpile.psobject.Properties.Name) {
                $stockpileHtml += "<h4 style='color: #66fcf1; text-transform: uppercase;'>$category</h4><ul>"
                foreach ($itemKey in $stockpile.$category.psobject.Properties.Name) {
                    $item = $stockpile.$category.$itemKey
                    $statusColor = if ($item.status -eq "unknown" -or $item.quantity -le $item.threshold) { "#ff5555" } else { "#55ff55" }
                    $stockpileHtml += "<li><strong>$($item.name)</strong>: $($item.quantity) $($item.unit) (<span style='color:$statusColor;'>Status: $($item.status)</span>)</li>"
                }
                $stockpileHtml += "</ul>"
            }
        }

        $body = @"
<html>
<body style="font-family: Arial, sans-serif; background-color: #0b0c10; color: #c5c6c7; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1f2833; padding: 30px; border-radius: 8px; border-top: 4px solid #9b59b6;">
        <h2 style="color: #9b59b6; text-align: center;">Monthly Stockpile Audit</h2>
        <p>Good morning! It is the 10th of the month. It's time to check remaining volumes on household essentials.</p>
        <p>Please reply directly to this email with any quantity updates to keep our records accurate. For example:</p>
        <pre style="background-color: #0b0c10; padding: 15px; border-radius: 4px; color: #66fcf1; font-weight: bold;">
toilet paper: 12 rolls
dishwasher pods: 30
olive oil: 8 oz
        </pre>
        <hr style="border: 0; border-top: 1px solid #455a64; margin: 20px 0;">
        $stockpileHtml
        <hr style="border: 0; border-top: 1px solid #455a64; margin: 20px 0;">
        <p style="font-size: 11px; color: #8892b0; text-align: center;">Generated autonomously by Antigravity MealMate via Agentmail.</p>
    </div>
</body>
</html>
"@
    }
}

# 3. Send Email via Agentmail API
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type"  = "application/json"
}

$textFallback = $body -replace '<[^>]+>', '' # simple regex to strip tags for plain text fallback

$bodyJson = @{
    to = $emails
    subject = $subject
    html = $body
    text = $textFallback
} | ConvertTo-Json -Depth 5

Log-Message "Sending $Type email to recipients via Agentmail ($inboxId)..."
try {
    $uri = "https://api.agentmail.to/v0/inboxes/$inboxId/messages/send"
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $bodyJson -ContentType "application/json"
    Log-Message "Successfully sent $Type email via Agentmail. Message ID: $($response.message_id)"
} catch {
    Log-Message "❌ Error sending $Type email via Agentmail. Error: $_"
}
