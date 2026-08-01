const tls = require('tls');
const fs = require('fs');
const path = require('path');

const user = 'michaelkenna3@gmail.com';
const pass = 'ayor zcyl tdio vcvi';
const prefPath = path.join(__dirname, 'preferences.json');

const socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false }, () => {
  console.log('CONNECTED to IMAP');
});

let step = 0;
let buffer = '';

socket.on('data', (data) => {
  buffer += data.toString();
  
  if (step === 0 && buffer.includes('* OK')) {
    socket.write(`A01 LOGIN ${user} "${pass}"\r\n`);
    step = 1;
    buffer = '';
  } else if (step === 1 && buffer.includes('A01 OK')) {
    socket.write('A02 SELECT INBOX\r\n');
    step = 2;
    buffer = '';
  } else if (step === 2 && buffer.includes('A02 OK')) {
    // Search for emails from the targets with the quiz subject
    socket.write('A03 SEARCH SUBJECT "Personalized Meal Planning"\r\n');
    step = 3;
    buffer = '';
  } else if (step === 3 && buffer.includes('A03 OK')) {
    // Parse search results, e.g., "* SEARCH 31017 31020"
    const searchMatch = buffer.match(/\*\s+SEARCH\s+(.*)/i);
    const msgIds = searchMatch && searchMatch[1] ? searchMatch[1].trim().split(/\s+/) : [];
    
    if (msgIds.length > 0 && msgIds[0] !== '') {
      // Fetch the latest reply
      const latestMsgId = msgIds[msgIds.length - 1];
      console.log(`Fetching latest quiz reply. Message ID: ${latestMsgId}`);
      socket.write(`A04 FETCH ${latestMsgId} (BODY[HEADER.FIELDS (FROM)] BODY[TEXT])\r\n`);
      step = 4;
    } else {
      console.log('No quiz replies found in inbox.');
      socket.write('A05 LOGOUT\r\n');
      step = 5;
    }
    buffer = '';
  } else if (step === 4 && buffer.includes('A04 OK')) {
    console.log('--- RECEIVED QUIZ REPLY DATA ---');
    console.log(buffer);
    console.log('--------------------------------');
    
    // Parse preferences
    parseEmailAndSave(buffer);
    
    socket.write('A05 LOGOUT\r\n');
    step = 5;
    buffer = '';
  }
});

socket.on('end', () => {
  console.log('Connection closed');
});

socket.on('error', (err) => {
  console.error('Socket error:', err);
});

function parseEmailAndSave(emailContent) {
  // Read existing preferences
  let prefs = {};
  try {
    if (fs.existsSync(prefPath)) {
      prefs = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading preferences.json:', e.message);
  }

  // Basic regex parser for quiz answers (e.g. "1. Mediterranean", "3. Nuts", etc.)
  const lines = emailContent.split('\n');
  lines.forEach((line) => {
    // Match line starting with a number and dot or parenthesis
    const match = line.match(/^\s*(\d+)[.)]\s*(.*)/);
    if (match) {
      const qNum = parseInt(match[1], 10);
      const answer = match[2].trim();
      
      switch(qNum) {
        case 1:
          prefs.favoriteCuisine = answer;
          break;
        case 3:
          prefs.avoidFoods = answer.split(',').map(s => s.trim()).filter(Boolean);
          break;
        case 4:
          prefs.allergies = answer.split(',').map(s => s.trim()).filter(Boolean);
          break;
        case 5:
          prefs.dietaryPreference = answer;
          break;
        case 6:
          prefs.eatingSchedule = answer;
          break;
        case 7:
          prefs.prepStyle = answer;
          break;
        case 8:
          prefs.ingredientPriority = answer;
          break;
      }
    }
  });

  // Write updated preferences
  try {
    fs.writeFileSync(prefPath, JSON.stringify(prefs, null, 2), 'utf8');
    console.log('Successfully updated preferences.json with email replies.');
  } catch (e) {
    console.error('Failed to write preferences.json:', e.message);
  }
}
