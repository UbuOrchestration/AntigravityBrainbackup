# Antigravity 2.0 Autonomous Engineering Team Definition

## Global Scheduler Constraint
- **Cron Configuration:** `0 8,15 * * *` (Execute automated routine daily at 08:00 and 15:00 local time).
- **Execution Mode:** Autopilot.
- **Root Project Directory:** C:\Users\Ubu\Documents\antigravity\radiant-darwin\CAD-Job-Pipeline

---

## Agent 1: Scout Agent
- **Objective:** Locate highly accurate, validated 100% remote Civil/Survey drafting openings.
- **Execution Script:** `skills/skill_scout.md`
- **Logic Matrix:**
  1. Parse Hiring.Cafe, LinkedIn, Indeed, Monster, and ZipRecruiter using targeted strings:
     `"Civil" AND ("Designer" OR "3D" OR "CAD Tech")` / `"Land Survey" AND ("CAD" OR "Drafter")`
  2. **Anti-Ghost Filter Cascade:** Upon locating an aggregator listing, scrape the target company name and execute a quick background sub-query to check the direct employer portal (e.g., `company.com/careers`). If the listing does not exist in their native ATS framework (Workday, Greenhouse, Lever), flag as a ghost listing and drop execution.
  3. **Recruiter Extraction:** Search the DOM structure of the posting for the exact string identifier matching `Posted by [Name]` or `Hiring Manager: [Name]`. Export name and job metadata to the current runtime payload.

---

## Agent 2: Engineer Agent
- **Objective:** Handle ATS bypass optimization, file compiling, and secure form injection.
- **Execution Scripts:** `skills/skill_engineer.md` and `skills/skill_submit.md`
- **Logic Matrix:**
  1. **Nomenclature Sync:** Compare job text keywords against `asset_vault/resume_base.docx`. Interactively swap synonyms (e.g., "Topographic Mapping" for "Topo Surveys") to exceed a 90% ATS match score.
  2. **Fact Shield Check:** Verify output against `asset_vault/resume_facts.json`. If any dates, core titles, or unverified software skills were hallucinated or altered by the LLM, wipe file state and restart compilation.
  3. **Portfolio Matrix Routing:** Scan job text. If Land Surveying or platting dominates the scope, index and attach `portfolio_matrix/map_alta_exhibit.pdf`. If grading, drainage, or surfaces dominate, attach `portfolio_matrix/design_civil_3d.pdf`.
  4. **Professional File Assembly:** Output final tailored PDF components to a unique time-stamped directory under `/archive/[YYYY-MM-DD]-[Company-Name]/`. The file name must be generated dynamically using professional syntax: 
     `[First_Name]_[Last_Name]_[Target_Title]_[Company_Name].pdf`
  5. **Human Emulation Submission:** Execute Form Filler via BrowserMCP layer. Apply random typing micro-delays (variable speeds mimicking 50–120 WPM inputs) and variable tab intervals to trick anti-bot telemetry.
  6. **Circuit Breakers:** Halt execution and prompt Mission Control instantly if a mandatory numeric salary field is empty in `profile_specs.json`, or if an interactive CAPTCHA puzzle challenge interrupts the flow for more than 60 seconds.

---

## Agent 3: Communications Agent
- **Objective:** Manage post-application tracking and execute direct, natural follow-ups.
- **Execution Script:** `skills/skill_comms.md`
- **Logic Matrix:**
  1. Append application parameters to `applied_database.csv` and instantiate log indexes within `follow_up_log.json`.
  2. Monitor intervals daily (T+1, T+3, T+5).
  3. **Direct Contact Routing:** Take the recruiter name extracted by the Scout Agent. Use standard corporate domain syntax (e.g., `firstname.lastname@company.com`) to attempt to locate their inbox. If found, route follow-up emails directly to that human; otherwise, route to general recruitment.
  4. **Tone Guardrail:** Force short, brief, professional, peer-to-peer phrasing. Avoid boilerplate corporate language. Reference available portfolio drawings and explicitly highlight compatibility with Florida state residency restrictions.
