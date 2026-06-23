import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { exec } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

interface Article {
  title: string;
  link: string;
  snippet: string;
  source: string;
  date: string;
  fetchedAt: string;
}

function log(msg: string) {
  const formatted = `[${new Date().toISOString()}] ${msg}`;
  console.log(formatted);
  fs.appendFileSync(LOG_PATH, formatted + '\n');
}

// Helper to make HTTPS GET requests
function httpGet(url: string, headers: Record<string, string> = {}): Promise<string> {
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
        } else if (res.statusCode === 301 || res.statusCode === 302) {
          // Follow redirect once
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            httpGet(redirectUrl, headers).then(resolve).catch(reject);
          } else {
            reject(new Error(`Redirect location missing for status ${res.statusCode}`));
          }
        } else {
          reject(new Error(`HTTP status code ${res.statusCode} for ${url}`));
        }
      });
    }).on('error', reject);
  });
}

// Simple XML RSS parser
function parseRss(xmlText: string, sourceName: string): Article[] {
  const articles: Article[] = [];
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
async function scrapeHackerNews(): Promise<Article[]> {
  try {
    log('Fetching Hacker News AI stories...');
    const url = 'https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=created_at_i%3E' + (Math.floor(Date.now() / 1000) - 86400) + '&query=AI';
    const responseText = await httpGet(url);
    const data = JSON.parse(responseText);
    const hits = data.hits || [];
    
    return hits.map((hit: any) => ({
      title: hit.title,
      link: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      snippet: `Author: ${hit.author} | Points: ${hit.points} | Comments: ${hit.num_comments}`,
      source: 'Hacker News',
      date: new Date(hit.created_at).toUTCString(),
      fetchedAt: new Date().toISOString()
    }));
  } catch (e) {
    log(`Error scraping Hacker News: ${(e as Error).message}`);
    return [];
  }
}

// Scrape TechCrunch AI Feed
async function scrapeTechCrunch(): Promise<Article[]> {
  try {
    log('Fetching TechCrunch AI feed...');
    const url = 'https://techcrunch.com/category/artificial-intelligence/feed/';
    const responseText = await httpGet(url);
    return parseRss(responseText, 'TechCrunch AI');
  } catch (e) {
    log(`Error scraping TechCrunch: ${(e as Error).message}`);
    return [];
  }
}

// Scrape OpenAI News Feed
async function scrapeOpenAI(): Promise<Article[]> {
  try {
    log('Fetching OpenAI feed...');
    const url = 'https://openai.com/news/rss.xml';
    const responseText = await httpGet(url);
    return parseRss(responseText, 'OpenAI Blog');
  } catch (e) {
    log(`Error scraping OpenAI: ${(e as Error).message}`);
    return [];
  }
}

// Load, fetch, merge, de-duplicate and save articles
export async function runScraper(): Promise<Article[]> {
  log('Starting daily AI news scraping run...');
  
  let store: { articles: Article[], lastUpdated?: string } = { articles: [] };
  if (fs.existsSync(STORE_PATH)) {
    try {
      store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    } catch (e) {
      log(`Error reading news store, resetting: ${(e as Error).message}`);
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
  const seenLinks = new Set<string>();
  const mergedArticles: Article[] = [];

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
export async function generateReport(): Promise<{ html: string, text: string }> {
  log('Generating daily intelligence report...');
  
  if (!fs.existsSync(STORE_PATH)) {
    throw new Error('News store file does not exist. Run scraper first.');
  }

  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  const articles: Article[] = store.articles;

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are the "Cutting Edge" AI Intelligence Agent for our organization. 
Your job is to read the latest daily AI updates and produce an extremely premium, concise, and actionable intelligence briefing.

Follow these strict rules:
1. Tone: Direct, concise, ELI5 (explain simply without heavy jargon), no fluff.
2. Structure:
   - "📰 Top AI News & Core Updates": Summarize the 4-5 most important announcements. Focus on what changed, why it matters, and direct links.
   - "🛠️ New Developer Tools & Open Source Models": Highlight new APIs, models, or developer releases.
   - "💡 Actionable Workflow & Process Implementations": Create concrete, realistic action steps on how we can integrate these updates into our current workflows (such as MealMate, eBay Arbitrage, AutoCAD Lead Generation, or the Agentic Platform) to optimize efficiency or save costs.
3. Design: Generate ONLY clean, responsive HTML nested inside a body wrapper. Use modern web design with a deep slate/blue dark mode (#0b0c10 background, #1f2833 card background, #66fcf1 accent colors, and white/gray text). Do NOT return markdown block ticks (\`\`\`html) in your response, return ONLY the raw HTML string.`
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
  } catch (e) {
    log(`Error calling Gemini for synthesis: ${(e as Error).message}. Falling back to basic newsletter.`);
    return generateFallbackNewsletter(sourceArticles);
  }
}

// Fallback newsletter generator if Gemini fails or Key is missing
function generateFallbackNewsletter(articles: Article[]): { html: string, text: string } {
  const displayArticles = articles.slice(0, 20);
  let html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #0b0c10; color: #c5c6c7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1f2833; padding: 30px; border-radius: 8px;">
    <h2 style="color: #66fcf1; text-align: center; border-bottom: 2px solid #66fcf1; padding-bottom: 10px; margin-bottom: 25px;">
      Kenna Cutting Edge - Daily AI Intelligence (Fallback)
    </h2>
    <p>Good morning! Here are the latest news items scraped today. (Gemini summarizer is currently in offline mode).</p>
    <ul style="padding-left: 20px; line-height: 1.6;">
  `;

  displayArticles.forEach(art => {
    html += `<li style="margin-bottom: 15px;">
      <strong style="color: #ffffff;"><a href="${art.link}" style="color: #66fcf1; text-decoration: none;">${art.title}</a></strong> <span style="font-size: 11px; color: #8892b0;">[${art.source}]</span>
      <p style="margin: 5px 0; font-size: 13px;">${art.snippet}</p>
    </li>`;
  });

  html += `
    </ul>
    <div style="margin-top: 30px; background-color: #2c3e50; padding: 15px; border-radius: 6px; font-size: 12px;">
      <strong>Note:</strong> To enable automated summary briefings and workflow action items, please configure a valid <code>GEMINI_API_KEY</code> in the environment.
    </div>
    <p style="font-size: 11px; color: #8892b0; text-align: center; margin-top: 30px; border-top: 1px solid #455a64; padding-top: 15px;">
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
export async function sendNewsletter(html: string, text: string): Promise<boolean> {
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
          } else {
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
  } else {
    log('Agentmail API key missing. Trying SMTP fallback directly...');
    return sendSmtpFallback(html, text);
  }
}

// Fallback sending method using local powershell SMTP script
function sendSmtpFallback(html: string, text: string): Promise<boolean> {
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

    exec(`powershell -ExecutionPolicy Bypass -File "${tempPs1Path}"`, (error, stdout, stderr) => {
      // Cleanup
      try { fs.unlinkSync(tempPs1Path); } catch (e) {}

      if (error) {
        log(`❌ PowerShell SMTP fallback failed: ${error.message}. Stderr: ${stderr}`);
        resolve(false);
      } else {
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
    } else if (isReportOnly) {
      const report = await generateReport();
      if (isTest) {
        log('--- DRY RUN REPORT (HTML) ---');
        console.log(report.html);
      } else {
        await sendNewsletter(report.html, report.text);
      }
    } else {
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
        } else {
          await sendNewsletter(report.html, report.text);
        }
      } else {
        log('Non-morning window detected. Running feed scrape only.');
        await runScraper();
      }
    }
  } catch (err) {
    log(`FATAL ERROR in dailyNewsAgent: ${(err as Error).message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
