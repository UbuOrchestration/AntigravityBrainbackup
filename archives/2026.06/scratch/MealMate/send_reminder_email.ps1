# MealMate Email Notification Utility (Agentmail Edition - Plain Text)
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

$emails = @("michaelkenna3@gmail.com")

# 2. Build plain text email content depending on Type
$subject = ""
$body = ""

switch ($Type) {
    "WeeklyReminder" {
        $subject = "Antigravity - Reminder: Weekly Catered Menu Approval Required"
        $body = @"
WEEKLY MENU REMINDER

Good afternoon! We haven't received your approval for this week's catered menu yet.

Please reply directly to this email with "Approve", "Yes", or "OK" to approve the menu and trigger the grocery cart build.

Note: If no response is received by 5:00 PM today, this week's meals will be automatically skipped.

--------------------------------------------------
Sent autonomously by Antigravity MealMate via Agentmail.
"@
    }
    "Skip" {
        $subject = "Antigravity - Weekly Catered Menu Skipped"
        $body = @"
WEEKLY MEALS SKIPPED

Hello. No menu approval was received by the 5:00 PM Sunday deadline.

This week's catered meals and automated grocery orders have been skipped. We will contact you next Sunday with the new weekly menu proposal.

--------------------------------------------------
Sent autonomously by Antigravity MealMate via Agentmail.
"@
    }
    "LowStockCheck" {
        $subject = "Antigravity - Stockpile Verification Required"
        
        $itemListText = ""
        foreach ($item in $Items.Split(",")) {
            $cleanedItem = $item.Replace('_', ' ')
            $itemListText += "- $cleanedItem (low or out of stock)`n"
        }

        $body = @"
STOCKPILE VERIFICATION NEEDED

Hello! Our records show we are running low on or out of the following ingredients needed for your approved menu:

$itemListText
Please reply directly to this email to confirm if we need to purchase them. Use this format:

BUY $($Items.Split(",")[0].Replace('_',' '))
KEEP $($Items.Split(",")[-1].Replace('_',' '))

Once you confirm, we will build your optimized online grocery delivery cart.

--------------------------------------------------
Sent autonomously by Antigravity MealMate via Agentmail.
"@
    }
    "StockpileAudit" {
        $subject = "Antigravity - Monthly Stockpile Check-Up"
        
        $stockpileText = ""
        if (Test-Path "$repoPath\stockpile.json") {
            $stockpile = Get-Content "$repoPath\stockpile.json" -Raw | ConvertFrom-Json
            foreach ($category in $stockpile.psobject.Properties.Name) {
                $stockpileText += "`n=== $($category.ToUpper()) ===`n"
                foreach ($itemKey in $stockpile.$category.psobject.Properties.Name) {
                    $item = $stockpile.$category.$itemKey
                    $stockpileText += "- $($item.name): $($item.quantity) $($item.unit) (Status: $($item.status))`n"
                }
            }
        }

        $body = @"
MONTHLY STOCKPILE AUDIT

Good morning! It is the 10th of the month. It's time to check remaining volumes on household essentials.

Please reply directly to this email with any quantity updates to keep our records accurate. For example:

toilet paper: 12 rolls
dishwasher pods: 30
olive oil: 8 oz

--------------------------------------------------
CURRENT STOCKPILE STATUS:
$stockpileText
--------------------------------------------------
Sent autonomously by Antigravity MealMate via Agentmail.
"@
    }
}

# 3. Send Email via Agentmail API (Plain Text Mode)
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type"  = "application/json"
}

$bodyJson = @{
    to = $emails
    subject = $subject
    text = $body
} | ConvertTo-Json -Depth 5

Log-Message "Sending plain text $Type email to recipients via Agentmail ($inboxId)..."
try {
    $uri = "https://api.agentmail.to/v0/inboxes/$inboxId/messages/send"
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $bodyJson -ContentType "application/json"
    Log-Message "Successfully sent $Type email via Agentmail. Message ID: $($response.message_id)"
} catch {
    Log-Message "❌ Error sending $Type email via Agentmail. Error: $_"
}
