# MealMate Sunday Menu Flow Orchestrator
# Scheduled to run hourly on Sundays from 10:00 AM to 5:00 PM EST

param(
    [int]$Hour = (Get-Date).Hour
)

$repoPath = "C:\Users\Ubu\.gemini\antigravity\scratch\MealMate"
$statusPath = "$repoPath\menu_status.json"
$logPath = "$repoPath\weekly_menu.log"

function Log-Message($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$timestamp] [Hour $Hour] $msg"
    Write-Output $formatted
    Add-Content -Path $logPath -Value $formatted
}

Log-Message "Orchestrator activated."

# Helper to check menu status
function Get-Status {
    if (Test-Path $statusPath) {
        $statusJson = Get-Content $statusPath -Raw | ConvertFrom-Json
        return $statusJson.status
    }
    return "none"
}

$currentStatus = Get-Status
Log-Message "Current state of the week: $currentStatus"

if ($Hour -eq 10) {
    # Sunday 10:00 AM: Weekly menu reset, generate menu, email it
    Log-Message "Reseting weekly menu and generating a new menu..."
    & node "$repoPath\generate_menu.js" 2>&1 | Out-String | ForEach-Object { Log-Message $_ }
    
    Log-Message "Sending weekly menu email..."
    & node "$repoPath\send_menu_agentmail.js" 2>&1 | Out-String | ForEach-Object { Log-Message $_ }
    exit 0
}

# If it's between 11 AM and 4 PM (inclusive)
if ($Hour -ge 11 -and $Hour -le 16) {
    if ($currentStatus -eq "approved" -or $currentStatus -eq "cart_built" -or $currentStatus -eq "skipped") {
        Log-Message "State is '$currentStatus'. No further action needed."
        exit 0
    }
    
    Log-Message "Checking email inbox for user response..."
    & node "$repoPath\check_menu_response.js" 2>&1 | Out-String | ForEach-Object { Log-Message $_ }
    
    # Check status again after polling inbox
    $newStatus = Get-Status
    Log-Message "State after polling: $newStatus"
    
    if ($newStatus -eq "approved") {
        Log-Message "Approval detected! Processing approved menu..."
        & node "$repoPath\process_approved_menu.js" 2>&1 | Out-String | ForEach-Object { Log-Message $_ }
    } elseif ($newStatus -eq "pending") {
        if ($Hour -eq 15) {
            Log-Message "No approval detected. Sending 3 PM reminder email..."
            & powershell.exe -ExecutionPolicy Bypass -File "$repoPath\send_reminder_email.ps1" -Type WeeklyReminder 2>&1 | Out-String | ForEach-Object { Log-Message $_ }
        } else {
            Log-Message "No approval detected. Waiting until 3 PM to send reminder."
        }
    }
    exit 0
}

# Sunday 5:00 PM: Final check, skip if no approval
if ($Hour -ge 17) {
    if ($currentStatus -eq "approved" -or $currentStatus -eq "cart_built" -or $currentStatus -eq "skipped") {
        Log-Message "State is '$currentStatus'. No further action needed."
        exit 0
    }
    
    Log-Message "Final check. Checking inbox one last time..."
    & node "$repoPath\check_menu_response.js" 2>&1 | Out-String | ForEach-Object { Log-Message $_ }
    
    $newStatus = Get-Status
    if ($newStatus -eq "approved") {
        Log-Message "Approval detected at final check! Processing approved menu..."
        & node "$repoPath\process_approved_menu.js" 2>&1 | Out-String | ForEach-Object { Log-Message $_ }
    } else {
        Log-Message "No approval received by 5:00 PM. Ceasing contact and skipping weekly menu."
        
        # Update state to skipped
        if (Test-Path $statusPath) {
            $statusJson = Get-Content $statusPath -Raw | ConvertFrom-Json
            $statusJson.status = "skipped"
            $statusJson.lastUpdated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
            $statusJson | ConvertTo-Json -Depth 5 | Out-File $statusPath -Encoding utf8
        }
        
        Log-Message "Sending skipped notification email..."
        & powershell.exe -ExecutionPolicy Bypass -File "$repoPath\send_reminder_email.ps1" -Type Skip 2>&1 | Out-String | ForEach-Object { Log-Message $_ }
    }
    exit 0
}
