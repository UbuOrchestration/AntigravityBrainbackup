# Cutting Edge News Agent Runner script
# Usage: .\run_news_agent.ps1 [scrape | digest]

param(
    [string]$Mode = "all"
)

$repoPath = "C:\Users\Ubu\.gemini\antigravity\scratch\agentic-platform"
$backendPath = "$repoPath\backend"
$scriptPath = "$backendPath\dist\dailyNewsAgent.js"
$logPath = "$repoPath\daily_news.log"

function Log-Message($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$timestamp] $msg"
    Write-Output $formatted
    Add-Content -Path $logPath -Value $formatted
}

Log-Message "Runner activated with Mode: $Mode"

# Check if dist files exist, if not compile
if (!(Test-Path $scriptPath)) {
    Log-Message "Backend script not compiled. Building typescript backend..."
    cd $backendPath
    & npm run build 2>&1 | Out-String | ForEach-Object { Log-Message $_ }
    cd $repoPath
}

# Resolve script arguments based on mode
$args = @()
if ($Mode -eq "scrape") {
    $args += "--scrape"
} elseif ($Mode -eq "digest" -or $Mode -eq "report") {
    $args += "--report"
}

Log-Message "Executing: node backend\dist\dailyNewsAgent.js $($args -join ' ')"

# Run Node script
& node "$scriptPath" $args 2>&1 | Out-String | ForEach-Object { Log-Message $_ }

Log-Message "Runner execution finished."
