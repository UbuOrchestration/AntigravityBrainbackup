# configure_weekend_festivities_task.ps1
# Registers a Windows Scheduled Task "CuratedRomanceWeekendFestivities" to run every Friday at 1:00 PM

$TaskName = "CuratedRomanceWeekendFestivities"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$NodeScript = Join-Path $ProjectDir "engine\send_weekend_festivities.js"

Write-Host "Registering Windows Scheduled Task '$TaskName' to trigger every Friday at 1:00 PM..."

$Action = New-ScheduledTaskAction -Execute "node.exe" -Argument "`"$NodeScript`""
$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At "1:00PM"
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Scans and sends Orlando weekend festivities digest every Friday at 1:00 PM (child-friendly & outdoor events within 45 mins of 32825)."
    Write-Host "Successfully registered scheduled task '$TaskName'."
} catch {
    Write-Host "Failed to register scheduled task: $_"
}
