/**
 * update_baby.js - Updates baby profile settings and cleans sleep logs in data.json
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

if (!fs.existsSync(DATA_FILE)) {
  console.log('data.json not found.');
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const originalLogsCount = data.logs.length;

  // 1. Update Profile Name
  data.profile.name = 'Marielle';
  
  // 2. Set Theme preference to Dark Mode
  data.prefs.theme = 'dark';

  // 3. Remove all logs of type 'sleep'
  data.logs = data.logs.filter(log => log.type !== 'sleep');
  const removedCount = originalLogsCount - data.logs.length;

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(JSON.stringify({
    success: true,
    nameSet: 'Marielle',
    themeSet: 'dark',
    sleepLogsRemoved: removedCount,
    remainingLogs: data.logs.length
  }, null, 2));
} catch (e) {
  console.error('Error modifying database:', e.message);
  process.exit(1);
}
