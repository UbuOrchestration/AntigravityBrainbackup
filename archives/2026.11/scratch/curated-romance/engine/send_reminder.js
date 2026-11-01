const https = require('https');
const fs = require('fs');
const path = require('path');
const brainstormer = require('./brainstormer');

const envPath = path.join(__dirname, '..', '.env');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// 1. Load credentials
let apiKey = '';
let inboxId = 'curatedromance@agentmail.to';
let userEmail = 'michaelkenna3@gmail.com';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const matchKey = line.match(/^AGENTMAIL_API_KEY=(.*)/);
    const matchInbox = line.match(/^AGENTMAIL_INBOX_ID=(.*)/);
    const matchUser = line.match(/^USER_EMAIL=(.*)/);
    if (matchKey) apiKey = matchKey[1].trim();
    if (matchInbox) inboxId = matchInbox[1].trim();
    if (matchUser) userEmail = matchUser[1].trim();
  });
}

if (!apiKey) {
  log('Error: AGENTMAIL_API_KEY not found in .env');
  process.exit(1);
}

const CATEGORY_LABELS = {
  acts_of_service: 'Acts of Service',
  words_of_affirmation: 'Words of Affirmation',
  creative_home_experiences: 'At-Home Experience',
  thoughtful_surprises_and_treats: 'Thoughtful Surprise',
  conversational_prompts_and_questions: 'Conversation Prompt'
};

async function sendDailyBriefing() {
  const briefing = brainstormer.getNextBriefing();
  const mg = briefing.micro_gesture;
  const categoryLabel = CATEGORY_LABELS[briefing.category] || briefing.category;

  log(`Preparing briefing for ${briefing.dateStr} (${briefing.dayOfWeek}). Category: ${briefing.category}`);

  // Build HTML Content
  let html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; margin: 0; line-height: 1.5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 8px; border: 1px solid #334155;">
    
    <!-- Header -->
    <div style="border-bottom: 1px solid #334155; padding-bottom: 15px; margin-bottom: 24px;">
      <h1 style="color: #f8fafc; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em;">Curated Romance: Daily Briefing</h1>
      <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">${briefing.dayOfWeek}, ${briefing.dateStr}</p>
    </div>

    <!-- Daily Partner Mindset Tip -->
    <div style="background-color: #0f172a; border-left: 3px solid #38bdf8; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px; font-size: 14px; color: #e2e8f0;">
      <strong style="color: #38bdf8; display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Partner Mindset</strong>
      ${briefing.dailyTip}
    </div>

    <!-- Daily Focus / Micro-Gesture -->
    <div style="background-color: #0f172a; padding: 20px; border-radius: 6px; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 8px;">
        Today's Focus &bull; ${categoryLabel}
      </div>
      <h2 style="color: #f8fafc; margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">${mg.title}</h2>
      <p style="color: #cbd5e1; font-size: 15px; line-height: 1.5; margin: 0 0 14px 0;"><strong>Action:</strong> ${mg.action}</p>
      <div style="background-color: #1e293b; padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #94a3b8;">
        <strong style="color: #cbd5e1;">Context:</strong> ${mg.why}
      </div>
    </div>
`;

  // Weekend Date Ideas Section (if date planning day)
  if (briefing.isDatePlanningDay && briefing.date_ideas.length > 0) {
    html += `
    <div style="background-color: #0f172a; padding: 20px; border-radius: 6px; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 12px;">
        Weekend Date Ideas (Low Friction / At-Home)
      </div>
`;
    briefing.date_ideas.forEach((date, idx) => {
      html += `
      <div style="margin-bottom: 14px; padding-bottom: 14px; ${idx < briefing.date_ideas.length - 1 ? 'border-bottom: 1px solid #1e293b;' : ''}">
        <h3 style="color: #f8fafc; margin: 0 0 4px 0; font-size: 15px; font-weight: 600;">Option ${idx + 1}: ${date.title} (${date.type})</h3>
        <p style="color: #cbd5e1; font-size: 13px; margin: 0 0 4px 0;"><strong>Prep:</strong> ${date.prep}</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;"><strong>Time investment:</strong> ${date.time_investment}</p>
      </div>
      `;
    });
    html += `</div>`;
  }

  // Key Dates Countdown Section
  html += `
    <div style="background-color: #0f172a; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 10px;">
        Upcoming Key Dates
      </div>
      <ul style="list-style: none; padding: 0; margin: 0;">
`;

  briefing.countdowns.forEach(cd => {
    html += `
      <li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #1e293b; font-size: 13px;">
        <span style="color: #cbd5e1;">${cd.event} (${cd.formattedDate})</span>
        <span style="color: #f8fafc; font-weight: 600;">${cd.daysRemaining} days</span>
      </li>
    `;
  });

  html += `
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #334155; padding-top: 14px; color: #64748b; font-size: 12px;">
      Curated Romance &bull; Scheduled Daily Briefing
    </div>
  </div>
</body>
</html>
`;

  // Plain Text Version
  let plainText = `CURATED ROMANCE: DAILY BRIEFING - ${briefing.dayOfWeek}, ${briefing.dateStr}\n\n`;
  plainText += `PARTNER MINDSET:\n${briefing.dailyTip}\n\n`;
  plainText += `TODAY'S FOCUS (${categoryLabel}):\n`;
  plainText += `Title: ${mg.title}\n`;
  plainText += `Action: ${mg.action}\n`;
  plainText += `Context: ${mg.why}\n\n`;

  if (briefing.isDatePlanningDay && briefing.date_ideas.length > 0) {
    plainText += `WEEKEND DATE IDEAS:\n`;
    briefing.date_ideas.forEach((d, i) => {
      plainText += `${i + 1}. ${d.title} (${d.type})\n   Prep: ${d.prep}\n   Time: ${d.time_investment}\n\n`;
    });
  }

  plainText += `KEY DATES:\n`;
  briefing.countdowns.forEach(cd => {
    plainText += `- ${cd.event}: ${cd.daysRemaining} days remaining (${cd.formattedDate})\n`;
  });

  const subjectLine = `Daily Briefing: ${mg.title} (${briefing.dayOfWeek})`;

  const postData = JSON.stringify({
    to: [userEmail],
    from_name: "Curated Romance",
    subject: subjectLine,
    html: html,
    text: plainText
  });

  const options = {
    hostname: 'api.agentmail.to',
    port: 443,
    path: `/v0/inboxes/${inboxId}/messages/send`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  log(`Sending romance briefing to ${userEmail} via Agentmail (${inboxId})...`);

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const responseJson = JSON.parse(responseBody);
          log(`Successfully sent briefing. Message ID: ${responseJson.message_id || 'OK'}`);
          brainstormer.recordSentBriefing(briefing);
          resolve(true);
        } else {
          log(`Error sending email. Status: ${res.statusCode}, Body: ${responseBody}`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      log(`Request error: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Allow direct CLI execution
if (require.main === module) {
  sendDailyBriefing().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { sendDailyBriefing };
