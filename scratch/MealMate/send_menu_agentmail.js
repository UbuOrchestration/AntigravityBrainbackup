const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const menuPath = path.join(__dirname, 'menu_status.json');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// 1. Load credentials
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
  log('Error: Agentmail credentials not found in .env');
  process.exit(1);
}

// 2. Load menu
if (!fs.existsSync(menuPath)) {
  log('Error: menu_status.json not found.');
  process.exit(1);
}

const menuStatus = JSON.parse(fs.readFileSync(menuPath, 'utf8').replace(/^\uFEFF/, ''));
const menu = menuStatus.menu;

if (!menu) {
  log('Error: No menu data available in menu_status.json.');
  process.exit(1);
}

// 3. Clear attachments array as we are linking directly to public URLs
const attachments = [];

// 4. Calculate total cost
let totalCost = 0;
Object.keys(menu.shoppingList).forEach((key) => {
  const item = menu.shoppingList[key];
  totalCost += item.total;
});

// 5. Build HTML Body (Minimal formatting, No instructions, includes title, photo link, ingredients, times)
let html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #0b0c10; color: #c5c6c7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1f2833; padding: 30px; border-radius: 8px;">
    <h2 style="color: #66fcf1; text-align: center; border-bottom: 2px solid #66fcf1; padding-bottom: 10px; margin-bottom: 25px;">
      Antigravity Weekly Meal Proposal
    </h2>
    <p>Good morning! Here is the proposed menu and shopping list for the upcoming week:</p>
    
    <!-- Breakfast -->
    <div style="margin-bottom: 30px; padding: 15px; background: #1a2238; border-radius: 8px;">
      <h3 style="color: #66fcf1; margin-top: 0; font-size: 18px;">🍳 Breakfast: ${menu.breakfast.name} (Source: ${menu.breakfast.source || 'Food Blog'})</h3>
      <img src="${menu.breakfast.image}" alt="Breakfast" width="350" style="border-radius: 8px; margin: 10px 0; display: block;" />
      <p style="margin: 5px 0;"><strong>Ingredients:</strong> ${menu.breakfast.ingredients.map(i => i.name).join(', ')}</p>
    </div>

    <!-- Lunch -->
    <div style="margin-bottom: 30px; padding: 15px; background: #1a2238; border-radius: 8px;">
      <h3 style="color: #66fcf1; margin-top: 0; font-size: 18px;">🥗 Lunch: ${menu.lunch.name} (Source: ${menu.lunch.source || 'Food Blog'})</h3>
      <img src="${menu.lunch.image}" alt="Lunch" width="350" style="border-radius: 8px; margin: 10px 0; display: block;" />
      <p style="margin: 5px 0;"><strong>Ingredients:</strong> ${menu.lunch.ingredients.map(i => i.name).join(', ')}</p>
    </div>

    <!-- Dinners -->
    <h3 style="color: #9b59b6; border-bottom: 1px solid #455a64; padding-bottom: 5px; margin-top: 30px;">🍽️ Dinners</h3>
`;

menu.dinners.forEach((dinner, idx) => {
  html += `
    <div style="margin-bottom: 30px; padding: 15px; background: #1a2238; border-radius: 8px;">
      <h4 style="color: #9b59b6; margin-top: 0; font-size: 16px;">Dinner (${dinner.day}): ${dinner.name} (Source: ${dinner.source || 'Food Blog'})</h4>
      <img src="${dinner.image}" alt="Dinner" width="350" style="border-radius: 8px; margin: 10px 0; display: block;" />
      <p style="margin: 5px 0;"><strong>Ingredients:</strong> ${dinner.ingredients.map(i => i.name).join(', ')}</p>
    </div>
  `;
});

html += `
    <h3 style="color: #66fcf1; border-bottom: 1px solid #455a64; padding-bottom: 5px; margin-top: 30px;">🛒 Coordinated Shopping List (Zip 32825)</h3>
    <ul style="padding-left: 20px; line-height: 1.6;">
`;

Object.keys(menu.shoppingList).forEach((key) => {
  const item = menu.shoppingList[key];
  const bogoText = item.bogo ? ' <span style="color: #2ecc71; font-weight: bold;">[BOGO Deal!]</span>' : '';
  html += `<li><strong>${item.name}</strong>: ${item.amount} ${item.unit} -- Buy at ${item.store} ($${item.price}/${item.unit} | Total: $${item.total.toFixed(2)})${bogoText}</li>`;
});

html += `
    </ul>
    <p style="margin-top: 15px; font-size: 16px; color: #66fcf1;"><strong>Approximate Total Cost:</strong> $${totalCost.toFixed(2)}</p>

    <div style="margin-top: 30px; background-color: #2c3e50; padding: 15px; border-radius: 6px; border-left: 4px solid #f1c40f;">
      <strong>Action Required:</strong> Please reply directly to this email with "Approve", "Yes", or "OK" to confirm the menu. We will automatically check your stockpile and build your online grocery cart!
    </div>

    <p style="font-size: 11px; color: #8892b0; text-align: center; margin-top: 30px; border-top: 1px solid #455a64; padding-top: 15px;">
      Sent autonomously by Antigravity MealMate via Agentmail.
    </p>
  </div>
</body>
</html>
`;

// Plain text fallback
let plainText = `ANTIGRAVITY WEEKLY MEAL PROPOSAL\n\n`;
plainText += `Cuisine: ${menu.cuisine}\n\n`;
plainText += `🍳 BREAKFAST: ${menu.breakfast.name}\n`;
plainText += `- Ingredients: ${menu.breakfast.ingredients.map(i => i.name).join(', ')}\n\n`;

plainText += `🥗 LUNCH: ${menu.lunch.name}\n`;
plainText += `- Ingredients: ${menu.lunch.ingredients.map(i => i.name).join(', ')}\n\n`;

plainText += `🍽️ DINNERS:\n`;
menu.dinners.forEach((dinner) => {
  plainText += `- Dinner (${dinner.day}): ${dinner.name}\n`;
  plainText += `  Ingredients: ${dinner.ingredients.map(i => i.name).join(', ')}\n\n`;
});

plainText += `🛒 SHOPPING LIST:\n`;
Object.keys(menu.shoppingList).forEach((key) => {
  const item = menu.shoppingList[key];
  plainText += `- ${item.name}: ${item.amount} ${item.unit} -- Buy at ${item.store} ($${item.price}/${item.unit} | Total: $${item.total.toFixed(2)})\n`;
});

plainText += `\nApproximate Total Cost: $${totalCost.toFixed(2)}\n`;

plainText += `\nReply with "Approve", "Yes", or "OK" to approve the menu.\n`;

// 6. Send POST request
const postData = JSON.stringify({
  to: ["michaelkenna3@gmail.com"],
  subject: "Antigravity - Proposed Weekly Catered Menu",
  html: html,
  text: plainText,
  attachments: attachments
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

log(`Sending proposed weekly menu via Agentmail (${inboxId})...`);

const req = https.request(options, (res) => {
  let responseBody = '';
  res.on('data', chunk => responseBody += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const responseJson = JSON.parse(responseBody);
      log(`Successfully sent weekly menu via Agentmail. Message ID: ${responseJson.message_id}`);
    } else {
      log(`Error: Failed to send. Status: ${res.statusCode}, Body: ${responseBody}`);
    }
  });
});

req.on('error', (e) => {
  log(`Request error: ${e.message}`);
});

req.write(postData);
req.end();
