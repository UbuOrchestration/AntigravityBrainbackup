const https = require('https');
const fs = require('fs');
const path = require('path');

const apiKey = 'am_us_3843878d1bd5525335759e32e1a38b681434a17264b99a90b71642242b1ac3f2';
const inboxId = 'bbyfaye@agentmail.to';
const recipients = ['michaelkenna3@gmail.com', 'mlawren18@gmail.com'];

const dataPath = path.join(__dirname, 'data.json');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function getESTDateString(isoString) {
  const date = new Date(isoString);
  const estTime = new Date(date.getTime() - 4 * 60 * 60 * 1000);
  const yyyy = estTime.getUTCFullYear();
  const mm = String(estTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(estTime.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

if (!fs.existsSync(dataPath)) {
  log('Error: data.json not found');
  process.exit(1);
}

const rawData = fs.readFileSync(dataPath, 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(rawData);

// Group feeding and diaper logs by date
const dailyStats = {};

data.logs.forEach(item => {
  const dateStr = getESTDateString(item.startTime || item.createdAt);
  if (!dailyStats[dateStr]) {
    dailyStats[dateStr] = {
      totalOz: 0,
      feedCount: 0,
      wetDiapers: 0,
      dirtyDiapers: 0,
      bothDiapers: 0
    };
  }

  if (item.type === 'feeding') {
    let oz = (item.details.volume || 0) / 29.57353;
    oz = Math.round(oz * 4) / 4;
    dailyStats[dateStr].totalOz += oz;
    dailyStats[dateStr].feedCount += 1;
  } else if (item.type === 'diaper') {
    const dtype = item.details.diaperType;
    if (dtype === 'wet') dailyStats[dateStr].wetDiapers += 1;
    else if (dtype === 'dirty') dailyStats[dateStr].dirtyDiapers += 1;
    else if (dtype === 'both') dailyStats[dateStr].bothDiapers += 1;
  }
});

const sortedDates = Object.keys(dailyStats).sort();
const last7Days = sortedDates.slice(-7);
const prev7Days = sortedDates.slice(-14, -7);

let currWeekOz = 0;
let currWeekFeeds = 0;
let currWeekWet = 0;
let currWeekDirty = 0;

last7Days.forEach(d => {
  currWeekOz += dailyStats[d].totalOz;
  currWeekFeeds += dailyStats[d].feedCount;
  currWeekWet += dailyStats[d].wetDiapers + dailyStats[d].bothDiapers;
  currWeekDirty += dailyStats[d].dirtyDiapers + dailyStats[d].bothDiapers;
});

let prevWeekOz = 0;
prev7Days.forEach(d => {
  prevWeekOz += dailyStats[d].totalOz;
});

const currAvg = last7Days.length > 0 ? (currWeekOz / last7Days.length).toFixed(2) : '0.00';
const prevAvg = prev7Days.length > 0 ? (prevWeekOz / prev7Days.length).toFixed(2) : '0.00';
const ozDiff = (currWeekOz - prevWeekOz).toFixed(2);
const ozDiffSign = ozDiff >= 0 ? `+${ozDiff}` : `${ozDiff}`;

// Overall Stats
let overallOz = 0;
sortedDates.forEach(d => overallOz += dailyStats[d].totalOz);
const overallAvg = sortedDates.length > 0 ? (overallOz / sortedDates.length).toFixed(2) : '0.00';

const startDate = last7Days[0] || 'N/A';
const endDate = last7Days[last7Days.length - 1] || 'N/A';

let html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #0b0c10; color: #c5c6c7; padding: 20px;">
  <div style="max-width: 650px; margin: 0 auto; background-color: #1f2833; padding: 30px; border-radius: 12px; border: 1px solid #455a64;">
    
    <h2 style="color: #66fcf1; text-align: center; border-bottom: 2px solid #66fcf1; padding-bottom: 12px; margin-bottom: 25px;">
      👶 BbyFaye Infant Growth & Feeding Report
    </h2>
    <p style="text-align: center; color: #8892b0; font-size: 14px; margin-top: -15px;">
      Sunday Evening 7:00 PM Digest | <strong>${startDate}</strong> to <strong>${endDate}</strong>
    </p>

    <p style="font-size: 15px; line-height: 1.6;">Good evening! Here is your Sunday 7:00 PM weekly breakdown of infant growth, feeding volume, and diaper tracking based on real logged activity:</p>

    <!-- Key Metrics Cards -->
    <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
      <tr>
        <td width="50%" style="padding-right: 10px;">
          <div style="background: #1a2238; padding: 18px; border-radius: 10px; border-left: 4px solid #66fcf1;">
            <div style="font-size: 12px; color: #8892b0; text-transform: uppercase;">Weekly Total Intake</div>
            <div style="font-size: 26px; font-weight: bold; color: #66fcf1; margin-top: 5px;">${currWeekOz.toFixed(2)} oz</div>
            <div style="font-size: 12px; color: #4ade80; margin-top: 4px;">${ozDiffSign} oz vs previous week</div>
          </div>
        </td>
        <td width="50%" style="padding-left: 10px;">
          <div style="background: #1a2238; padding: 18px; border-radius: 10px; border-left: 4px solid #9b59b6;">
            <div style="font-size: 12px; color: #8892b0; text-transform: uppercase;">Daily Average Intake</div>
            <div style="font-size: 26px; font-weight: bold; color: #9b59b6; margin-top: 5px;">${currAvg} oz/day</div>
            <div style="font-size: 12px; color: #c5c6c7; margin-top: 4px;">Overall Average: ${overallAvg} oz/day</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Feeding & Diaper Summary -->
    <div style="background: #1a2238; padding: 20px; border-radius: 10px; margin-bottom: 25px; border: 1px solid #2c3e50;">
      <h3 style="color: #66fcf1; margin-top: 0; font-size: 16px; border-bottom: 1px solid #2c3e50; padding-bottom: 8px;">
        🍼 Feeding & Diaper Totals (Past 7 Days)
      </h3>
      <ul style="padding-left: 20px; line-height: 1.8; margin-bottom: 0;">
        <li><strong>Total Feedings Logged:</strong> ${currWeekFeeds} feeds (Avg ${(currWeekFeeds / 7).toFixed(1)} feeds/day)</li>
        <li><strong>Average Bottle Size:</strong> ${(currWeekOz / (currWeekFeeds || 1)).toFixed(2)} oz per feed</li>
        <li><strong>Wet Diapers Logged:</strong> ${currWeekWet} wet diapers</li>
        <li><strong>Dirty Diapers Logged:</strong> ${currWeekDirty} dirty diapers</li>
      </ul>
    </div>

    <!-- Daily Breakdown Table -->
    <h3 style="color: #66fcf1; font-size: 16px; margin-bottom: 12px;">📅 Daily Intake Breakdown</h3>
    <table width="100%" cellspacing="0" cellpadding="8" style="background: #1a2238; border-radius: 8px; border-collapse: collapse; text-align: left; font-size: 14px;">
      <thead>
        <tr style="border-bottom: 2px solid #455a64; color: #66fcf1;">
          <th style="padding: 10px;">Date</th>
          <th style="padding: 10px;">Volume (oz)</th>
          <th style="padding: 10px;">Feeds</th>
          <th style="padding: 10px;">Diapers (W / D)</th>
        </tr>
      </thead>
      <tbody>
`;

last7Days.forEach(d => {
  const st = dailyStats[d];
  html += `
        <tr style="border-bottom: 1px solid #2c3e50;">
          <td style="padding: 10px; font-weight: bold;">${d}</td>
          <td style="padding: 10px; color: #66fcf1;">${st.totalOz.toFixed(2)} oz</td>
          <td style="padding: 10px;">${st.feedCount}</td>
          <td style="padding: 10px;">${st.wetDiapers + st.bothDiapers} W / ${st.dirtyDiapers + st.bothDiapers} D</td>
        </tr>
  `;
});

html += `
      </tbody>
    </table>

    <div style="margin-top: 30px; background-color: #2c3e50; padding: 15px; border-radius: 6px; border-left: 4px solid #f1c40f;">
      <strong>All-Time Growth Milestones:</strong> Total volume logged across all ${sortedDates.length} recorded days is <strong>${overallOz.toFixed(2)} oz</strong> (approx ${(overallOz * 29.57353 / 1000).toFixed(2)} liters).
    </div>

    <p style="font-size: 11px; color: #8892b0; text-align: center; margin-top: 30px; border-top: 1px solid #455a64; padding-top: 15px;">
      Generated & sent automatically every Sunday at 7:00 PM by Antigravity BbyFaye Growth Tracker via Agentmail (bbyfaye@agentmail.to).
    </p>
  </div>
</body>
</html>
`;

let plainText = `BBYFAYE SUNDAY INFANT GROWTH REPORT (${startDate} - ${endDate})\n\n`;
plainText += `Weekly Total: ${currWeekOz.toFixed(2)} oz (${ozDiffSign} oz vs prev week)\n`;
plainText += `Daily Average: ${currAvg} oz/day (Overall Avg: ${overallAvg} oz/day)\n`;
plainText += `Total Feeds: ${currWeekFeeds} feeds\n`;
plainText += `Diapers: ${currWeekWet} Wet / ${currWeekDirty} Dirty\n\n`;
plainText += `DAILY BREAKDOWN:\n`;

last7Days.forEach(d => {
  const st = dailyStats[d];
  plainText += `- ${d}: ${st.totalOz.toFixed(2)} oz (${st.feedCount} feeds, ${st.wetDiapers + st.bothDiapers} W / ${st.dirtyDiapers + st.bothDiapers} D)\n`;
});

plainText += `\nTotal All-Time Intake: ${overallOz.toFixed(2)} oz across ${sortedDates.length} days.\n`;

const postData = JSON.stringify({
  to: recipients,
  subject: `👶 BbyFaye - Sunday Infant Growth & Feeding Report (${startDate} - ${endDate})`,
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

log(`Sending Sunday 7:00 PM Weekly Infant Growth Report via Agentmail (${inboxId})...`);

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const responseJson = JSON.parse(body);
      log(`Successfully sent Sunday Weekly Infant Growth Report. Message ID: ${responseJson.message_id}`);
    } else {
      log(`Error: Failed to send. Status: ${res.statusCode}, Body: ${body}`);
    }
  });
});

req.on('error', (e) => {
  log(`Request error: ${e.message}`);
});

req.write(postData);
req.end();
