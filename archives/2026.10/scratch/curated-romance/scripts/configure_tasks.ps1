# configure_tasks.ps1
# Registers a Windows Scheduled Task "CuratedRomanceDailyBriefing" to run daily at 10:00 AM

$TaskName = "CuratedRomanceDailyBriefing"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PsScript = Join-Path $ScriptDir "daily_scheduler.ps1"

Write-Host "Registering Windows Scheduled Task '$TaskName' to trigger daily at 10:00 AM..."

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PsScript`""
$Trigger = New-ScheduledTaskTrigger -Daily -At "10:00AM"
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily Curated Romance partner briefing for stay-at-home mom partner."
    Write-Host "Successfully registered scheduled task '$TaskName'."
} catch {
    Write-Host "Failed to register scheduled task: $_"
}
