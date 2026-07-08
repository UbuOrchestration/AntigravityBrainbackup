# Antigravity Platform Memory Archive

This archive serves as a centralized long-term memory store for the Antigravity Agentic Platform. It preserves technical details, directories, configuration specs, automation triggers, and execution states across all sessions. Future agents MUST read this archive to maintain continuity, respect global rules, and prevent platform amnesia.

---

## 1. Platform Governance & Foundational Principles

*   **Operating Philosophy**: **Maximum Autonomy**. The platform operates with minimal user intervention, executing scheduled workflows independently. The coordinator (Kenna) is only notified of **Critical Failures** or **Major Successes**.
*   **Agent Personas**:
    *   **Ubu**: Main orchestrator, environment supervisor, and task runner.
    *   **Ibi**: Memory Retainer & Archiver. Handles file mirroring and hourly git repository synchronization.
    *   **Doc**: Wiki/Docs Custodian. Maintains developer guides and local documents API.
*   **Reference Files**:
    *   [Global Rules (AGENTS.md)](file:///C:/Users/Ubu/.gemini/config/agents/AGENTS.md) - Contains style rules (no flattery, concise answers) and runtime guidelines.
    *   [User Profile (organizational_profile.json)](file:///C:/Users/Ubu/.gemini/antigravity/scratch/organizational_profile.json) - Details user answers and preferences.
    *   [Q&A Handbook (organizational_foundation_qa.md)](file:///C:/Users/Ubu/.gemini/antigravity/brain/8d583c17-3923-46ef-8ddd-4a48560f91f0/organizational_foundation_qa.md) - Outlines mission structure, roles, and boundaries.

---

## 2. Conversation History & Archive Index

Below is the historical index of all conversations archived on this machine. These logs represent the complete evolutionary steps of the platform:

| Conversation ID | Topic / Title | Key Achievements & Deliverables |
| :--- | :--- | :--- |
| `436dec8c-93d2-455d-b630-0d040da8ca93` | YouTube Synth/LoFi Music Channel Builder | Created procedural synth audio loops, dynamic image downloads (Unsplash fallbacks), and FFmpeg video generation with YouTube API uploads. |
| `18405f46-6c4d-4db7-b10f-f18f6958203f` | Autonomous Job Application Pipeline | Configured specialized Scout, Engineer, and Comms subagents under `.agents/agents.md` to search remote CAD positions, generate cover letters/resumes, and log CRM progress. |
| `25a8a5bc-36dd-4020-88ef-d14669315d68` | Daily AI News Agent Redesign | Implemented AI curation filters in `dailyNewsAgent.ts` with "The Hustle" light-mode HTML templates. Added sandbox execution and custom scratch build rules. |
| `42f29526-a35e-48f3-85f5-ee267bdfaab3` | GE-Hound OSRS Flipping Board | Built a Node/Express API proxy for the OSRS Prices API with a dark fantasy styled UI, raw/net margin calculations (1% GE tax), and fletching margins. |
| `480448e1-a537-4204-9b4f-cb5bfda403c3` | eBay Arbitrage & Repricer Suite | Built React + Express full-stack eBay Arbitrage application linking to developer accounts, listing counts, and margin calculators. |
| `54bf105b-2ba5-4513-aa49-00f638bf9f55` | Kannem CAD - Firebase Hosting | Configured Firebase Hosting rules (`firebase.json`, `.firebaserc`) for Vite migration. Planned CAD site revisions. |
| `631eb82d-88a9-4f10-bdaa-0316770744e7` | Discord Chat Integration | Built bidirectional Discord relay server connecting target channels to Gemini API models with custom agent persona prompts. |
| `6788a701-40c1-4b8c-9c56-90b03489f477` | eBay Arbitrage Tool (Auth) | Implemented the OAuth 2.0 authorization code flow to obtain and refresh permanent access tokens for eBay Sell APIs. |
| `68b903e7-b3d2-404d-8ffd-71dc5b06e780` | Kannem CAD Services Upgraded Site | Replicated and upgraded `kannem.com` static code, incorporating engineering blueprint style guides and custom onboarding calculators. |
| `6f14785d-3d1a-439a-a941-6a46943ef15f` | Email Campaign Dashboard | Drafted and approved Vite React implementation plans for HTML drag-and-drop newsletter editing and audience segment tags. |
| `8d583c17-3923-46ef-8ddd-4a48560f91f0` | Hivemind Orchestrator Upgrade | Upgraded Express backend and Vite dashboard with centralized endpoints under `/api/hivemind/` to run scripts and aggregate logs. |
| `9e4b2519-acb8-4623-a3cd-0d977fb64924` | MealMate Planner & Stockpile | Built automated meal scheduler emailing menu HTML cards every Sunday, tracking cupboard stockpile deducts, and cart builders. |
| `b58af6d0-f63d-4337-a919-ab6f10d57253` | Antigravity Platform Migration | Transferred full system configurations and directories onto new PC environment under `Ubu` user profile path. |
| `c9258cfb-051e-4732-a7fa-3720bdd76bbd` | New Framework Backup Engine | Designed `github_backup.ps1` for mirroring, secret cleaning, monthly snapshot directories, and 180-day archive rotations. |

---

## 3. Active Projects & Technical Specifications

### A. Agentic Platform Core (`agentic-platform`)
*   **Workspace**: [agentic-platform](file:///C:/Users/Ubu/.gemini/antigravity/scratch/agentic-platform)
*   **Tech Stack**: Node.js, Express, TypeScript, Vite, React, `discord.js`, `@google/generative-ai`.
*   **Active Sub-modules**:
    1.  **Discord Chat bot**: Exposes bidirectional relay connecting specific channels to Gemini (`gemini-1.5-flash`) with dynamic context.
    2.  **Daily AI News Agent**: Scrapes Hacker News, TechCrunch AI, and OpenAI blogs. Applies strict relevance filters (filters out marketing fluff; matches organizational workflows: MealMate, eBay Arbitrage, AutoCAD, Platform). Generates "The Hustle" off-white and crimson email digests.
    3.  **Hivemind Orchestrator API**: Exposes endpoints `/api/hivemind/status`, `/api/hivemind/trigger`, and `/api/hivemind/logs` to query active stockpile numbers, eBay listings, and logs.
    4.  **Admin Web UI**: React glassmorphic web console showing sub-project indicators, trigger buttons, backup trackers, and a unified terminal log reader.

### B. MealMate Meal Planner & Stockpile (`MealMate`)
*   **Workspace**: [MealMate](file:///C:/Users/Ubu/.gemini/antigravity/scratch/MealMate)
*   **Tech Stack**: Node.js, Express, Puppeteer, PowerShell, Task Scheduler.
*   **Key Features**:
    1.  **Sunday Menu & Approval Flow**: Scrapes ingredients, sends weekly HTML menu cards to the coordinator, and checks for replies to deduct cupboard stockpile quantities.
    2.  **Monthly Stockpile Audit**: On the 10th of every month, mails a spreadsheet review sheet and parses replies to update the stockpile log database.
    3.  **Browser Cart Automation**: Puppeteer login scripts to populate Walmart/Publix shopping carts automatically.

### C. eBay Arbitrage & Repricer (`ebay-arbitrage`)
*   **Workspace**: [ebay-arbitrage](file:///C:/Users/Ubu/.gemini/antigravity/scratch/ebay-arbitrage)
*   **Tech Stack**: Node.js (Express backend), React SPA frontend.
*   **Key Features**:
    1.  **OAuth Auth Flow**: Exchanges authorisation codes for refresh tokens, writing them to `.env`.
    2.  **Sell Inventory API Integration**: Polls active inventory list counts and matches them against database items.
    3.  **Arbitrage Scans**: Plans visual dashboards for profit margins, listing checkers, and pricing calculators.

### D. GE-Hound OSRS Board (`ge-hound`)
*   **Workspace**: [ge-hound](file:///C:/Users/Ubu/.gemini/antigravity/scratch/ge-hound)
*   **Tech Stack**: Node.js (Express), Vanilla JS, Chart.js, HTML5/CSS3.
*   **Key Features**:
    1.  **API Caching Proxy**: Exposes `/api/latest`, `/api/mapping`, and `/api/timeseries` routing queries to OSRS Wiki APIs with a specialized User-Agent and short-lived caching limits.
    2.  **OSRS Dark Fantasy Interface**: Displays active margin grids subtracting the 1% GE tax (caps at 5M GP), ROI calculations, fletching recipes, watchlists, and price line charts.

### E. Kannem CAD Upgraded Website (`kannem-cad`)
*   **Workspace**: [kannem-cad](file:///C:/Users/Ubu/.gemini/antigravity/scratch/kannem-cad)
*   **Tech Stack**: Vite, Vanilla HTML5, CSS3, JS Canvas, Firebase Hosting CLI.
*   **Key Features**:
    1.  **Blueprint Grid Canvas**: Custom interactive sandbox showcasing building boundaries and contour mapping telemetry.
    2.  **Before/After Comparison**: Horizontal slider element comparing design drafts with aerial imagery.
    3.  **Firebase Deployment**: Ready-to-go `firebase.json` configs redirecting to static Vite output assets directory `dist/`.

### F. Autonomous Job Application Pipeline (`Remote Applier`)
*   **Workspace**: [Remote Applier](file:///C:/Users/Ubu/Documents/antigravity/radiant-darwin/Remote%20Applier)
*   **Tech Stack**: Antigravity native subagents, scheduling timers, PDF compilers, headless emulators.
*   **Key Features**:
    1.  **Scout Agent**: Performs web searching and automated browsing to find remote Civil/Survey drafting positions. Exposes Greenhouse/Workday/Lever ATS verification filters.
    2.  **Engineer Agent**: Tailors resumes and cover letters against `asset_vault/resume_facts.json` (career facts shield) and generates output directories under `archive/[YYYY-MM-DD]-[Company-Name]/`.
    3.  **Communications Agent**: Manages tracking in `follow_up_log.json` and drafts outreach emails.

### G. YouTube Music Channel Builder (`youtube-uploader`)
*   **Workspace**: [youtube-uploader](file:///C:/Users/Ubu/.gemini/antigravity/scratch/youtube-uploader)
*   **Tech Stack**: Node.js, Express, FFmpeg (via `ffmpeg-static`), HTML5, CSS3, JS.
*   **Key Features**:
    1.  **Procedural Synth Engine**: Procedurally synthesizes 16-bit WAV tracks for LoFi, Uplifting Trance, and Liquid DnB moods with custom mixer gains.
    2.  **Visual Crossover Generator**: Evolve prompts featuring Synthzhu (melodic neon Shih Tzu) doing cute actions based on previous creations.
    3.  **FFmpeg Renderer & Uploader**: Loop visual frames over tracks and upload automatically via YouTube Data API.

---

## 4. Active Automation Tasks

The following Windows Scheduled Tasks execute the platform's background automations.

| Task Name | Trigger / Schedule | Script Action | Working Directory | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`UbuHourlyBackup`** | Every hour on the dot | `powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File github_backup.ps1` | `agentic-platform/` | Ready |
| **`UbuDailyAINews`** | 9:30 AM, 3:30 PM, 9:30 PM EST | `powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File run_news_agent.ps1` | `agentic-platform/` | Ready |
| **`UbuWeeklyMenu`** | Sundays hourly 10:00 AM - 5:00 PM | `powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File manage_menu_flow.ps1` | `MealMate/` | Ready |
| **`UbuMonthlyStockpileCheck`** | 10th of every month at 10:00 AM | `powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File send_reminder_email.ps1 -Type StockpileAudit` | `MealMate/` | Ready |
| **`UbuMealMateCleanup`** | 1st of every month at 12:00 AM | `powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File mealmate_cleanup.ps1` | `MealMate/` | Ready |
| **`UbuRemoteApplier` (Antigravity Cron)** | 8:00 AM and 3:00 PM daily | Trigger Scout Agent pipeline cycle | `Remote Applier/` | Ready |

---

## 5. Replicating / Reviving the Platform from Scratch

Should the host machine fail or a new agent need to recreate this platform environment, follow these steps to restore the workspace:

### Step 1: Clone the Backup Repository
Clone the repository using the authenticated GitHub token (Git must be installed, or utilize the portable copy from backup):
```bash
git clone https://github.com/UbuOrchestration/AntigravityBrainbackup.git C:\Users\Ubu\Documents\GitHub\AntigravityBrainbackup
```

### Step 2: Establish Folder Tree Structure
1.  Recreate the workspace target directory: `C:\Users\Ubu\.gemini\antigravity\scratch`
2.  Copy all folders from the backup repository's `scratch/` folder into `C:\Users\Ubu\.gemini\antigravity\scratch`.
3.  Recreate the global config directory: `C:\Users\Ubu\.gemini\config\agents`
4.  Copy all contents from the backup repository's `config/agents/` folder into `C:\Users\Ubu\.gemini\config\agents`.
5.  Recreate the job application workspace directory: `C:\Users\Ubu\Documents\antigravity\radiant-darwin`
6.  Copy all contents from the backup repository's `radiant-darwin/` folder into `C:\Users\Ubu\Documents\antigravity\radiant-darwin`.

### Step 3: Restore Sensitive Environment Variables
Create `.env` files in their respective folders based on these templates:

*   **Platform Env** (`C:\Users\Ubu\.gemini\antigravity\scratch\agentic-platform\.env`):
    ```env
    GITHUB_TOKEN=your_github_token_here
    GEMINI_API_KEY=your_gemini_api_key_here
    EMAIL_USER=your_gmail_user_here
    EMAIL_PASS=your_gmail_app_password_here
    PORT=3001
    ```
*   **Discord Configuration** (`C:\Users\Ubu\.gemini\antigravity\scratch\agentic-platform\backend\discord_config.json`):
    ```json
    {
      "token": "YOUR_DISCORD_BOT_TOKEN",
      "channels": ["CHANNEL_ID_1", "CHANNEL_ID_2"]
    }
    ```
*   **MealMate Env** (`C:\Users\Ubu\.gemini\antigravity\scratch\MealMate\.env`):
    ```env
    AGENTMAIL_API_KEY=your_agentmail_api_key_here
    AGENTMAIL_INBOX_ID=your_agentmail_inbox_id_here
    EMAIL_USER=your_gmail_user_here
    EMAIL_PASS=your_gmail_app_password_here
    ```
*   **eBay Arbitrage Env** (`C:\Users\Ubu\.gemini\antigravity\scratch\ebay-arbitrage\.env`):
    ```env
    EBAY_APP_ID=your_ebay_app_id
    EBAY_CERT_ID=your_ebay_cert_id
    EBAY_DEV_ID=your_ebay_dev_id
    EBAY_RUNAME=your_ebay_redirect_uri_name
    EBAY_REFRESH_TOKEN=your_ebay_permanent_refresh_token
    ```
*   **YouTube Uploader Env** (`C:\Users\Ubu\.gemini\antigravity\scratch\youtube-uploader\.env`):
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    PORT=3005
    YOUTUBE_CLIENT_ID=your_youtube_oauth_client_id
    YOUTUBE_CLIENT_SECRET=your_youtube_oauth_client_secret
    YOUTUBE_REDIRECT_URI=http://localhost:3005/oauth2callback
    ```

### Step 4: Install Node.js Dependencies
Navigate to each project root directory and execute `npm install`:
```bash
# Agentic Platform Backend
cd C:\Users\Ubu\.gemini\antigravity\scratch\agentic-platform\backend
npm install

# Agentic Platform Frontend
cd C:\Users\Ubu\.gemini\antigravity\scratch\agentic-platform\frontend
npm install

# MealMate Planner
cd C:\Users\Ubu\.gemini\antigravity\scratch\MealMate
npm install

# GE-Hound
cd C:\Users\Ubu\.gemini\antigravity\scratch\ge-hound
npm install

# YouTube Music Builder
cd C:\Users\Ubu\.gemini\antigravity\scratch\youtube-uploader
npm install
```

### Step 5: Register Scheduled Tasks
Open an Administrator PowerShell terminal and execute the task configuration scripts:
```powershell
# Register backup task (UbuHourlyBackup)
cd C:\Users\Ubu\.gemini\antigravity\scratch\agentic-platform
.\antigravity.ps1

# Register daily AI news agent (UbuDailyAINews)
.\register_news_task.ps1

# Register MealMate tasks (Weekly Menu, Monthly Stockpile, Cleanup)
cd C:\Users\Ubu\.gemini\antigravity\scratch\MealMate
.\configure_tasks.ps1
```

### Step 6: Start Local Web Services
Use `npm` to boot development servers:
*   **Orchestrator Backend**: In `agentic-platform/backend/`, run `npm run dev` (starts on port `3001`).
*   **Orchestrator Frontend Panel**: In `agentic-platform/frontend/`, run `npm run dev` (starts on port `5173`).
*   **MealMate Panel**: In `MealMate/`, run `npm start` (starts on port `3002`).
*   **GE-Hound OSRS Board**: In `ge-hound/`, run `npm start` (starts on port `3000`).
*   **Kannem CAD Site Preview**: In `kannem-cad/`, run `npm run dev` (starts on port `5173`).
*   **YouTube Music Builder**: In `youtube-uploader/`, run `npm start` (starts on port `3005`).
