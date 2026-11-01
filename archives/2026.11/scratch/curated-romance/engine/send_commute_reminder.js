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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; margin: 0; line-height: 1.5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 8px; border: 1px solid #334155;">
    
    <!-- Header -->
    <div style="border-bottom: 1px solid #334155; padding-bottom: 15px; margin-bottom: 24px;">
      <h1 style="color: #f8fafc; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em;">Curated Romance: Commute Briefing</h1>
      <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Arrival, Dinner & Decompression &bull; ${briefing.dayOfWeek}, ${briefing.dateStr}</p>
    </div>

    <!-- Commute Mindset Tip -->
    <div style="background-color: #0f172a; border-left: 3px solid #38bdf8; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px; font-size: 14px; color: #e2e8f0;">
      <strong style="color: #38bdf8; display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Drive-Home Mindset</strong>
      ${briefing.commuteTip}
    </div>

    <!-- Commute Focus Box -->
    <div style="background-color: #0f172a; padding: 20px; border-radius: 6px; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 8px;">
        Tonight's Doorway & Dinner Focus
      </div>
      <h2 style="color: #f8fafc; margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">${focus.title}</h2>
      <p style="color: #cbd5e1; font-size: 15px; line-height: 1.5; margin: 0 0 14px 0;"><strong>Action:</strong> ${focus.action}</p>
      <div style="background-color: #1e293b; padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #94a3b8;">
        <strong style="color: #cbd5e1;">Context:</strong> ${focus.why}
      </div>
    </div>

    <!-- Quick Arrival Realities Checklist -->
    <div style="background-color: #0f172a; border-radius: 6px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 10px;">
        Evening Realities &bull; Sun Down, Pre-Dinner
      </div>
      <ul style="padding-left: 18px; margin: 0; color: #cbd5e1; font-size: 13px; line-height: 1.6;">
        <li><strong>Arms-Free Relief:</strong> Take baby the moment you step in so her arms can rest.</li>
        <li><strong>Dinner Triage:</strong> Neither of you has eaten; ensure she gets to sit down and eat warm food with both hands.</li>
        <li><strong>Zero Pressure:</strong> No extra plans or outings; focus entirely on dinner, baby soothing, and quiet wind-down.</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #334155; padding-top: 14px; color: #64748b; font-size: 12px;">
      Curated Romance &bull; Scheduled Commute Briefing
    </div>
  </div>
</body>
</html>
`;

  // Plain Text Version
  let plainText = `CURATED ROMANCE: COMMUTE BRIEFING - ${briefing.dayOfWeek}, ${briefing.dateStr}\n\n`;
  plainText += `DRIVE-HOME MINDSET:\n${briefing.commuteTip}\n\n`;
  plainText += `TONIGHT'S DOORWAY & DINNER FOCUS:\n`;
  plainText += `Title: ${focus.title}\n`;
  plainText += `Action: ${focus.action}\n`;
  plainText += `Context: ${focus.why}\n\n`;
  plainText += `EVENING REALITIES:\n`;
  plainText += `1. Immediate arms-free relief for her.\n`;
  plainText += `2. Dinner triage: ensure she eats hot food with two hands.\n`;
  plainText += `3. Zero pressure for outings; focus on dinner, baby soothing, and quiet wind-down.\n`;

  const subjectLine = `Commute Briefing: ${focus.title} (${briefing.dayOfWeek})`;

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
