# Stop any existing instances first
$existing = Get-CimInstance Win32_Process -Filter "name = 'powershell.exe' and CommandLine like '%auto_approve_agent.ps1%'"
if ($existing) {
    Write-Host "Stopping existing Auto-Approve Agent process(es)..."
    foreach ($proc in $existing) {
        Stop-Process -Id $proc.ProcessId -Force
    }
}

# Start the agent in the background (hidden window)
$agentPath = "C:\Users\Ubu\.gemini\antigravity\scratch\auto_approve_agent.ps1"
Write-Host "Starting Auto-Approve Agent in the background..."
Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$agentPath`"" -WindowStyle Hidden

Write-Host "Auto-Approve Agent started successfully!"
