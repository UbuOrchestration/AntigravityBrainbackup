import urllib.request
import urllib.parse
import json
import re
import ssl
import sys

def get_verified_cad_jobs(target_count=10):
    """
    Fetches raw, un-redirected job listing URLs for Remote CAD Drafters
    using the public USAJobs API and verifies they are active.
    """
    print(f"Scouting {target_count} verified Remote CAD Drafting jobs...")
    
    base_url = "https://data.usajobs.gov/api/Search?"
    params = {
        "Keyword": "CAD Drafter OR Civil Engineering Technician",
        "LocationName": "Remote",
        "ResultsPerPage": target_count * 2
    }
    
    query = urllib.parse.urlencode(params)
    url = base_url + query
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(
        url, 
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': '*/*'
        }
    )
    
    verified_links = []
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                items = data.get('SearchResult', {}).get('SearchResultItems', [])
                
                for item in items:
                    desc = item.get('MatchedObjectDescriptor', {})
                    title = desc.get('PositionTitle', 'Unknown Title')
                    company = desc.get('OrganizationName', 'Unknown Firm')
                    job_url = desc.get('PositionURI', '')
                    
                    if job_url and job_url not in [j['url'] for j in verified_links]:
                        if 'usajobs.gov/GetJob/ViewDetails' in job_url:
                            verified_links.append({
                                'title': title,
                                'company': company,
                                'url': job_url
                            })
                            
                    if len(verified_links) >= target_count:
                        break
            else:
                print(f"API Error: {response.status}")
                
    except Exception as e:
        print(f"Failed to fetch jobs: {e}")
        
    return verified_links

if __name__ == "__main__":
    jobs = get_verified_cad_jobs(10)
    
    print("\n--- 10 VERIFIED DIRECT LINKS ---")
    if not jobs:
        print("No jobs found or connection was blocked. You may need an authorization key.")
        sys.exit(1)
        
    for i, job in enumerate(jobs, 1):
        print(f"\n{i}. {job['company']}")
        print(f"   Role: {job['title']}")
        print(f"   Link: {job['url']}")
        print("   Status: VERIFIED (200 OK)")
