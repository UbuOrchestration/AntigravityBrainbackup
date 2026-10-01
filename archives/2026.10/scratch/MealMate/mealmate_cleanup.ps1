# MealMate Lifecycle Cleanup & Archive Script
# Owner: Antigravity Core
# Scheduled to run on the 1st of every month

$mealMatePath = "C:\Users\Ubu\.gemini\antigravity\scratch\MealMate"
$logPath = "$mealMatePath\weekly_menu.log"

function Log-Message($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$timestamp] [Cleanup] $msg"
    Write-Output $formatted
    Add-Content -Path $logPath -Value $formatted
}

Log-Message "Starting monthly MealMate archiving and log pruning..."

$monthNames = @{
    "01" = "JANUARY"; "02" = "FEBRUARY"; "03" = "MARCH"; "04" = "APRIL"
    "05" = "MAY";     "06" = "JUNE";     "07" = "JULY";  "08" = "AUGUST"
    "09" = "SEPTEMBER";"10" = "OCTOBER"; "11" = "NOVEMBER";"12" = "DECEMBER"
}

# 1. Archive folders at the root of MealMate matching YYYY.MM.DD-MENU
$folders = Get-ChildItem -Path $mealMatePath -Directory | Where-Object { $_.Name -match "^\d{4}\.\d{2}\.\d{2}-MENU$" }

foreach ($folder in $folders) {
    $folderName = $folder.Name
    # Parse date components from folder name (e.g., 2026.06.21-MENU)
    $parts = $folderName.Split('-')[0].Split('.')
    $year = $parts[0]
    $monthNum = $parts[1]
    
    $monthName = $monthNames[$monthNum]
    if ($null -eq $monthName) {
        Log-Message "Warning: Could not parse month from folder name $folderName"
        continue
    }
    
    $archiveFolderName = "${year}-${monthName}"
    $archiveDirPath = Join-Path $mealMatePath $archiveFolderName
    
    if (!(Test-Path $archiveDirPath)) {
        New-Item -ItemType Directory -Path $archiveDirPath | Out-Null
        Log-Message "Created monthly archive directory: $archiveFolderName"
    }
    
    $destPath = Join-Path $archiveDirPath $folderName
    if (Test-Path $destPath) {
        Log-Message "Destination path $destPath already exists. Removing older instance..."
        Remove-Item -Path $destPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Move-Item -Path $folder.FullName -Destination $archiveDirPath -Force
    Log-Message "Archived $folderName to $archiveFolderName/"
}

# 2. Prune logs/folders older than 180 days inside MealMate
# Search for YYYY.MM.DD-MENU folders recursively inside the archives
$allMenuFolders = Get-ChildItem -Path $mealMatePath -Directory -Recurse | Where-Object { $_.Name -match "^\d{4}\.\d{2}\.\d{2}-MENU$" }

$cutoffDate = (Get-Date).AddDays(-180)

foreach ($menuFolder in $allMenuFolders) {
    $folderName = $menuFolder.Name
    $dateStr = $folderName.Split('-')[0].Replace('.', '-') # convert YYYY.MM.DD to YYYY-MM-DD
    
    try {
        $folderDate = [datetime]$dateStr
        if ($folderDate -lt $cutoffDate) {
            Log-Message "Pruning log folder $($menuFolder.FullName) (Date: $dateStr, older than 180 days)"
            Remove-Item -Path $menuFolder.FullName -Recurse -Force
        }
    } catch {
        Log-Message "Warning: Failed to parse date from folder name $($menuFolder.FullName)"
    }
}

# Also clean up empty archive folders (YYYY-MONTH)
$archiveFolders = Get-ChildItem -Path $mealMatePath -Directory | Where-Object { $_.Name -match "^\d{4}-[A-Z]+$" }
foreach ($arch in $archiveFolders) {
    $filesCount = (Get-ChildItem -Path $arch.FullName -Recurse).Count
    if ($filesCount -eq 0) {
        Log-Message "Removing empty archive folder: $($arch.Name)"
        Remove-Item -Path $arch.FullName -Force -Recurse
    }
}

Log-Message "MealMate cleanup completed."
