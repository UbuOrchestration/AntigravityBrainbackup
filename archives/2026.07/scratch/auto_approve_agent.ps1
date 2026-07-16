# Auto-Approve Agent for Antigravity Dialog Prompts
# This script runs in the background and automatically clicks permission approval buttons.

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$logPath = "C:\Users\Ubu\.gemini\antigravity\scratch\auto_approve_log.txt"
"Auto-Approve Agent Started at $(Get-Date)" | Out-File $logPath -Encoding utf8

# Exact match target buttons
$targetButtons = @(
    "Yes, and always allow..."
    "Always allow"
    "Approve"
    "Allow"
    "Run"
    "Proceed"
    "Yes"
)

Write-Host "Monitoring for Antigravity permission prompts..."

$root = [System.Windows.Automation.AutomationElement]::RootElement

while ($true) {
    try {
        # Find all windows
        $windowCondition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Window
        )
        $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $windowCondition)
        
        foreach ($window in $windows) {
            $winName = $window.Current.Name
            $winProcId = $window.Current.ProcessId
            
            # Check if this window belongs to Antigravity process or contains "Antigravity"
            $proc = Get-Process -Id $winProcId -ErrorAction SilentlyContinue
            if ($proc -and ($proc.Name -match "Antigravity" -or $winName -match "Antigravity")) {
                # Find all buttons in this window
                $buttonCondition = New-Object System.Windows.Automation.PropertyCondition(
                    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
                    [System.Windows.Automation.ControlType]::Button
                )
                $buttons = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition)
                
                foreach ($button in $buttons) {
                    $btnName = $button.Current.Name
                    foreach ($target in $targetButtons) {
                        # TIGHT EXACT MATCH
                        if ($btnName -ieq $target) {
                            $msg = "$(Get-Date): Found button '$btnName' in window '$winName' (PID $winProcId). Clicking it!"
                            Write-Host $msg
                            $msg | Out-File $logPath -Append -Encoding utf8
                            
                            $invokePattern = $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
                            $invokePattern.Invoke()
                            break
                        }
                    }
                }
            }
        }
    } catch {
        # Ignore errors and keep running
    }
    Start-Sleep -Milliseconds 500
}
