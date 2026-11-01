# daily_scheduler.ps1
# Calculates a random delay between 0 and 120 minutes (10:00 AM - 12:00 PM window) then executes send_reminder.js

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$NodeScript = Join-Path $ProjectDir "engine\send_reminder.js"
$LogFile = Join-Path $ProjectDir "data\scheduler.log"

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$Timestamp] $Message" | Out-File -FilePath $LogFile -Append -Encoding utf8
}

Write-Log "Daily Scheduler triggered."

# Generate random delay in minutes (between 0 and 120 minutes)
$RandomMinutes = Get-Random -Minimum 0 -Maximum 121
$RandomSeconds = $RandomMinutes * 60

Write-Log "Selected random delay of $RandomMinutes minutes ($RandomSeconds seconds) within the 10:00 AM - 12:00 PM window."

# Wait for the randomized duration
Start-Sleep -Seconds $RandomSeconds

Write-Log "Random delay completed. Executing send_reminder.js..."

# Run node script
try {
    $Output = node $NodeScript 2>&1
    Write-Log "Execution output: $Output"
} catch {
    Write-Log "Error executing node script: $_"
}
