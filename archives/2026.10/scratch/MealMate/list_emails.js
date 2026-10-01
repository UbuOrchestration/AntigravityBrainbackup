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

if (!apiKey || !inboxId) {
  console.error('Error: Credentials not found');
  process.exit(1);
}

const headers = { 'Authorization': `Bearer ${apiKey}` };
const url = `https://api.agentmail.to/v0/inboxes/${inboxId}/messages`;

https.get(url, { headers }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Total messages found:', response.messages ? response.messages.length : 0);
      if (response.messages) {
        response.messages.slice(0, 10).forEach((msg) => {
          console.log(`- ID: ${msg.message_id}`);
          console.log(`  From: ${msg.from}`);
          console.log(`  Subject: ${msg.subject}`);
          console.log(`  Timestamp: ${msg.timestamp}`);
          console.log(`  Labels: ${msg.labels ? msg.labels.join(', ') : ''}`);
          console.log('------------------------------------');
        });
      }
    } catch (e) {
      console.error('Failed to parse:', e.message);
      console.log(data);
    }
  });
});
