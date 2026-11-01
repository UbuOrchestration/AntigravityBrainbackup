Write-Host "=== SELF-QC AUTOMATED VALIDATION CHECK: Contact Engine (PowerShell) ===" -ForegroundColor Cyan

$baseDir = Get-Location
$templatePath = Join-Path $baseDir "asset_vault\inquiry_templates.json"
$scriptPath = Join-Path $baseDir "scripts\submit_contact_form.py"
$dbPath = Join-Path $baseDir "applied_database.csv"

# Check 1: File Existence
if (-not (Test-Path $templatePath)) {
    Write-Error "FAILED: $templatePath does not exist."
    exit 1
}
if (-not (Test-Path $scriptPath)) {
    Write-Error "FAILED: $scriptPath does not exist."
    exit 1
}
Write-Host "[PASS] File existence check." -ForegroundColor Green

# Check 2: Parse Template Data
try {
    $rawTemplates = Get-Content $templatePath -Raw | ConvertFrom-Json
} catch {
    Write-Error "FAILED: Invalid JSON in inquiry_templates.json: $_"
    exit 1
}

$profile = $rawTemplates.profile_data
if ([string]::IsNullOrWhiteSpace($profile.first_name) -or [string]::IsNullOrWhiteSpace($profile.email) -or [string]::IsNullOrWhiteSpace($profile.phone)) {
    Write-Error "FAILED: Profile data missing essential contact fields (first_name, email, phone)."
    exit 1
}
Write-Host "[PASS] Profile contact data verified: $($profile.full_name) ($($profile.email))." -ForegroundColor Green

# Check 3: Verify Templates for All Domains
$domains = @("Land Surveying", "Civil Infrastructure", "Utilities")
foreach ($domain in $domains) {
    $msg = $rawTemplates.inquiry_messages.$domain
    if ([string]::IsNullOrWhiteSpace($msg)) {
        Write-Error "FAILED: Missing outreach template for domain: $domain"
        exit 1
    }
    if (-not ($msg -like "*Michael Kenna*")) {
        Write-Error "FAILED: Message for $domain does not contain candidate name."
        exit 1
    }
}
Write-Host "[PASS] Outreach templates verified for all 3 engineering domains." -ForegroundColor Green

Write-Host "=== ALL CONTACT ENGINE SELF-QC CHECKS PASSED SUCCESSFULLY ===" -ForegroundColor Cyan
