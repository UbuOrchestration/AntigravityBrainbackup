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

async function sendCommuteBriefing() {
  const briefing = brainstormer.getCommuteBriefing();
  const focus = briefing.focus;

  log(`Preparing commute briefing for ${briefing.dateStr} (${briefing.dayOfWeek}). Focus: ${focus.title}`);

  // Build HTML Content tailored to pre-dinner arrival, tired parents, dark outside
  let html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
    
    <!-- Header -->
    <div style="text-align: center; border-bottom: 2px solid #f43f5e; padding-bottom: 15px; margin-bottom: 25px;">
      <h1 style="color: #f43f5e; margin: 0; font-size: 24px; font-weight: bold;">🚗 Commute Home Briefing</h1>
      <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Arrival, Dinner & Decompression • ${briefing.dayOfWeek}, ${briefing.dateStr}</p>
    </div>

    <!-- Commute Mindset Tip -->
    <div style="background-color: #1a2238; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 14px; color: #fbbf24; line-height: 1.5;">
      <strong>💡 Drive-Home Mindset:</strong> ${briefing.commuteTip}
    </div>

    <!-- Commute Focus Box -->
    <div style="background-color: #0f172a; border-left: 4px solid #38bdf8; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <div style="font-size: 12px; text-transform: uppercase; tracking: 1px; color: #38bdf8; font-weight: bold; margin-bottom: 6px;">
        Tonight's Doorway & Dinner Focus
      </div>
      <h2 style="color: #38bdf8; margin: 0 0 10px 0; font-size: 20px;">${focus.title}</h2>
      <p style="color: #f1f5f9; font-size: 16px; line-height: 1.5; margin: 0 0 15px 0;"><strong>Action:</strong> ${focus.action}</p>
      <div style="background-color: #1e293b; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #cbd5e1;">
        💡 <strong>Why this matters right now:</strong> ${focus.why}
      </div>
    </div>

    <!-- Quick Arrival Realities Checklist -->
    <div style="background-color: #0f172a; border-radius: 8px; padding: 18px 20px; margin-bottom: 25px;">
      <div style="font-size: 12px; text-transform: uppercase; color: #ec4899; font-weight: bold; margin-bottom: 10px;">
        ⚡ Evening Survival Principles (Sun Down • Pre-Dinner)
      </div>
      <ul style="padding-left: 20px; margin: 0; color: #e2e8f0; font-size: 14px; line-height: 1.7;">
        <li><strong>Arms-Free Baby Relief:</strong> Take baby the moment you step in so her arms can drop.</li>
        <li><strong>Dinner Triage:</strong> Neither of you has eaten; make sure she gets to eat warm food with two hands.</li>
        <li><strong>Zero Exploration / Zero Pressure:</strong> No plans, no outings; focus entirely on team-tackling dinner and calming the house.</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #334155; padding-top: 15px; color: #64748b; font-size: 12px;">
      Empowering thoughtful partnership • Sent autonomously by Curated Romance
    </div>
  </div>
</body>
</html>
`;

  // Plain Text Version
  let plainText = `CURATED ROMANCE COMMUTE BRIEFING - ${briefing.dayOfWeek}, ${briefing.dateStr}\n\n`;
  plainText += `DRIVE-HOME MINDSET:\n${briefing.commuteTip}\n\n`;
  plainText += `TONIGHT'S DOORWAY & DINNER FOCUS:\n`;
  plainText += `Title: ${focus.title}\n`;
  plainText += `Action: ${focus.action}\n`;
  plainText += `Why it matters: ${focus.why}\n\n`;
  plainText += `EVENING SURVIVAL PRINCIPLES:\n`;
  plainText += `1. Immediate arms-free relief for her.\n`;
  plainText += `2. Dinner triage: ensure she eats hot food with two hands.\n`;
  plainText += `3. Zero pressure for outings; focus on dinner, baby soothing, and quiet wind-down.\n`;

  const subjectLine = `🚗 Commute Briefing: ${focus.title} (${briefing.dayOfWeek})`;

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
          brainstormer.recordSentCommuteBriefing(briefing);
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
