const fs = require('fs');
const path = require('path');

const chatFilePath = path.join(__dirname, 'discord_chat.json');

function getRecentMessages() {
  if (!fs.existsSync(chatFilePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(chatFilePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading chat history:", e.message);
    return [];
  }
}

async function sendMessage(content) {
  try {
    const response = await fetch('http://localhost:3001/api/discord/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content })
    });
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Error sending message to Discord:", e.message);
  }
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'read') {
  const messages = getRecentMessages();
  console.log("CHAT_HISTORY_START");
  messages.slice(-15).forEach(m => {
    console.log(`[${m.timestamp}] [${m.source.toUpperCase()}] ${m.sender}: ${m.content}`);
  });
  console.log("CHAT_HISTORY_END");
} else if (command === 'send') {
  const content = args.slice(1).join(' ');
  if (content) {
    sendMessage(content).then(res => {
      console.log("Sent successfully:", JSON.stringify(res));
    });
  }
}
