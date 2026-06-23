# Antigravity Platform Memory Archive
This archive serves as a centralized long-term memory store for the Antigravity Agentic Platform, preserving technical details, directory paths, configuration parameters, and execution states from recent project sessions. Future agents MUST query this archive to maintain context and avoid the "amnesia" problem.

---

## 1. Platform Governance & Foundational Principles
*   **Operating Philosophy**: **Maximum Autonomy**. The platform operates with minimal user intervention, executing scheduled workflows independently. The coordinator (Kenna) is only notified of **Critical Failures** or **Major Successes**.
*   **Agent Roles**:
    *   **Ubu**: Orchestrator, main task runner, environment/resource supervisor.
    *   **Ibi**: Memory Retainer & Archiver. Executes hourly backups of the active conversation transcript to GitHub.
    *   **Doc**: Knowledge Base & Wiki Custodian. Maintains developer guides and hosts the local `/api/docs` search API.
*   **Reference Files**:
    *   [Global Rules (AGENTS.md)](file:///C:/Users/Ubu/.gemini/config/agents/AGENTS.md) - Outlines priorities, constraints, compliance rules.
    *   [User Profile (organizational_profile.json)](file:///C:/Users/Ubu/.gemini/antigravity/scratch/organizational_profile.json) - Contains answers history and user preferences.
    *   [Q&A Handbook (organizational_foundation_qa.md)](file:///C:/Users/Ubu/.gemini/antigravity/brain/8d583c17-3923-46ef-8ddd-4a48560f91f0/organizational_foundation_qa.md) - Details mission, architecture, and roles.

---

## 2. Active Projects & Technical Specifications

### A. Discord Chat Integration
*   **Workspace Location**: [agentic-platform](file:///C:/Users/Ubu/.gemini/antigravity/scratch/agentic-platform)
*   **Status**: **Live & Active**
*   **Tech Stack**: Node.js, Express, TypeScript, `discord.js`, `@google/generative-ai`, Vite, React.
*   **Active Services**:
    *   Backend listening on port **3001** (`npm run dev` in `backend/`).
    *   Frontend listening on port **5173** (`npm run dev` in `frontend/`).
*   **Features**:
    *   Listens to target channels using comma-separated IDs in `discord_config.json`.
    *   Routes general chat messages to Google Gemini (`gemini-1.5-flash`) using a context system prompt that dynamically retrieves platform metrics.
    *   Allows interactive roleplay as specific agent personas (`Ubu`, `Ibi`, `Doc`) via the `!chat <agent_name> <message>` command.
    *   Web UI settings panel to configure the bot token, target channel IDs, and the masked Gemini API Key.
*   **Key Files**:
    *   [discordBot.ts](file:///C:/Users/Ubu/.gemini/antigravity/scratch/agentic-platform/backend/src/discordBot.ts) - Handles gateway connections, command parsing, and Gemini API queries.
    *   [index.ts](file:///C:/Users/Ubu/.gemini/antigravity/scratch/agentic-platform/backend/src/index.ts) - Exposes REST endpoints for configuration, status checks, and logs.

### B. MealMate Meal Planner
*   **Workspace Location**: [MealMate](file:///C:/Users/Ubu/.gemini/antigravity/scratch/MealMate)
*   **Status**: **Live & Active (Scheduled)**
*   **Tech Stack**: Node.js, Express, Puppeteer, PowerShell, Windows Task Scheduler.
*   **Active Services**: Express server listening on port **3002** (`npm start`).
*   **Features**:
    *   **Sunday Menu & Approval Flow**: At 10:00 AM, generates a coordinated weekly menu sharing overlapping bulk ingredients, emails the coordinator an HTML sheet, and polls the inbox for approval replies (triggering stockpile deductions or verification checks).
    *   **Monthly Stockpile Audit**: On the 10th of every month at 10:00 AM, emails a stockpile audit sheet, parses email replies, and automatically updates quantities in `stockpile.json`.
    *   **Browser Cart Automation**: Uses Puppeteer to log in to grocery portals (e.g. Publix, Aldi via Instacart/Walmart) and adds the lowest-cost items to the cart. If no credentials are set, it runs in high-fidelity visual simulation mode.
    *   **Web Dashboard**: Visual tabs for menu validation, stockpile quantities adjust, and preferences editing.
*   **Key Schedules**:
    *   Task **`UbuWeeklyMenu`**: Runs `manage_menu_flow.ps1` every Sunday starting at 10:00 AM.
    *   Task **`UbuMonthlyStockpileCheck`**: Runs `send_reminder_email.ps1` on the 10th day of the month at 10:00 AM.
*   **Key Files**:
    *   [preferences.json](file:///C:/Users/Ubu/.gemini/antigravity/scratch/MealMate/preferences.json) - Contains active dietary preferences.
    *   [stockpile.json](file:///C:/Users/Ubu/.gemini/antigravity/scratch/MealMate/stockpile.json) - Database of household staples and quantities.

### C. eBay Arbitrage Tool (ArbitrageFlow)
*   **Workspace Location**: [ebay-arbitrage](file:///C:/Users/Ubu/.gemini/antigravity/scratch/ebay-arbitrage)
*   **Status**: **Credentials Setup Complete; SPA Interface Planned**
*   **Tech Stack**: Node.js (auth/testing scripts), Vanilla JS SPA (planned).
*   **Features**:
    *   Handles OAuth2.0 authentication workflow with eBay APIs.
    *   Exchanges code for a permanent Refresh Token, saved locally in `.env`.
    *   Verifies connection validity with the eBay Sell Inventory API.
    *   Planned features include a Single-Page App containing profit/ROI fee calculators, simulated suppliers matching scanners, listing monitors, and sales charts.
*   **Key Files**:
    *   [ebay_auth.js](file:///C:/Users/Ubu/.gemini/antigravity/scratch/ebay-arbitrage/ebay_auth.js) - Script to exchange OAuth code for tokens.
    *   [ebay_test.js](file:///C:/Users/Ubu/.gemini/antigravity/scratch/ebay-arbitrage/ebay_test.js) - Script to test API connectivity and list active listings count.

### D. Email Campaign Dashboard
*   **Workspace Location**: `C:\Users\Ubu\.gemini\antigravity\scratch\email-campaign-manager` (Planned)
*   **Status**: **Planned (Implementation plan drafted)**
*   **Tech Stack**: Vanilla HTML5, CSS3, ES6 JavaScript Single-Page App (SPA).
*   **Features**:
    *   Premium dark-theme glassmorphism UI with Outfit typography.
    *   Drag-and-drop campaign editor building responsive HTML email newsletters.
    *   Audience list manager supporting multi-tag segmentation and search.
    *   Visual flow canvas mapping signup, delay, and send-mail automations.
    *   SVG-based analytics dashboard detailing campaigns open/click/bounce rates.
    *   Configured to send outgoing mail using Agentmail via `ubu@agentmail.to`.

### E. Kannem CAD Website
*   **Workspace Location**: `C:\Users\Ubu\.gemini\antigravity\scratch\kannem-cad` (Planned)
*   **Status**: **Planned (Implementation plan drafted)**
*   **Tech Stack**: Vanilla HTML5, CSS3, JavaScript (Canvas API).
*   **Features**:
    *   Modern engineering blueprint dark theme.
    *   **Interactive CAD Sandbox**: Live SVG/Canvas where users click to add drawing layers (Structures, Contour lines, Boundaries) and see coordinate telemetry in real-time.
    *   **Before/After Comparison Slider**: Sliding overlay to compare satellite photos vs. CAD plans.
    *   **Dynamic Cost Estimator**: Calculates estimated prices based on property acreage and service priority.
    *   **Intake Portal & Hours Checker**: Form for submitting CAD requests and checking business hours status.

### F. Hivemind Orchestrator
*   **Workspace Location**: [agentic-platform](file:///C:/Users/Ubu/.gemini/antigravity/scratch/agentic-platform)
*   **Status**: **Live & Active**
*   **Tech Stack**: Node.js, Express, TypeScript, Vite, React.
*   **Features**:
    *   Exposes endpoints under `/api/hivemind/` to fetch unified status, trigger scripts asynchronously, and aggregate logs from all subagent workspaces.
    *   Unified dashboard UI panel in Vite frontend to monitor and trigger tasks across `MealMate`, `ebay-arbitrage`, and `email-campaign-manager`.
    *   Integrated live terminal console displaying consolidated logs from backups and sub-projects in one place.
*   **Key Files**:
    *   [agentRunner.ts](file:///C:/Users/Ubu/.gemini/antigravity/scratch/agentic-platform/backend/src/agentRunner.ts) - Virtual subagents mapped and updated.
    *   [index.ts](file:///C:/Users/Ubu/.gemini/antigravity/scratch/agentic-platform/backend/src/index.ts) - Exposes Hivemind API endpoints.
    *   [App.tsx](file:///C:/Users/Ubu/.gemini/antigravity/scratch/agentic-platform/frontend/src/App.tsx) - Central control UI and log consolidator.

---

## 3. Active Automation Tasks

| Task Name | Schedule | Action | Target Location | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`UbuHourlyBackup`** | Hourly | Run `github_backup.ps1` | `agentic-platform/` | Ready |
| **`UbuWeeklyMenu`** | Sundays 10:00 AM | Run `manage_menu_flow.ps1` | `MealMate/` | Ready |
| **`UbuMonthlyStockpileCheck`** | 10th of Month 10:00 AM | Run stockpile check audit | `MealMate/` | Ready |

---

## 4. Known Issues & Operational Warnings

> [!NOTE]
> **GitHub Backup Repository Configured**:
> The backup script is configured to push to the private repository `https://github.com/UbuOrchestration/AntigravityBrainbackup.git` on the `UbuOrchestration` account.
