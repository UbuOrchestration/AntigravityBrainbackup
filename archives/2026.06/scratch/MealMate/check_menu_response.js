const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const stockpilePath = path.join(__dirname, 'stockpile.json');
const menuStatusPath = path.join(__dirname, 'menu_status.json');

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
  console.error('Error: Agentmail credentials not found in .env');
  process.exit(1);
}

// Helper to make HTTPS requests returning JSON
function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data); // Return raw text if not JSON
        }
      });
    }).on('error', reject);
  });
}

// Helper to fetch raw text from url
function getRawText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function normalizeName(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function checkEmails() {
  console.log('CONNECTED to Agentmail API...');
  const headers = { 'Authorization': `Bearer ${apiKey}` };
  
  try {
    // 1. List all messages
    const url = `https://api.agentmail.to/v0/inboxes/${inboxId}/messages`;
    const response = await getJson(url, headers);
    
    if (!response.messages || response.messages.length === 0) {
      console.log('No messages found in Agentmail inbox.');
      return;
    }

    // Filter for incoming messages from the recipients received in the last 12 hours
    const allowedSenders = ['michaelkenna3@gmail.com', 'mlawren18@gmail.com'];
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const incomingReplies = response.messages.filter((msg) => {
      // Check if it's incoming (labels has 'inbox' and not 'sent')
      const isIncoming = msg.labels && msg.labels.includes('inbox');
      if (!isIncoming) return false;

      // Extract email from "Name <email@site.com>"
      const emailMatch = msg.from.match(/<([^>]+)>/) || [null, msg.from];
      const fromEmail = emailMatch[1].trim().toLowerCase();
      
      const isAllowedSender = allowedSenders.includes(fromEmail);
      const isRecent = new Date(msg.timestamp) > twelveHoursAgo;

      return isAllowedSender && isRecent;
    });

    if (incomingReplies.length === 0) {
      console.log('No recent replies from recipients in the inbox.');
      return;
    }

    console.log(`Found ${incomingReplies.length} recent recipient replies. Processing...`);

    // Parse stockpile.json and menu_status.json
    let stockpile = {};
    let menuStatus = {};
    if (fs.existsSync(stockpilePath)) stockpile = JSON.parse(fs.readFileSync(stockpilePath, 'utf8'));
    if (fs.existsSync(menuStatusPath)) menuStatus = JSON.parse(fs.readFileSync(menuStatusPath, 'utf8'));

    let stockpileUpdated = false;
    let statusUpdated = false;

    // Process each reply
    for (const msg of incomingReplies) {
      console.log(`Processing message ID: ${msg.message_id} from ${msg.from}`);

      // Get email body. We download the raw eml file and parse the text content.
      const rawInfo = await getJson(`https://api.agentmail.to/v0/inboxes/${inboxId}/messages/${encodeURIComponent(msg.message_id)}/raw`, headers);
      if (!rawInfo.download_url) {
        console.log(`Could not get download URL for message ${msg.message_id}`);
        continue;
      }

      const emlBody = await getRawText(rawInfo.download_url);
      
      // Parse text lines from EML body
      // We look for the main content body. EML might have MIME boundaries.
      // A simple parsing strategy is to clean and scan the entire raw EML content for commands.
      console.log('Parsing EML text content...');
      const lines = emlBody.split('\n');

      let isApproved = false;
      const approvalKeywords = ['approve', 'approved', 'yes', 'ok', 'confirm', 'good', 'perfect', 'looks good'];

      lines.forEach((line) => {
        const cleanLine = line.trim().toLowerCase();
        if (!cleanLine || cleanLine.includes('content-type') || cleanLine.includes('content-transfer-encoding')) return;

        // Check for Approval keywords
        approvalKeywords.forEach((kw) => {
          if (cleanLine === kw || cleanLine.startsWith(kw + ' ') || cleanLine === 're: ' + kw) {
            isApproved = true;
          }
        });

        // Parse BUY/KEEP confirmations
        const buyMatch = cleanLine.match(/^(buy|keep)\s+(.+)$/i);
        if (buyMatch) {
          const action = buyMatch[1].toLowerCase(); // "buy" or "keep"
          const itemName = buyMatch[2].trim();
          const normItem = normalizeName(itemName);

          for (const category in stockpile) {
            for (const itemKey in stockpile[category]) {
              const item = stockpile[category][itemKey];
              if (normalizeName(item.name) === normItem || normalizeName(itemKey) === normItem) {
                item.status = action === 'buy' ? 'confirmed_buy' : 'confirmed_keep';
                console.log(`Updated confirmation: ${item.name} set to ${item.status}`);
                stockpileUpdated = true;
              }
            }
          }
        }

        // Parse specific stockpile updates (e.g. "toilet paper: 12 rolls")
        const colonMatch = cleanLine.match(/^([^:]+):\s*(\d+(?:\.\d+)?)\s*(.*)$/);
        if (colonMatch) {
          const itemName = colonMatch[1].trim();
          const quantity = parseFloat(colonMatch[2]);
          const unit = colonMatch[3].trim();
          const normItem = normalizeName(itemName);

          for (const category in stockpile) {
            for (const itemKey in stockpile[category]) {
              const item = stockpile[category][itemKey];
              if (normalizeName(item.name) === normItem || normalizeName(itemKey) === normItem) {
                item.quantity = quantity;
                if (unit) item.unit = unit;
                item.status = 'known';
                console.log(`Audited stockpile: ${item.name} set to ${quantity} ${item.unit}`);
                stockpileUpdated = true;
              }
            }
          }
        }
      });

      if (isApproved && menuStatus.status === 'pending') {
        menuStatus.status = 'approved';
        menuStatus.lastUpdated = new Date().toISOString();
        statusUpdated = true;
        console.log('Weekly menu status updated to APPROVED.');
      }
    }

    // Save changes
    if (stockpileUpdated) {
      fs.writeFileSync(stockpilePath, JSON.stringify(stockpile, null, 2), 'utf8');
      console.log('Successfully saved updated stockpile.json.');
    }

    if (statusUpdated) {
      fs.writeFileSync(menuStatusPath, JSON.stringify(menuStatus, null, 2), 'utf8');
      console.log('Successfully saved updated menu_status.json.');
    }

  } catch (error) {
    console.error('Error polling Agentmail:', error.message);
  }
}

checkEmails();
