/**
 * remove_feed.js - Clean up specific logs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

if (!fs.existsSync(DATA_FILE)) {
  console.log('Database not found.');
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const originalCount = data.logs.length;
  
  // Filter out any feeding logs with notes containing our test signature
  data.logs = data.logs.filter(log => {
    const isTestFeed = log.type === 'feeding' && 
                       log.details.notes && 
                       log.details.notes.includes('Logged via chat interface: "3oz"');
    return !isTestFeed;
  });
  
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Successfully removed ${originalCount - data.logs.length} test entry.`);
} catch (e) {
  console.error('Error processing database:', e.message);
}
