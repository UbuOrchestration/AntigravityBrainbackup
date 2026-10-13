const https = require('https');
const fs = require('fs');
const path = require('path');
const scanner = require('./scan_events');

const envPath = path.join(__dirname, '..', '.env');
const historyPath = path.join(__dirname, '..', 'data', 'history.json');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
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

async function sendWeekendFestivitiesDigest(refDate = new Date()) {
  const weekendInfo = scanner.getSubjectWeekend(refDate);
  log(`Scanning events strictly for subject weekend: ${weekendInfo.headerLabel} (${weekendInfo.weekendDates.join(', ')})...`);
  
  const festivities = await scanner.getWeekendFestivities(refDate);
  const { headerLabel, liveEvents, staplePicks, weekend } = festivities;

  log(`Scan complete. Found ${liveEvents.length} live pop-up events and ${staplePicks.length} staples strictly for ${headerLabel}.`);

  // Build HTML Email with clean, professional typography
  let html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; margin: 0; line-height: 1.5;">
  <div style="max-width: 650px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 8px; border: 1px solid #334155;">
    
    <!-- Header -->
    <div style="border-bottom: 1px solid #334155; padding-bottom: 15px; margin-bottom: 24px;">
      <h1 style="color: #f8fafc; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em;">Orlando Weekend Festivities</h1>
      <p style="color: #38bdf8; margin: 4px 0 0 0; font-size: 15px; font-weight: 500;">${headerLabel}</p>
      <p style="color: #94a3b8; margin: 2px 0 0 0; font-size: 13px;">Outdoor and family-accessible &bull; Within 45 minutes of 32825</p>
    </div>

    <!-- Quick Intro -->
    <div style="background-color: #0f172a; border-left: 3px solid #38bdf8; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        Every event below is confirmed strictly for <strong>this upcoming weekend (${headerLabel})</strong>. Only immediate, child-friendly, and outdoor options are listed.
      </p>
    </div>
`;

  // Section 1: Live Pop-Up Events & Festivals Happening THIS Weekend
  if (liveEvents.length > 0) {
    html += `
    <div style="margin-bottom: 24px;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 12px;">
        Special Events &bull; This Weekend Only
      </div>
    `;

    liveEvents.forEach((ev, idx) => {
      html += `
      <div style="background-color: #0f172a; padding: 18px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <h3 style="color: #f8fafc; margin: 0; font-size: 16px; font-weight: 600;">${ev.name}</h3>
          <span style="color: #38bdf8; font-size: 12px; font-weight: 600; margin-left: 8px;">${ev.driveTime} drive</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 6px 0;">
          <strong>When:</strong> ${ev.schedule} &bull; <strong>Where:</strong> ${ev.location}
        </p>
        <p style="color: #cbd5e1; font-size: 13px; margin: 0 0 10px 0; line-height: 1.4;">
          ${ev.description}
        </p>
        <div style="font-size: 12px;">
          <span style="color: #94a3b8;">Stroller and child accessible</span>
          ${ev.url ? ` &bull; <a href="${ev.url}" style="color: #38bdf8; text-decoration: underline;" target="_blank">Event Details &rarr;</a>` : ''}
        </div>
      </div>
      `;
    });

    html += `</div>`;
  }

  // Section 2: Top Outdoor & Family Staples for THIS Weekend
  if (staplePicks.length > 0) {
    html += `
    <div style="margin-bottom: 24px;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 12px;">
        Recurring Staples &bull; Low Friction Outdoor Strolls
      </div>
    `;

    staplePicks.forEach((ev, idx) => {
      html += `
      <div style="background-color: #0f172a; padding: 18px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <h3 style="color: #f8fafc; margin: 0; font-size: 16px; font-weight: 600;">${ev.name}</h3>
          <span style="color: #38bdf8; font-size: 12px; font-weight: 600; margin-left: 8px;">${ev.driveTime} drive</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 6px 0;">
          <strong>When:</strong> ${ev.schedule} &bull; <strong>Location:</strong> ${ev.location}
        </p>
        <p style="color: #cbd5e1; font-size: 13px; margin: 0 0 10px 0; line-height: 1.4;">
          ${ev.description}
        </p>
        <div style="font-size: 12px;">
          <span style="color: #94a3b8;">Paved paths and stroller accessible</span>
          ${ev.url ? ` &bull; <a href="${ev.url}" style="color: #38bdf8; text-decoration: underline;" target="_blank">Website &rarr;</a>` : ''}
        </div>
      </div>
      `;
    });

    html += `</div>`;
  }

  // Section 3: Low-Stress Family Outing Mindset
  html += `
    <div style="background-color: #0f172a; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #334155;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; margin-bottom: 6px;">
        Low-Stress Outing Mindset
      </div>
      <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin: 0;">
        There is no need for a half-day commitment. A 45-minute stroll with cold coffee while baby rests in the stroller is a solid, restful win for both of you.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #334155; padding-top: 14px; color: #64748b; font-size: 12px;">
      Curated Romance &bull; Scheduled Friday Digest
    </div>
  </div>
</body>
</html>
`;

  // Plain Text Version
  let plainText = `CURATED ROMANCE: WEEKEND FESTIVITIES DIGEST\n`;
  plainText += `Subject Weekend: ${headerLabel}\n`;
  plainText += `Orlando Outdoor & Child-Friendly Events (<=45 Mins of 32825)\n\n`;

  if (liveEvents.length > 0) {
    plainText += `SPECIAL EVENTS (THIS WEEKEND ONLY):\n`;
    liveEvents.forEach((ev, i) => {
      plainText += `${i + 1}. ${ev.name} (Drive: ${ev.driveTime})\n`;
      plainText += `   When: ${ev.schedule}\n`;
      plainText += `   Where: ${ev.location}\n`;
      plainText += `   Info: ${ev.description}\n`;
      if (ev.url) plainText += `   Link: ${ev.url}\n`;
      plainText += `\n`;
    });
  }

  if (staplePicks.length > 0) {
    plainText += `RECURRING STAPLES (THIS WEEKEND):\n`;
    staplePicks.forEach((ev, i) => {
      plainText += `${i + 1}. ${ev.name} (Drive: ${ev.driveTime})\n`;
      plainText += `   When: ${ev.schedule}\n`;
      plainText += `   Where: ${ev.location}\n`;
      plainText += `   Info: ${ev.description}\n`;
      if (ev.url) plainText += `   Link: ${ev.url}\n`;
      plainText += `\n`;
    });
  }

  const subjectLine = `Orlando Weekend Festivities: ${headerLabel} (Child-Friendly & Outdoor)`;

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

  log(`Sending weekend festivities digest to ${userEmail} via Agentmail (${inboxId})...`);

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const responseJson = JSON.parse(responseBody);
          log(`Successfully sent weekend festivities digest. Message ID: ${responseJson.message_id || 'OK'}`);

          // Log to history.json
          const history = loadJSON(historyPath);
          if (!history.weekend_festivities_log) history.weekend_festivities_log = [];
          history.weekend_festivities_log.push({
            date: new Date().toISOString(),
            subjectWeekend: headerLabel,
            weekendDates: weekend.weekendDates,
            liveEvents: liveEvents.map(e => `${e.name} (${e.schedule})`),
            staples: staplePicks.map(e => `${e.name} (${e.schedule})`)
          });
          saveJSON(historyPath, history);

          resolve(true);
        } else {
          log(`Error sending weekend festivities email. Status: ${res.statusCode}, Body: ${responseBody}`);
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
  sendWeekendFestivitiesDigest().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { sendWeekendFestivitiesDigest };
