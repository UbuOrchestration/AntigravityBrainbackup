# MealMate Task Scheduler Registration Script
# Registers:
# 1. UbuWeeklyMenu: Hourly on Sundays 10AM - 5PM, executing manage_menu_flow.ps1
# 2. UbuMonthlyStockpileCheck: On the 10th of every month at 10:00 AM, executing send_reminder_email.ps1 -Type StockpileAudit
# 3. UbuMealMateCleanup: On the 1st of every month at 12:00 AM, executing mealmate_cleanup.ps1

$repoPath = "C:\Users\Ubu\.gemini\antigravity\scratch\MealMate"

# 1. XML for Weekly Menu Flow Task
$weeklyXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <URI>\UbuWeeklyMenu</URI>
  </RegistrationInfo>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
    </Principal>
  </Principals>
  <Settings>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <IdleSettings>
      <Duration>PT10M</Duration>
      <WaitTimeout>PT1H</WaitTimeout>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <UseUnifiedSchedulingEngine>true</UseUnifiedSchedulingEngine>
  </Settings>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2026-06-20T10:00:00-04:00</StartBoundary>
      <ScheduleByWeek>
        <WeeksInterval>1</WeeksInterval>
        <DaysOfWeek>
          <Sunday />
        </DaysOfWeek>
      </ScheduleByWeek>
      <Repetition>
        <Interval>PT1H</Interval>
        <Duration>PT7H</Duration>
        <StopAtDurationEnd>false</StopAtDurationEnd>
      </Repetition>
    </CalendarTrigger>
  </Triggers>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-ExecutionPolicy Bypass -WindowStyle Hidden -File $repoPath\manage_menu_flow.ps1</Arguments>
    </Exec>
  </Actions>
</Task>
"@

# 2. XML for Monthly Stockpile Check Task
$monthlyXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <URI>\UbuMonthlyStockpileCheck</URI>
  </RegistrationInfo>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
    </Principal>
  </Principals>
  <Settings>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <IdleSettings>
      <Duration>PT10M</Duration>
      <WaitTimeout>PT1H</WaitTimeout>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <UseUnifiedSchedulingEngine>true</UseUnifiedSchedulingEngine>
  </Settings>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2026-06-20T10:00:00-04:00</StartBoundary>
      <ScheduleByMonth>
        <DaysOfMonth>
          <Day>10</Day>
        </DaysOfMonth>
        <Months>
          <January />
          <February />
          <March />
          <April />
          <May />
          <June />
          <July />
          <August />
          <September />
          <October />
          <November />
          <December />
        </Months>
      </ScheduleByMonth>
    </CalendarTrigger>
  </Triggers>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-ExecutionPolicy Bypass -WindowStyle Hidden -File $repoPath\send_reminder_email.ps1 -Type StockpileAudit</Arguments>
    </Exec>
  </Actions>
</Task>
"@

# 3. XML for Monthly MealMate Cleanup & Pruning Task
$cleanupXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <URI>\UbuMealMateCleanup</URI>
  </RegistrationInfo>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
    </Principal>
  </Principals>
  <Settings>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <IdleSettings>
      <Duration>PT10M</Duration>
      <WaitTimeout>PT1H</WaitTimeout>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <UseUnifiedSchedulingEngine>true</UseUnifiedSchedulingEngine>
  </Settings>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2026-07-01T00:00:00-04:00</StartBoundary>
      <ScheduleByMonth>
        <DaysOfMonth>
          <Day>1</Day>
        </DaysOfMonth>
        <Months>
          <January />
          <February />
          <March />
          <April />
          <May />
          <June />
          <July />
          <August />
          <September />
          <October />
          <November />
          <December />
        </Months>
      </ScheduleByMonth>
    </CalendarTrigger>
  </Triggers>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-ExecutionPolicy Bypass -WindowStyle Hidden -File $repoPath\mealmate_cleanup.ps1</Arguments>
    </Exec>
  </Actions>
</Task>
"@

Write-Output "Configuring Scheduled Tasks in Windows..."

try {
    # Re-register Weekly Menu task
    Register-ScheduledTask -Xml $weeklyXml -TaskName "UbuWeeklyMenu" -Force | Out-Null
    Write-Output "✅ Successfully updated UbuWeeklyMenu task."
    
    # Register Monthly Stockpile Check task
    Register-ScheduledTask -Xml $monthlyXml -TaskName "UbuMonthlyStockpileCheck" -Force | Out-Null
    Write-Output "✅ Successfully registered UbuMonthlyStockpileCheck task."

    # Register Monthly MealMate Cleanup task
    Register-ScheduledTask -Xml $cleanupXml -TaskName "UbuMealMateCleanup" -Force | Out-Null
    Write-Output "✅ Successfully registered UbuMealMateCleanup task."
} catch {
    Write-Output "❌ Error registering scheduled tasks: $_"
}
