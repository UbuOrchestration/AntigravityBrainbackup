$action = New-ScheduledTaskAction -Execute 'node.exe' -Argument 'C:\Users\Ubu\.gemini\antigravity\scratch\baby-feeding-dashboard\generate_weekly_growth_report.js' -WorkingDirectory 'C:\Users\Ubu\.gemini\antigravity\scratch\baby-feeding-dashboard'
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 7:00PM
Register-ScheduledTask -TaskName 'UbuBbyFayeGrowthReport' -Action $action -Trigger $trigger -Description 'Automated Weekly Infant Growth & Feeding Breakdown Email' -Force
