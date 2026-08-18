/**
 * add_feed.js - CLI command to log feeds directly from chat
 * Usage: node add_feed.js "<input_str>" "<local_timestamp_iso>"
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

const inputStr = process.argv[2] || '';
const localTimestamp = process.argv[3] || new Date().toISOString();

if (!inputStr) {
  console.log(JSON.stringify({ error: 'No input string provided' }));
  process.exit(1);
}

// Helper to convert oz to ml
function ozToMl(oz) {
  return Math.round(oz / 0.033814);
}

// Parse volume
// Matches numbers (integers or decimals) optionally followed by oz, o, ounces, etc.
const volRegex = /(\d+(?:\.\d+)?)\s*(?:oz|o|ounces)?/i;
const match = inputStr.match(volRegex);

if (!match) {
  console.log(JSON.stringify({ error: `Could not parse volume from input: "${inputStr}"` }));
  process.exit(1);
}

const volumeOz = parseFloat(match[1]);
const volumeMl = ozToMl(volumeOz);

// Load data.json
if (!fs.existsSync(DATA_FILE)) {
  console.log(JSON.stringify({ error: 'data.json database not found.' }));
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (e) {
  console.log(JSON.stringify({ error: 'Failed to parse data.json: ' + e.message }));
  process.exit(1);
}

// Create new log entry
const start = new Date(localTimestamp);
const end = new Date(start.getTime() + 15 * 60 * 1000); // 15 mins default duration

const newLog = {
  id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
  type: 'feeding',
  startTime: start.toISOString(),
  endTime: end.toISOString(),
  duration: 900,
  createdAt: new Date().toISOString(),
  details: {
    feedType: 'bottle',
    bottleType: 'formula', // default assumption
    volume: volumeMl,
    notes: `Logged via chat interface: "${inputStr}"`
  }
};

data.logs.push(newLog);

// Save updated data
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');

// Calculate Statistics
const targetDateStr = start.toISOString().split('T')[0]; // YYYY-MM-DD
const targetMonthStr = start.toISOString().substring(0, 7); // YYYY-MM

let todayVolumeMl = 0;
let todayCount = 0;
let monthVolumeMl = 0;
let monthCount = 0;

data.logs.forEach(log => {
  if (log.type === 'feeding' && log.details.feedType === 'bottle' && log.details.volume) {
    const logDateStr = log.startTime.split('T')[0];
    const logMonthStr = log.startTime.substring(0, 7);
    
    if (logDateStr === targetDateStr) {
      todayVolumeMl += log.details.volume;
      todayCount++;
    }
    if (logMonthStr === targetMonthStr) {
      monthVolumeMl += log.details.volume;
      monthCount++;
    }
  }
});

const todayVolumeOz = Math.round((todayVolumeMl * 0.033814) * 10) / 10;
const monthVolumeOz = Math.round((monthVolumeMl * 0.033814) * 10) / 10;

console.log(JSON.stringify({
  success: true,
  logged: {
    volumeOz,
    volumeMl,
    time: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: start.toLocaleDateString([], { month: 'short', day: 'numeric' })
  },
  stats: {
    today: {
      volumeMl: todayVolumeMl,
      volumeOz: todayVolumeOz,
      count: todayCount
    },
    month: {
      volumeMl: monthVolumeMl,
      volumeOz: monthVolumeOz,
      count: monthCount
    }
  }
}, null, 2));
