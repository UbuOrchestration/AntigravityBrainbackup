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

async function sendDailyBriefing() {
  const briefing = brainstormer.getNextBriefing();
  const mg = briefing.micro_gesture;
  const categoryLabel = briefing.category === 'acts_of_service' ? '🛠️ Acts of Service' : '💬 Words of Affirmation';

  log(`Preparing briefing for ${briefing.dateStr} (${briefing.dayOfWeek}). Category: ${briefing.category}`);

  // Build HTML Content
  let html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
    
    <!-- Header -->
    <div style="text-align: center; border-bottom: 2px solid #38bdf8; padding-bottom: 15px; margin-bottom: 25px;">
      <h1 style="color: #38bdf8; margin: 0; font-size: 24px; font-weight: bold;">✨ Curated Romance Briefing</h1>
      <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">${briefing.dayOfWeek}, ${briefing.dateStr}</p>
    </div>

    <!-- Daily Micro-Gesture -->
    <div style="background-color: #0f172a; border-left: 4px solid #ec4899; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <div style="font-size: 12px; text-transform: uppercase; tracking: 1px; color: #ec4899; font-weight: bold; margin-bottom: 6px;">
        Today's Micro-Gesture • ${categoryLabel}
      </div>
      <h2 style="color: #f43f5e; margin: 0 0 10px 0; font-size: 20px;">${mg.title}</h2>
      <p style="color: #f1f5f9; font-size: 16px; line-height: 1.5; margin: 0 0 15px 0;"><strong>Action:</strong> ${mg.action}</p>
      <div style="background-color: #1e293b; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #cbd5e1;">
        💡 <strong>Why this matters:</strong> ${mg.why}
      </div>
    </div>
`;

  // Weekend Date Ideas Section (if date planning day)
  if (briefing.isDatePlanningDay && briefing.date_ideas.length > 0) {
    html += `
    <div style="background-color: #0f172a; border-left: 4px solid #a855f7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <div style="font-size: 12px; text-transform: uppercase; tracking: 1px; color: #a855f7; font-weight: bold; margin-bottom: 10px;">
        🗓️ Midweek Weekend Date Ideas (Plan Ahead)
      </div>
`;
    briefing.date_ideas.forEach((date, idx) => {
      html += `
      <div style="margin-bottom: 15px; padding-bottom: 15px; ${idx < briefing.date_ideas.length - 1 ? 'border-bottom: 1px solid #334155;' : ''}">
        <h3 style="color: #c084fc; margin: 0 0 5px 0; font-size: 16px;">Option ${idx + 1}: ${date.title} (${date.type})</h3>
        <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 6px 0;"><strong>Prep:</strong> ${date.prep}</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">⏳ <strong>Time Commitment:</strong> ${date.time_investment}</p>
      </div>
      `;
    });
    html += `</div>`;
  }

  // Key Dates Countdown Section
  html += `
    <div style="background-color: #0f172a; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px;">
      <div style="font-size: 12px; text-transform: uppercase; color: #38bdf8; font-weight: bold; margin-bottom: 10px;">
        🗓️ Key Date Countdown Tracker
      </div>
      <ul style="list-style: none; padding: 0; margin: 0;">
`;

  briefing.countdowns.forEach(cd => {
    html += `
      <li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #334155; font-size: 14px;">
        <span style="color: #e2e8f0;"><strong>${cd.event}</strong> (${cd.formattedDate})</span>
        <span style="color: #f43f5e; font-weight: bold;">${cd.daysRemaining} days</span>
      </li>
    `;
  });

  html += `
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #334155; padding-top: 15px; color: #64748b; font-size: 12px;">
      Empowering thoughtful partnership • Sent autonomously by Antigravity Curated Romance
    </div>
  </div>
</body>
</html>
`;

  // Plain Text Version
  let plainText = `CURATED ROMANCE BRIEFING - ${briefing.dayOfWeek}, ${briefing.dateStr}\n\n`;
  plainText += `TODAY'S MICRO-GESTURE (${categoryLabel}):\n`;
  plainText += `Title: ${mg.title}\n`;
  plainText += `Action: ${mg.action}\n`;
  plainText += `Why it matters: ${mg.why}\n\n`;

  if (briefing.isDatePlanningDay && briefing.date_ideas.length > 0) {
    plainText += `WEEKEND DATE IDEAS:\n`;
    briefing.date_ideas.forEach((d, i) => {
      plainText += `${i + 1}. ${d.title} (${d.type})\n   Prep: ${d.prep}\n\n`;
    });
  }

  plainText += `KEY DATE COUNTDOWNS:\n`;
  briefing.countdowns.forEach(cd => {
    plainText += `- ${cd.event}: ${cd.daysRemaining} days remaining (${cd.formattedDate})\n`;
  });

  const subjectLine = `✨ Daily Romance Briefing: ${mg.title} (${briefing.dayOfWeek})`;

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
