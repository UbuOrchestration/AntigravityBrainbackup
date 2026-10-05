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
let inboxId = 'ubu@agentmail.to';
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

async function sendCommuteBriefing() {
  const briefing = brainstormer.getNextBriefing();
  const mg = briefing.micro_gesture;

  log(`Preparing commute briefing for ${briefing.dateStr} (${briefing.dayOfWeek}). Focus: Evening entry gesture.`);

  // Build HTML Content
  let html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
    
    <!-- Header -->
    <div style="text-align: center; border-bottom: 2px solid #f43f5e; padding-bottom: 15px; margin-bottom: 25px;">
      <h1 style="color: #f43f5e; margin: 0; font-size: 24px; font-weight: bold;">🚗 Commute Home Briefing</h1>
      <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Shift from Work Mode to Partner Mode • ${briefing.dayOfWeek}, ${briefing.dateStr}</p>
    </div>

    <!-- Commute Focus Box -->
    <div style="background-color: #0f172a; border-left: 4px solid #38bdf8; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <div style="font-size: 12px; text-transform: uppercase; tracking: 1px; color: #38bdf8; font-weight: bold; margin-bottom: 6px;">
        Tonight's Doorway Focus
      </div>
      <h2 style="color: #38bdf8; margin: 0 0 10px 0; font-size: 20px;">${mg.title}</h2>
      <p style="color: #f1f5f9; font-size: 16px; line-height: 1.5; margin: 0 0 15px 0;"><strong>Action:</strong> ${mg.action}</p>
      <div style="background-color: #1e293b; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #cbd5e1;">
        💡 <strong>Mindset shift:</strong> ${mg.why}
      </div>
    </div>

    <!-- Quick Commute Checklist -->
    <div style="background-color: #0f172a; border-radius: 8px; padding: 18px 20px; margin-bottom: 25px;">
      <div style="font-size: 12px; text-transform: uppercase; color: #fbbf24; font-weight: bold; margin-bottom: 10px;">
        ⚡ 30-Second Commute Checklist
      </div>
      <ul style="padding-left: 20px; margin: 0; color: #e2e8f0; font-size: 14px; line-height: 1.7;">
        <li><strong>Leave work in the car:</strong> Take a deep breath before opening the front door.</li>
        <li><strong>Immediate Baby Swap:</strong> Greet her warmly and offer immediate arms-free relief.</li>
        <li><strong>Effort Praise:</strong> Acknowledge her hard work today in a quiet private moment at home.</li>
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
  let plainText = `CURATED ROMANCE COMMUTE BRIEFING - ${briefing.dayOfWeek}, ${briefing.dateStr}\n\n`;
  plainText += `TONIGHT'S DOORWAY FOCUS:\n`;
  plainText += `Title: ${mg.title}\n`;
  plainText += `Action: ${mg.action}\n`;
  plainText += `Why it matters: ${mg.why}\n\n`;

  plainText += `30-SECOND COMMUTE CHECKLIST:\n`;
  plainText += `1. Leave work stress in the car.\n`;
  plainText += `2. Greet her warmly & take the baby immediately.\n`;
  plainText += `3. Offer effort praise during a quiet home moment.\n`;

  const subjectLine = `🚗 Commute Briefing: ${mg.title} (${briefing.dayOfWeek})`;

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

  log(`Sending commute briefing to ${userEmail} via Agentmail (${inboxId})...`);

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const responseJson = JSON.parse(responseBody);
          log(`Successfully sent commute briefing. Message ID: ${responseJson.message_id || 'OK'}`);
          resolve(true);
        } else {
          log(`Error sending commute email. Status: ${res.statusCode}, Body: ${responseBody}`);
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
  sendCommuteBriefing().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { sendCommuteBriefing };
