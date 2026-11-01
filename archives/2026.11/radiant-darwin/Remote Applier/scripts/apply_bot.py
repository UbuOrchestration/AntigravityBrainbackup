import time
import json
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By

def setup_driver():
    options = Options()
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def read_profile():
    path = os.path.join(os.path.dirname(__file__), '..', 'asset_vault', 'profile_specs.json')
    with open(path, 'r') as f:
        return json.load(f)

def dry_run_apply(driver, target_url):
    print(f"Starting dry-run application for: {target_url}")
    profile = read_profile()
    
    driver.get(target_url)
    time.sleep(3) # Wait for form to load
    
    # Example form injection logic (highly dependent on the specific ATS like Greenhouse/Lever)
    print("Emulating human form filling...")
    
    # Attempting to find standard fields
    try:
        # First Name
        fname = driver.find_element(By.NAME, "first_name")
        for char in profile['personal_info']['first_name']:
            fname.send_keys(char)
            time.sleep(0.1) # Micro-delay
            
        # Last Name
        lname = driver.find_element(By.NAME, "last_name")
        for char in profile['personal_info']['last_name']:
            lname.send_keys(char)
            time.sleep(0.1)
            
        print("Data injected successfully.")
    except Exception as e:
        print("Form fields not standard. Custom selector mapping required for this ATS.")
        
    print("DRY RUN ENABLED: Skipping final submit button click.")
    print("Application simulation complete.")

if __name__ == "__main__":
    # Placeholder URL for a generic ATS form
    target = "https://example.com/apply" 
    driver = setup_driver()
    try:
        dry_run_apply(driver, target)
    finally:
        driver.quit()
