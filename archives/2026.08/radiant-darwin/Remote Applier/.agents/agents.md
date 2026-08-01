# Antigravity 2.0 Autonomous Engineering Team Definition

## Global Scheduler Constraint
- **Cron Configuration:** `0 8,15 * * *` (Execute automated routine daily at 08:00 and 15:00 local time).
- **Execution Mode:** Autopilot.

## Agent 1: Scout Agent
- **Objective:** Locate highly accurate, validated 100% remote Civil/Survey drafting openings.
- **Logic Matrix:**
  1. Parse Hiring.Cafe, LinkedIn, Indeed, Monster, and ZipRecruiter using targeted strings:
     `"Civil" AND ("Designer" OR "3D" OR "CAD Tech")` / `"Land Survey" AND ("CAD" OR "Drafter")`
  2. **Anti-Ghost Filter Cascade:** Verify the listing exists in their native ATS framework (Workday, Greenhouse, Lever).
  3. **Recruiter Extraction:** Search the DOM structure for `Posted by [Name]` or `Hiring Manager`.

## Agent 2: Engineer Agent
- **Objective:** Handle ATS bypass optimization, file compiling, and secure form injection.
- **Logic Matrix:**
  1. **Nomenclature Sync:** Swap synonyms to exceed a 90% ATS match score.
  2. **Fact Shield Check:** Verify output against `asset_vault/resume_facts.json`.
  3. **Portfolio Matrix Routing:** Scan job text to attach `portfolio_matrix/map_alta_exhibit.pdf` or `portfolio_matrix/design_civil_3d.pdf`.
  4. **Professional File Assembly:** Output to `/archive/[YYYY-MM-DD]-[Company-Name]/`.
  5. **Human Emulation Submission:** Execute Form Filler via BrowserMCP layer.
  6. **Circuit Breakers:** Halt execution if mandatory numeric salary field is empty.

## Agent 3: Communications Agent
- **Objective:** Manage post-application tracking and execute direct, natural follow-ups.
- **Logic Matrix:**
  1. Monitor intervals daily (T+1, T+3, T+5).
  2. **Direct Contact Routing:** Draft emails for standard corporate domain syntax (e.g., `firstname.lastname@company.com`).
  3. **Tone Guardrail:** Force short, brief, professional, peer-to-peer phrasing.
