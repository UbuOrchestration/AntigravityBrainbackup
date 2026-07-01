"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScraper = runScraper;
exports.generateReport = generateReport;
exports.sendNewsletter = sendNewsletter;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const child_process_1 = require("child_process");
const generative_ai_1 = require("@google/generative-ai");
// Load environment variables from agentic-platform root .env
const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}
const STORE_PATH = path.resolve(__dirname, '..', '..', 'news_store.json');
const LOG_PATH = path.resolve(__dirname, '..', '..', 'daily_news.log');
function log(msg) {
    const formatted = `[${new Date().toISOString()}] ${msg}`;
    console.log(formatted);
    fs.appendFileSync(LOG_PATH, formatted + '\n');
}
// Helper to make HTTPS GET requests
function httpGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...headers
            }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                }
                else if (res.statusCode === 301 || res.statusCode === 302) {
                    // Follow redirect once
                    const redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        httpGet(redirectUrl, headers).then(resolve).catch(reject);
                    }
                    else {
                        reject(new Error(`Redirect location missing for status ${res.statusCode}`));
                    }
                }
                else {
                    reject(new Error(`HTTP status code ${res.statusCode} for ${url}`));
                }
            });
        }).on('error', reject);
    });
}
// Simple XML RSS parser
function parseRss(xmlText, sourceName) {
    const articles = [];
    const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || xmlText.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
    for (const item of itemMatches) {
        const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || item.match(/<link[^>]*href=["']([^"']+)["']/)?.[1] || '';
        const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || item.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '';
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || item.match(/<updated>([\s\S]*?)<\/updated>/)?.[1] || '';
        // Clean CDATA and HTML tags
        const cleanTitle = title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim();
        let cleanLink = link.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
        // Some RSS links are inside CDATA or nested HTML
        cleanLink = cleanLink.replace(/<[^>]*>/g, '');
        const cleanSnippet = description.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').substring(0, 300).trim();
        if (cleanTitle && cleanLink) {
            articles.push({
                title: cleanTitle,
                link: cleanLink,
                snippet: cleanSnippet,
                source: sourceName,
                date: pubDate || new Date().toUTCString(),
                fetchedAt: new Date().toISOString()
            });
        }
    }
    return articles;
}
// Scrape Hacker News Algolia Search API
async function scrapeHackerNews() {
    try {
        log('Fetching Hacker News AI stories...');
        const url = 'https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=created_at_i%3E' + (Math.floor(Date.now() / 1000) - 86400) + '&query=AI';
        const responseText = await httpGet(url);
        const data = JSON.parse(responseText);
        const hits = data.hits || [];
        return hits.map((hit) => ({
            title: hit.title,
            link: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            snippet: `Author: ${hit.author} | Points: ${hit.points} | Comments: ${hit.num_comments}`,
            source: 'Hacker News',
            date: new Date(hit.created_at).toUTCString(),
            fetchedAt: new Date().toISOString()
        }));
    }
    catch (e) {
        log(`Error scraping Hacker News: ${e.message}`);
        return [];
    }
}
// Scrape TechCrunch AI Feed
async function scrapeTechCrunch() {
    try {
        log('Fetching TechCrunch AI feed...');
        const url = 'https://techcrunch.com/category/artificial-intelligence/feed/';
        const responseText = await httpGet(url);
        return parseRss(responseText, 'TechCrunch AI');
    }
    catch (e) {
        log(`Error scraping TechCrunch: ${e.message}`);
        return [];
    }
}
// Scrape OpenAI News Feed
async function scrapeOpenAI() {
    try {
        log('Fetching OpenAI feed...');
        const url = 'https://openai.com/news/rss.xml';
        const responseText = await httpGet(url);
        return parseRss(responseText, 'OpenAI Blog');
    }
    catch (e) {
        log(`Error scraping OpenAI: ${e.message}`);
        return [];
    }
}
// Load, fetch, merge, de-duplicate and save articles
async function runScraper() {
    log('Starting daily AI news scraping run...');
    let store = { articles: [] };
    if (fs.existsSync(STORE_PATH)) {
        try {
            store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        }
        catch (e) {
            log(`Error reading news store, resetting: ${e.message}`);
        }
    }
    const [hn, tc, oa] = await Promise.all([
        scrapeHackerNews(),
        scrapeTechCrunch(),
        scrapeOpenAI()
    ]);
    const newArticles = [...hn, ...tc, ...oa];
    log(`Scraped a total of ${newArticles.length} articles from feeds.`);
    // Merge & De-duplicate by link
    const seenLinks = new Set();
    const mergedArticles = [];
    // Keep new articles first
    for (const art of newArticles) {
        if (!seenLinks.has(art.link)) {
            seenLinks.add(art.link);
            mergedArticles.push(art);
        }
    }
    // Add historical articles that are not duplicates and not older than 48 hours
    const cutoffTime = Date.now() - 48 * 60 * 60 * 1000;
    for (const art of store.articles) {
        if (!seenLinks.has(art.link)) {
            const artTime = new Date(art.fetchedAt).getTime();
            if (artTime > cutoffTime) {
                seenLinks.add(art.link);
                mergedArticles.push(art);
            }
        }
    }
    store.articles = mergedArticles;
    store.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
    log(`News store updated successfully. Total unique articles retained: ${store.articles.length}`);
    return store.articles;
}
// Generate the HTML newsletter using Gemini
async function generateReport() {
    log('Generating daily intelligence report...');
    if (!fs.existsSync(STORE_PATH)) {
        throw new Error('News store file does not exist. Run scraper first.');
    }
    const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    const articles = store.articles;
    // Filter for articles from the last 24 hours
    const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentArticles = articles.filter(art => new Date(art.fetchedAt).getTime() > cutoff24h);
    if (recentArticles.length === 0) {
        log('No new articles found in the last 24 hours. Compiling from full database.');
    }
    const sourceArticles = recentArticles.length > 0 ? recentArticles : articles.slice(0, 15);
    const articleListString = sourceArticles.map((art, idx) => {
        return `${idx + 1}. TITLE: ${art.title}\n   LINK: ${art.link}\n   SOURCE: ${art.source}\n   SNIPPET: ${art.snippet}\n`;
    }).join('\n');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        log('WARNING: GEMINI_API_KEY is not defined. Generating a basic fallback newsletter.');
        return generateFallbackNewsletter(sourceArticles);
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are the writer for "Cutting Edge," a premium, daily AI news briefing for our organization, written in the style of Hubspot's "The Hustle" newsletter.

Your goals are:
1. SIFT THE TRUTH: Deeply analyze the raw news articles to filter out general press releases, funding hype, and basic BS fluff. 
2. ONLY RELEVANT SIGNALS: Only include updates if they can be directly connected to improving our specific organization workflows:
   - "MealMate" (meal planning, grocery cart builders, stockpile/pantry tracking).
   - "eBay Arbitrage" (RV products, scanning listings, arbitrage pricing models).
   - "AutoCAD Lead Gen" (AutoCAD outreach, general contractor drafting bids, permit drawings).
   - "Agentic Platform" (agent execution limits, git backup logs, Discord bot interface, CLI tools).
   If an update doesn't help us with any of these four areas, discard it completely.
3. CLEAR INTEGRATION & SIMULATED SANDBOX: For every workflow connection/recommendation, you must:
   - Clearly and concisely define *how* it improves the workflow.
   - Create a mini-implementation plan.
   - Describe a simulated sandbox scenario evaluating how helpful it really will be (including cost, speed, and real-world limits).
   - Emphasize building custom tools from scratch rather than downloading third-party modules or scripts from outside sources, to filter out bad actors, malicious packages, or network vulnerabilities.
4. WRITING STYLE: High-impact, conversational, witty, analytical, bold, and extremely direct. Use short paragraphs and bold key sentences for readability.
5. STRUCTURE:
   - Header Banner: Clean title "CUTTING EDGE" and a snappy subtitle quote (e.g. "Your daily AI intelligence digest. Only the signal. Zero fluff.").
   - "The Big Story": Focus on the single most important, validated AI announcement of the day. Structure it strictly with these sections:
     * "The Scoop": Witty explanation of what happened.
     * "Hype vs. Reality": Hard-hitting analysis showing why this is actually important and not just marketing fluff.
     * "How We Apply It": Clearly define how it improves our workflow, specify the scratch-built implementation plan, and outline the simulated sandbox scenario analyzing its true value/security trade-offs.
   - "Signal Over Noise": 2-3 other critical updates that passed our relevance filter. Format each as:
     * Bold, punchy headline.
     * Snappy 1-2 sentence recap.
     * **The Connection**: Clearly define the scratch-built workflow application and simulated benefit.
   - "The Daily Checklist": 2-3 actionable checklist items for our developers/operators to execute today based on the news.

6. DESIGN SYSTEM: Generate ONLY clean, responsive HTML nested inside a body. Use a premium light-mode "Hustle" design:
   - Font: Inter, system-ui, sans-serif.
   - Background: Off-white (#f4f4f7).
   - Card Background: Pure white (#ffffff) with 1px solid #e5e7eb border and soft shadow.
   - Accent color: Vibrant crimson/orange (#ff3e3e).
   - Header line: Bold accent-colored border (3px solid #ff3e3e).
   - Primary Text: Charcoal dark (#111827).
   - Secondary Text: Medium gray (#4b5563).
   - Use proper headings (h1, h2, h3, h4) and lists.
   
DO NOT return any markdown code block wrappers (like \`\`\`html). Output ONLY the raw HTML string.`
        });
        const prompt = `Here are the raw articles scraped from reputable sources in the last 24 hours:\n\n${articleListString}\n\nCompile them into the daily intelligence briefing. Make sure all titles link back to their source URL using clean anchor tags.`;
        const result = await model.generateContent(prompt);
        let htmlContent = result.response.text().trim();
        // Clean any accidentally outputted markdown code block wrappers
        if (htmlContent.startsWith('```html')) {
            htmlContent = htmlContent.substring(7);
        }
        if (htmlContent.endsWith('```')) {
            htmlContent = htmlContent.substring(0, htmlContent.length - 3);
        }
        htmlContent = htmlContent.trim();
        const plainText = `DAILY AI INTELLIGENCE REPORT\n\nGenerated by Cutting Edge News Agent.\n\n${sourceArticles.map(a => `- ${a.title} (${a.link})`).join('\n')}`;
        return { html: htmlContent, text: plainText };
    }
    catch (e) {
        log(`Error calling Gemini for synthesis: ${e.message}. Falling back to basic newsletter.`);
        return generateFallbackNewsletter(sourceArticles);
    }
}
// Fallback newsletter generator if Gemini fails or Key is missing
function generateFallbackNewsletter(articles) {
    const displayArticles = articles.slice(0, 20);
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f4f4f7; color: #1f2937; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { border-bottom: 3px solid #ff3e3e; padding-bottom: 15px; margin-bottom: 25px; text-align: center; }
    .title { color: #111827; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
    .subtitle { color: #6b7280; font-size: 13px; margin-top: 5px; }
    .article-item { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #f3f4f6; list-style-type: none; }
    .article-link { color: #ff3e3e; text-decoration: none; font-weight: 700; font-size: 16px; }
    .article-link:hover { text-decoration: underline; }
    .article-source { font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: bold; margin-left: 5px; }
    .article-snippet { margin: 8px 0 0 0; font-size: 14px; color: #4b5563; line-height: 1.5; }
    .footer { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
    .badge { background-color: #f3f4f6; color: #4b5563; padding: 12px; border-radius: 6px; font-size: 12px; margin-top: 25px; border-left: 4px solid #ff3e3e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Cutting Edge</h1>
      <div class="subtitle">Your daily AI intelligence digest. Only the signal. Zero fluff.</div>
    </div>
    <p>Good morning! Here are the latest news items scraped today. (Gemini summarizer is currently in offline mode).</p>
    <ul style="padding: 0; margin: 0;">
  `;
    displayArticles.forEach(art => {
        html += `<li class="article-item">
      <strong><a href="${art.link}" class="article-link">${art.title}</a></strong><span class="article-source">[${art.source}]</span>
      <p class="article-snippet">${art.snippet}</p>
    </li>`;
    });
    html += `
    </ul>
    <div class="badge">
      <strong>Note:</strong> To enable automated summary briefings and workflow action items, please configure a valid <code>GEMINI_API_KEY</code> in the environment.
    </div>
    <p class="footer">
      Sent autonomously by Kenna Cutting Edge News Agent via Agentmail.
    </p>
  </div>
</body>
</html>
  `;
    const text = `DAILY AI INTELLIGENCE REPORT (Fallback)\n\n${displayArticles.map(a => `- ${a.title} [${a.source}] (${a.link})`).join('\n')}`;
    return { html, text };
}
// Send the compiled report via Agentmail or Gmail SMTP fallback
async function sendNewsletter(html, text) {
    const recipient = "michaelkenna3@gmail.com";
    const agentmailKey = process.env.AGENTMAIL_API_KEY;
    const inboxId = "kennacuttingedge@agentmail.to"; // The new inbox created specifically for this process
    if (agentmailKey) {
        log(`Sending news digest to ${recipient} via Agentmail (kennacuttingedge@agentmail.to)...`);
        const postData = JSON.stringify({
            to: [recipient],
            subject: "Daily AI Intelligence Briefing - Cutting Edge",
            html: html,
            text: text
        });
        const options = {
            hostname: 'api.agentmail.to',
            port: 443,
            path: `/v0/inboxes/${inboxId}/messages/send`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${agentmailKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        return new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        log('Successfully sent email via Agentmail API.');
                        resolve(true);
                    }
                    else {
                        log(`Failed to send via Agentmail. Code: ${res.statusCode}, Body: ${body}. Trying SMTP fallback...`);
                        sendSmtpFallback(html, text).then(resolve);
                    }
                });
            });
            req.on('error', (err) => {
                log(`Agentmail request error: ${err.message}. Trying SMTP fallback...`);
                sendSmtpFallback(html, text).then(resolve);
            });
            req.write(postData);
            req.end();
        });
    }
    else {
        log('Agentmail API key missing. Trying SMTP fallback directly...');
        return sendSmtpFallback(html, text);
    }
}
// Fallback sending method using local powershell SMTP script
function sendSmtpFallback(html, text) {
    return new Promise((resolve) => {
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;
        if (!emailUser || !emailPass) {
            log('❌ Fallback failed: No Gmail SMTP credentials found in .env');
            resolve(false);
            return;
        }
        log(`Triggering PowerShell SMTP send fallback to michaelkenna3@gmail.com...`);
        // We can write a temp PS1 script to execute the send
        const tempPs1Path = path.join(__dirname, 'temp_send_mail.ps1');
        // Escape HTML quotes and backticks for PowerShell heredoc
        const escapedHtml = html.replace(/`/g, '``').replace(/\$/g, '`$');
        const escapedText = text.replace(/`/g, '``').replace(/\$/g, '`$');
        const psScript = `
$emailUser = "${emailUser}"
$emailPass = "${emailPass}"
$subject = "Daily AI Intelligence Briefing - Cutting Edge (SMTP Fallback)"
$to = "michaelkenna3@gmail.com"

$secpasswd = ConvertTo-SecureString $emailPass -AsPlainText -Force
$creds = New-Object System.Management.Automation.PSCredential ($emailUser, $secpasswd)

$mail = New-Object System.Net.Mail.MailMessage
$mail.From = New-Object System.Net.Mail.MailAddress($emailUser)
$mail.To.Add($to)
$mail.Subject = $subject
$mail.IsBodyHtml = $true
$mail.Body = @'
${escapedHtml}
'@

$smtp = New-Object System.Net.Mail.SmtpClient("smtp.gmail.com", 587)
$smtp.EnableSsl = $true
$smtp.Credentials = $creds
$smtp.Send($mail)
$mail.Dispose()
$smtp.Dispose()
Write-Output "Successfully sent SMTP mail"
`;
        fs.writeFileSync(tempPs1Path, psScript, 'utf8');
        (0, child_process_1.exec)(`powershell -ExecutionPolicy Bypass -File "${tempPs1Path}"`, (error, stdout, stderr) => {
            // Cleanup
            try {
                fs.unlinkSync(tempPs1Path);
            }
            catch (e) { }
            if (error) {
                log(`❌ PowerShell SMTP fallback failed: ${error.message}. Stderr: ${stderr}`);
                resolve(false);
            }
            else {
                log('✅ PowerShell SMTP fallback succeeded.');
                resolve(true);
            }
        });
    });
}
// Command line entry point for Task Scheduler
async function main() {
    const args = process.argv.slice(2);
    const isTest = args.includes('--test');
    const isScrapeOnly = args.includes('--scrape');
    const isReportOnly = args.includes('--report');
    try {
        if (isScrapeOnly) {
            await runScraper();
            log('Scrape run finished.');
        }
        else if (isReportOnly) {
            const report = await generateReport();
            if (isTest) {
                log('--- DRY RUN REPORT (HTML) ---');
                console.log(report.html);
            }
            else {
                await sendNewsletter(report.html, report.text);
            }
        }
        else {
            // Default auto-run behavior (e.g. from Windows Scheduled Task)
            // Check the current local hour. If it's around the morning briefing window (9:00 AM - 10:59 AM),
            // we run both scrape and digest report. Otherwise (afternoon/night), we run scrape only.
            const currentHour = new Date().getHours();
            log(`Auto-run activated. Current local hour: ${currentHour}`);
            if (currentHour >= 9 && currentHour <= 10) {
                log('Morning briefing window detected. Scraping latest news and delivering email briefing...');
                await runScraper();
                const report = await generateReport();
                if (isTest) {
                    log('--- DRY RUN REPORT (HTML) ---');
                    console.log(report.html);
                }
                else {
                    await sendNewsletter(report.html, report.text);
                }
            }
            else {
                log('Non-morning window detected. Running feed scrape only.');
                await runScraper();
            }
        }
    }
    catch (err) {
        log(`FATAL ERROR in dailyNewsAgent: ${err.message}`);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
