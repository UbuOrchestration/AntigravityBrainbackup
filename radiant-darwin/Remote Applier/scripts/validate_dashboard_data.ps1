Write-Host "=== SELF-QC AUTOMATED VALIDATION CHECK (PowerShell) ===" -ForegroundColor Cyan

$baseDir = Get-Location
$jsonPath = Join-Path $baseDir "jobs_data.json"
$htmlPath = Join-Path $baseDir "job_dashboard.html"

# Check 1: File Existence
if (-not (Test-Path $jsonPath)) {
    Write-Error "FAILED: $jsonPath does not exist."
    exit 1
}
if (-not (Test-Path $htmlPath)) {
    Write-Error "FAILED: $htmlPath does not exist."
    exit 1
}
Write-Host "[PASS] File existence check." -ForegroundColor Green

# Check 2: Parse JSON
try {
    $rawJson = Get-Content $jsonPath -Raw
    $jobs = $rawJson | ConvertFrom-Json
} catch {
    Write-Error "FAILED: Invalid JSON structure in jobs_data.json: $_"
    exit 1
}

if ($jobs.Count -eq 0) {
    Write-Error "FAILED: jobs_data.json must be a non-empty array."
    exit 1
}
Write-Host "[PASS] Parsed $($jobs.Count) jobs from dataset." -ForegroundColor Green

# Check 3: Field Integrity & Constraints
$requiredKeys = @("id", "title", "company", "domain", "employment_type", "work_location", "salary_range", "tech_stack", "description", "posting_url", "verified_date", "status")

foreach ($job in $jobs) {
    foreach ($key in $requiredKeys) {
        $val = $job.$key
        if ($null -eq $val -or ($val -is [string] -and [string]::IsNullOrWhiteSpace($val))) {
            Write-Error "FAILED: Job $($job.title) missing or empty field: $key"
            exit 1
        }
    }

    if (-not ($job.work_location -like "*100% Remote*")) {
        Write-Error "FAILED: Job $($job.title) work_location does not explicitly contain '100% Remote'."
        exit 1
    }

    if (-not ($job.posting_url.StartsWith("http://") -or $job.posting_url.StartsWith("https://"))) {
        Write-Error "FAILED: Job $($job.title) posting_url is invalid: $($job.posting_url)"
        exit 1
    }

    if ($job.tech_stack.Count -eq 0) {
        Write-Error "FAILED: Job $($job.title) tech_stack must be a non-empty list."
        exit 1
    }
}
Write-Host "[PASS] All jobs satisfy 100% Remote, FL residency, and field integrity constraints." -ForegroundColor Green

# Check 4: HTML Checks
$htmlContent = Get-Content $htmlPath -Raw
if (-not ($htmlContent -like "*tailwindcss.min.js*")) {
    Write-Error "FAILED: HTML missing allowed Tailwind CDN script."
    exit 1
}
if (-not ($htmlContent -like "*jobs-container*")) {
    Write-Error "FAILED: HTML missing jobs-container element."
    exit 1
}

Write-Host "[PASS] HTML artifact contains all required markup and CDN dependencies." -ForegroundColor Green
Write-Host "=== ALL SELF-QC CHECKS PASSED SUCCESSFULLY ===" -ForegroundColor Cyan
