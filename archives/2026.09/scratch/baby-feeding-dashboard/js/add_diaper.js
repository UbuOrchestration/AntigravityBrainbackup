/**
 * add_diaper.js - Log diaper changes from chat
 * Usage: node add_diaper.js <wet/dirty/both> <local_timestamp_iso>
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

const diaperType = process.argv[2] || 'wet';
const localTimestamp = process.argv[3] || new Date().toISOString();

if (!fs.existsSync(DATA_FILE)) {
  console.log(JSON.stringify({ error: 'data.json not found.' }));
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const start = new Date(localTimestamp);

  const newLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    type: 'diaper',
    startTime: start.toISOString(),
    endTime: start.toISOString(),
    createdAt: new Date().toISOString(),
    details: {
      diaperType: diaperType,
      notes: `Logged via chat interface`
    }
  };

  data.logs.push(newLog);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');

  // Count diaper stats for the target day
  const targetDateStr = start.toISOString().split('T')[0];
  let wetCount = 0;
  let dirtyCount = 0;

  data.logs.forEach(log => {
    if (log.type === 'diaper' && log.startTime.split('T')[0] === targetDateStr) {
      const dt = log.details.diaperType;
      if (dt === 'wet') wetCount++;
      else if (dt === 'dirty') dirtyCount++;
      else if (dt === 'both') {
        wetCount++;
        dirtyCount++;
      }
    }
  });

  console.log(JSON.stringify({
    success: true,
    logged: {
      type: diaperType,
      time: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: start.toLocaleDateString([], { month: 'short', day: 'numeric' })
    },
    todayDiapers: {
      wet: wetCount,
      dirty: dirtyCount,
      total: wetCount + dirtyCount // approximate unique diaper changes
    }
  }, null, 2));

} catch (e) {
  console.log(JSON.stringify({ error: e.message }));
  process.exit(1);
}
