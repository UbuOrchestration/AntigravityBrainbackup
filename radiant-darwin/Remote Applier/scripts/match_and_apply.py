import json
import os
import sys

# Core Unalterable Fact Shield
RESUME_SKILLS = [
    "autocad", "civil 3d", "carlson survey", "revit", "illustrator", "indesign", 
    "leica cloudworx 3d", "trimble 3d laser scanning", "bluebeam revu",
    "boundary survey", "topographic survey", "alta/nsps", "subdivision plat", 
    "as-built survey", "metes & bounds", "deed research", "public records",
    "grading & erosion", "pond plan", "utility plan", "drainage exhibit",
    "surface modeling", "pipe network", "sheet sets", "subsurface utility"
]

def analyze_job_match(job_title, job_description, is_remote=True, florida_eligible=True, is_full_time=True):
    """
    Evaluates a job posting text against Michael Kenna's experience matrix
    and calculates an ATS Match Percentage.
    """
    text_lower = f"{job_title} {job_description}".lower()

    # Mandatory Filter Guards
    if not is_remote:
        return {"matched": False, "reason": "Not 100% Remote"}
    if not florida_eligible:
        return {"matched": False, "reason": "Florida residency blocked or restricted"}
    
    # Calculate Keyword Overlap
    hits = [skill for skill in RESUME_SKILLS if skill in text_lower]
    score = min(100, int((len(hits) / 6.0) * 100)) # 6 core skill hits = 100% match

    # Portfolio Attachment Matrix Selection
    survey_keywords = ["boundary", "topo", "alta", "plat", "deed", "metes", "carlson"]
    civil_keywords = ["grading", "drainage", "pond", "pipe network", "utility", "erosion"]

    survey_score = sum(1 for k in survey_keywords if k in text_lower)
    civil_score = sum(1 for k in civil_keywords if k in text_lower)

    portfolio_file = "map_alta_exhibit.pdf" if survey_score >= civil_score else "design_civil_3d.pdf"

    return {
        "matched": score >= 70,
        "match_score": score,
        "matched_skills": hits,
        "portfolio_attachment": portfolio_file,
        "target_title": job_title
    }

def main():
    print("=== AUTOMATED JOB MATCH & APPLY INFRASTRUCTURE ===")
    
    # Sample evaluation on active Primera Engineers position
    title = "Civil Infrastructure CAD Designer"
    desc = "Develop complete civil design packages, grading & pond plans, utility relocation profiles, pipe networks, and municipal permit drawings using Civil 3D and dynamic sheet sets."
    
    result = analyze_job_match(title, desc, is_remote=True, florida_eligible=True, is_full_time=True)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
