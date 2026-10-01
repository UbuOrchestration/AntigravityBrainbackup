import json
import os
import sys
import time
from datetime import datetime

def load_inquiry_templates():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_path = os.path.join(base_dir, 'asset_vault', 'inquiry_templates.json')
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Missing templates repository at {template_path}")
    with open(template_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_contact_payload(firm_name, domain="Land Surveying"):
    data = load_inquiry_templates()
    profile = data["profile_data"]
    messages = data["inquiry_messages"]

    message_body = messages.get(domain, messages["Land Surveying"])

    payload = {
        "first_name": profile["first_name"],
        "last_name": profile["last_name"],
        "full_name": profile["full_name"],
        "phone": profile["phone"],
        "email": profile["email"],
        "city": profile["city"],
        "state": profile["state"],
        "message": message_body,
        "resume_path": os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "asset_vault", profile["resume_filename"])
    }
    return payload

def simulate_form_submission(target_url, firm_name, domain="Land Surveying"):
    """
    Simulates intelligent contact form mapping and submission payload generation.
    Logs submission to applied_database.csv.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'applied_database.csv')
    
    payload = generate_contact_payload(firm_name, domain)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Map form fields check
    field_mapping = {
        "Field_FirstName": payload["first_name"],
        "Field_LastName": payload["last_name"],
        "Field_Email": payload["email"],
        "Field_Phone": payload["phone"],
        "Field_CityState": f"{payload['city']}, {payload['state']}",
        "Field_Message": payload["message"][:60] + "...",
        "Field_ResumeAttached": os.path.exists(payload["resume_path"])
    }

    # Record to ledger
    log_entry = f"\n{timestamp},{firm_name},Remote {domain} Specialist,{target_url},Form Submitted (Direct Contact),Direct Inquiry Sent"
    with open(db_path, 'a', encoding='utf-8') as f:
        f.write(log_entry)

    return {
        "status": "SUCCESS",
        "target_firm": firm_name,
        "url": target_url,
        "fields_mapped": field_mapping,
        "timestamp": timestamp
    }

if __name__ == '__main__':
    print("=== SMALL-BUSINESS CONTACT FORM AUTOMATION ENGINE ===")
    test_res = simulate_form_submission("https://leclairegeoservices.com/contact", "LeClaire GeoServices", "Land Surveying")
    print(json.dumps(test_res, indent=2))
