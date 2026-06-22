# Antigravity Automated Hourly Backup Script
# Owner: Ibi (Memory Retainer & Archiver)

$env:GIT_TERMINAL_PROMPT = "0"
$env:GCM_INTERACTIVE = "never"

$gitExe = "C:\Users\Ubu\.gemini\antigravity\scratch\PortableGit\cmd\git.exe"
$platformPath = "C:\Users\Ubu\.gemini\antigravity\scratch\agentic-platform"
$envPath = "$platformPath\.env"

$backupRepoPath = "C:\Users\Ubu\Documents\GitHub\AntigravityBrainbackup"
$logPath = "$backupRepoPath\backup.log"

function Log-Message($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$timestamp] $msg"
    Write-Output $formatted
    Add-Content -Path $logPath -Value $formatted -ErrorAction SilentlyContinue
}

# Clear old log file if it exceeds 10MB
if (Test-Path $logPath) {
    if ((Get-Item $logPath).Length -gt 10MB) {
        Remove-Item $logPath -Force
    }
}

Log-Message "Starting framework backup..."

# 1. Load GITHUB_TOKEN from env file
$token = ""
if (Test-Path $envPath) {
    Get-Content $envPath | Foreach-Object {
        if ($_ -match "^GITHUB_TOKEN=(.*)") {
            $token = $Matches[1].Trim()
        }
    }
}

if ([string]::IsNullOrEmpty($token)) {
    Log-Message "❌ Error: GITHUB_TOKEN not found in $envPath"
    exit 1
}

# 2. Sync active state to backup repo using Robocopy
# Excludes: node_modules, .git metadata, PortableGit directory, and temporary logs
Log-Message "Mirroring active scratch files to backup repository..."
$srcScratch = "C:\Users\Ubu\.gemini\antigravity\scratch"
$destScratch = "$backupRepoPath\scratch"

& robocopy $srcScratch $destScratch /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /XD node_modules .git PortableGit /XF *.log | Out-Null
$exitScratch = $LASTEXITCODE
if ($exitScratch -ge 8) {
    Log-Message "❌ Error: Robocopy failed to mirror scratch files. Exit Code: $exitScratch"
    exit 1
}

Log-Message "Mirroring global agent configurations..."
$srcConfig = "C:\Users\Ubu\.gemini\config\agents"
$destConfig = "$backupRepoPath\config\agents"

& robocopy $srcConfig $destConfig /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /XD node_modules .git /XF *.log | Out-Null
$exitConfig = $LASTEXITCODE
if ($exitConfig -ge 8) {
    Log-Message "❌ Error: Robocopy failed to mirror global agent config. Exit Code: $exitConfig"
    exit 1
}

# 3. Handle Monthly Archive Folder (YYYY.MM)
$currentMonthStr = Get-Date -Format "yyyy.MM"
$archiveDir = "$backupRepoPath\archives\$currentMonthStr"

if (!(Test-Path $archiveDir)) {
    Log-Message "Creating monthly archive snapshot for $currentMonthStr..."
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    
    # Copy scratch and config into the monthly archive folder
    & robocopy $destScratch "$archiveDir\scratch" /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
    & robocopy $destConfig "$archiveDir\config\agents" /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
}

# 4. Prune Archives Older than 180 days
$archivesParent = "$backupRepoPath\archives"
if (Test-Path $archivesParent) {
    $archiveFolders = Get-ChildItem -Path $archivesParent -Directory
    foreach ($folder in $archiveFolders) {
        if ($folder.Name -match "^(\d{4})\.(\d{2})$") {
            $year = [int]$Matches[1]
            $month = [int]$Matches[2]
            
            # Construct date representing the 1st day of that archive month
            $folderDate = Get-Date -Year $year -Month $month -Day 1 -Hour 0 -Minute 0 -Second 0
            $ageDays = ((Get-Date) - $folderDate).TotalDays
            
            if ($ageDays -gt 180) {
                Log-Message "Deleting expired archive: $($folder.Name) ($([Math]::Round($ageDays)) days old)..."
                Remove-Item -Path $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# 5. Commit and Push to GitHub using Authenticated URL
Log-Message "Staging files in backup repository..."
& $gitExe -C $backupRepoPath add scratch config archives

$status = & $gitExe -C $backupRepoPath status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Log-Message "✅ Backup completed: No changes to push."
    exit 0
}

Log-Message "Committing changes..."
$dateStr = Get-Date -Format "yyyy-MM-dd HH:mm"
$commitResult = & $gitExe -C $backupRepoPath commit -m "Backup $dateStr" 2>&1
Log-Message "Commit Output: $commitResult"

Log-Message "Pushing changes to GitHub..."
$gitUrl = "https://${token}@github.com/UbuOrchestration/AntigravityBrainbackup.git"
$pushResult = & $gitExe -c credential.helper= -C $backupRepoPath push $gitUrl main --force 2>&1
Log-Message "Push Output: $pushResult"

# Verify push exit code
if ($LASTEXITCODE -eq 0) {
    Log-Message "✅ Backup completed successfully."
} else {
    Log-Message "❌ Error: Git push failed."
    exit 1
}
