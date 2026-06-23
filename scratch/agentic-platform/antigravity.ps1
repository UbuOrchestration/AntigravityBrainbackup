# Antigravity Command Line Interface (CLI)
# Usage: .\antigravity.ps1 <command> [args]

param(
    [string]$Command,
    [string]$SubCommand,
    [string]$Arg
)

$backendUrl = "http://localhost:3001"

if ([string]::IsNullOrEmpty($Command)) {
    Write-Output "Antigravity Agentic Platform CLI"
    Write-Output "Usage:"
    Write-Output "  .\antigravity.ps1 agents list                     - List cluster status"
    Write-Output "  .\antigravity.ps1 cron run memory-archiver        - Trigger a manual backup push"
    Write-Output "  .\antigravity.ps1 wiki search <query>             - Search the Doc wiki"
    Write-Output "  .\antigravity.ps1 news scrape                     - Scrape latest feeds"
    Write-Output "  .\antigravity.ps1 news digest                     - Generate and email digest"
    exit 0
}

switch ($Command.ToLower()) {
    "agents" {
        if ($SubCommand -eq "list") {
            try {
                $res = Invoke-RestMethod -Uri "$backendUrl/api/agents" -Method Get -UseBasicParsing
                $res | Format-Table -Property Name, Role, Status, @{Label="CPU (MHz)"; Expression={$_.cpuLimitMhz}}, @{Label="Memory (MiB)"; Expression={$_.memoryLimitMib}}, LastAction
            } catch {
                Write-Output "❌ Error: Could not connect to backend server. Make sure the server is running on port 3001."
            }
        } else {
            Write-Output "Unknown subcommand. Usage: .\antigravity.ps1 agents list"
        }
    }
    "cron" {
        if ($SubCommand -eq "run" -and $Arg -eq "memory-archiver") {
            Write-Output "Syncing conversation logs to remote repository..."
            try {
                $res = Invoke-RestMethod -Uri "$backendUrl/api/backup/trigger" -Method Post -UseBasicParsing
                Write-Output $res.logSnippet
            } catch {
                Write-Output "❌ Error triggering backup."
            }
        } else {
            Write-Output "Unknown subcommand. Usage: .\antigravity.ps1 cron run memory-archiver"
        }
    }
    "news" {
        if ($SubCommand -eq "scrape") {
            Write-Output "Scraping latest AI news feeds..."
            try {
                $body = @{ task = "news-scrape" } | ConvertTo-Json
                $res = Invoke-RestMethod -Uri "$backendUrl/api/hivemind/trigger" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
                Write-Output "✅ News scrape completed."
            } catch {
                Write-Output "❌ Error triggering news scrape."
            }
        } elseif ($SubCommand -eq "digest") {
            Write-Output "Generating and sending daily AI news digest..."
            try {
                $body = @{ task = "news-digest" } | ConvertTo-Json
                $res = Invoke-RestMethod -Uri "$backendUrl/api/hivemind/trigger" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
                Write-Output "✅ News briefing sent successfully."
            } catch {
                Write-Output "❌ Error triggering news briefing."
            }
        } else {
            Write-Output "Unknown subcommand. Usage:"
            Write-Output "  .\antigravity.ps1 news scrape                    - Scrape latest feeds"
            Write-Output "  .\antigravity.ps1 news digest                    - Generate and email digest"
        }
    }
    "wiki" {
        if ($SubCommand -eq "search" -and ![string]::IsNullOrEmpty($Arg)) {
            Write-Output "Searching wiki docs for '$Arg'..."
            try {
                $body = @{ query = $Arg } | ConvertTo-Json
                $res = Invoke-RestMethod -Uri "$backendUrl/api/docs/search" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
                foreach ($doc in $res) {
                    Write-Output "----------------------------------------"
                    Write-Output "Title: $($doc.title) [$($doc.category)]"
                    Write-Output "Content: $($doc.content)"
                }
                Write-Output "----------------------------------------"
            } catch {
                Write-Output "❌ Error querying docs."
            }
        } else {
            Write-Output "Usage: .\antigravity.ps1 wiki search <query>"
        }
    }
    default {
        Write-Output "Unknown command: $Command"
    }
}
