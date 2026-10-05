# configure_commute_task.ps1
# Registers a Windows Scheduled Task "CuratedRomanceCommuteBriefing" to run at 5:30 PM every weekday (Monday through Friday)

$TaskName = "CuratedRomanceCommuteBriefing"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$NodeScript = Join-Path $ProjectDir "engine\send_commute_reminder.js"

Write-Host "Registering Windows Scheduled Task '$TaskName' to trigger Monday-Friday at 5:30 PM..."

$Action = New-ScheduledTaskAction -Execute "node.exe" -Argument "`"$NodeScript`""
$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At "5:30PM"
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Weekday commute home briefing at 5:30 PM to transition from work mode to partner mode."
    Write-Host "Successfully registered scheduled task '$TaskName'."
} catch {
    Write-Host "Failed to register scheduled task: $_"
}
