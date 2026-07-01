# Memory & Objectives: Cutting Edge News Agent

## Project Overview
The **Cutting Edge** agent is an automated Daily AI News and intelligence agent integrated into the Antigravity Agentic Platform. It gathers, filters, analyzes, and emails curated daily AI news to `MichaelKenna3@gmail.com`.

---

## 🎯 Core Objectives
1. **Multi-Resource Scraping**: Scrape latest news from reputable sources daily (Hacker News, TechCrunch AI feed, OpenAI Blog feed).
2. **BS Fluff Filtering**: Filter out hype, funding announcements, and fluff. Analyze the core technical and process significance of each update.
3. **Strict Workflow Integration**: Only include news items that can be directly applied to improve the organization's existing workflows:
   - **MealMate** (meal planning, grocery cart builders, stockpile/pantry tracking).
   - **eBay Arbitrage** (RV products, scanning listings, arbitrage pricing models).
   - **AutoCAD Outreach & Lead Gen** (AutoCAD outreach, general contractor drafting bids, permit drawings).
   - **Agentic Platform** (agent execution limits, git backup logs, Discord bot interface, CLI tools).
4. **Actionable Connection, Scratch Builds & Sandbox Sim**:
   - For every connection presented, clearly and concisely define **how** it improves our workflow and outline a **mini-implementation plan**.
   - **Simulated Sandbox**: Evaluate the impact in a simulated scenario to critique how helpful it will really be (e.g. speed, cost, reliability trade-offs).
   - **No Automated Downloads**: Strictly build integrations from scratch rather than downloading third-party scripts/packages from external unverified sources. This filters out bad actors and malware, protecting our local network.
5. **"The Hustle" Style Presentation**: Write in a conversational, witty, and analytical tone. Use a clean, light-mode HTML design (Inter font, off-white background, white cards, crimson accents).

---

## ⚙️ Architecture & Automation
- **Script**: `dailyNewsAgent.ts` (compiled to `dailyNewsAgent.js` in `backend/dist/`).
- **Local Cache Database**: `news_store.json` storing unique articles from the last 48 hours to ensure de-duplication.
- **Time-Based Routing**:
  - Script runs dynamically. If local time is inside the morning window (9:00 AM - 10:59 AM), it scrapes feeds, compiles the summary, and emails the digest.
  - At all other hours, it silently scrapes and updates `news_store.json`.
- **Scheduled Task**: Windows Task Scheduler job `UbuDailyAINews` running three times daily:
  - **9:30 AM EST** (Morning run: scrapes and emails briefing)
  - **3:30 PM EST** (Afternoon run: silent background scrape)
  - **9:30 PM EST** (Night run: silent background scrape)
- **Email Delivery**:
  - Primary: Sent via **Agentmail** API from `kennacuttingedge@agentmail.to`.
  - Fallback: Sent via **Gmail SMTP** (`EMAIL_USER` / `EMAIL_PASS` in `.env`) triggered through a dynamically generated PowerShell script if Agentmail fails.
