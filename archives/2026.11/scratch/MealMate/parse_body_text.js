const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
let apiKey = '';
let inboxId = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const matchKey = line.match(/^AGENTMAIL_API_KEY=(.*)/);
    const matchInbox = line.match(/^AGENTMAIL_INBOX_ID=(.*)/);
    if (matchKey) apiKey = matchKey[1].trim();
    if (matchInbox) inboxId = matchInbox[1].trim();
  });
}

function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function getRawText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function dumpBody() {
  const headers = { 'Authorization': `Bearer ${apiKey}` };
  const url = `https://api.agentmail.to/v0/inboxes/${inboxId}/messages`;
  const response = await getJson(url, headers);

  for (const msg of response.messages) {
    if (msg.message_id.includes('CAFAbhkLjNu') || msg.message_id.includes('991D9B5C')) {
      console.log(`\n========================================`);
      console.log(`From: ${msg.from} | Message ID: ${msg.message_id}`);
      const rawInfo = await getJson(`https://api.agentmail.to/v0/inboxes/${inboxId}/messages/${encodeURIComponent(msg.message_id)}/raw`, headers);
      if (rawInfo.download_url) {
        const eml = await getRawText(rawInfo.download_url);
        const lines = eml.split('\n');
        console.log('--- Non-header lines ---');
        lines.forEach(l => {
          const clean = l.trim();
          if (clean.length > 0 && !clean.includes(':') && !clean.startsWith('--') && !clean.startsWith('<') && !clean.startsWith('X-') && !clean.startsWith('dmarc')) {
            console.log(`LINE: "${clean}"`);
          }
        });
      }
    }
  }
}

dumpBody();
