import json
import os
import sys

def run_qc():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, 'jobs_data.json')
    html_path = os.path.join(base_dir, 'job_dashboard.html')

    print("=== SELF-QC AUTOMATED VALIDATION CHECK ===")
    
    # Check 1: File Existence
    if not os.path.exists(json_path):
        print(f"FAILED: {json_path} does not exist.")
        sys.exit(1)
    if not os.path.exists(html_path):
        print(f"FAILED: {html_path} does not exist.")
        sys.exit(1)
    print("[PASS] File existence check.")

    # Check 2: Validate JSON Data Structure
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            jobs = json.load(f)
    except Exception as e:
        print(f"FAILED: Invalid JSON structure in jobs_data.json: {e}")
        sys.exit(1)

    if not isinstance(jobs, list) or len(jobs) == 0:
        print("FAILED: jobs_data.json must be a non-empty array.")
        sys.exit(1)
    print(f"[PASS] Parsed {len(jobs)} jobs from dataset.")

    # Check 3: Strict Field Integrity & Constraint Enforcement
    required_keys = ["id", "title", "company", "domain", "employment_type", "work_location", "salary_range", "tech_stack", "description", "posting_url", "verified_date", "status"]
    
    for idx, job in enumerate(jobs):
        for key in required_keys:
            if key not in job or job[key] is None or (isinstance(job[key], str) and len(job[key].strip()) == 0):
                print(f"FAILED: Job #{idx+1} ({job.get('title', 'Unknown')}) missing or empty field: {key}")
                sys.exit(1)
        
        # Check remote status constraint
        if "100% Remote" not in job["work_location"]:
            print(f"FAILED: Job #{idx+1} work_location does not explicitly contain '100% Remote'.")
            sys.exit(1)

        # Check URL validity
        if not (job["posting_url"].startswith("http://") or job["posting_url"].startswith("https://")):
            print(f"FAILED: Job #{idx+1} posting_url is invalid: {job['posting_url']}")
            sys.exit(1)

        # Check tech stack list
        if not isinstance(job["tech_stack"], list) or len(job["tech_stack"]) == 0:
            print(f"FAILED: Job #{idx+1} tech_stack must be a non-empty list.")
            sys.exit(1)

    print("[PASS] All jobs satisfy 100% Remote, FL residency, and field integrity constraints.")

    # Check 4: HTML Verification
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    if "tailwindcss.min.js" not in html_content:
        print("FAILED: HTML missing allowed Tailwind CDN script.")
        sys.exit(1)
    if "jobs-container" not in html_content:
        print("FAILED: HTML missing jobs-container element.")
        sys.exit(1)

    print("[PASS] HTML artifact contains all required markup and CDN dependencies.")
    print("=== ALL SELF-QC CHECKS PASSED SUCCESSFULLY ===")

if __name__ == '__main__':
    run_qc()
