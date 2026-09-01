const fs = require('fs');
const path = require('path');

const stockpilePath = path.join(__dirname, 'stockpile.json');

// Helper to normalize strings for comparison
function normalizeName(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Emulate parseEmailAndProcess logic for testing
function simulateEmailResponse(emailContent) {
  console.log('Simulating parsing of response email...');
  const cleanContent = emailContent.toLowerCase();

  let stockpile = JSON.parse(fs.readFileSync(stockpilePath, 'utf8'));
  let updated = false;

  const lines = emailContent.split('\n');
  lines.forEach((line) => {
    const cleanLine = line.trim().toLowerCase();
    if (!cleanLine) return;

    // Parse BUY/KEEP confirmations
    const buyMatch = cleanLine.match(/^(buy|keep)\s+(.+)$/i);
    if (buyMatch) {
      const action = buyMatch[1].toLowerCase();
      const itemName = buyMatch[2].trim();
      const normItem = normalizeName(itemName);

      for (const category in stockpile) {
        for (const itemKey in stockpile[category]) {
          const item = stockpile[category][itemKey];
          if (normalizeName(item.name) === normItem || normalizeName(itemKey) === normItem) {
            item.status = action === 'buy' ? 'confirmed_buy' : 'confirmed_keep';
            console.log(`[TEST ASSERT] Matched ${item.name} set status to ${item.status}`);
            updated = true;
          }
        }
      }
    }

    // Parse quantity updates
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
            console.log(`[TEST ASSERT] Matched ${item.name} set quantity to ${quantity} ${item.unit}`);
            updated = true;
          }
        }
      }
    }
  });

  if (updated) {
    fs.writeFileSync(stockpilePath, JSON.stringify(stockpile, null, 2), 'utf8');
    console.log('[TEST ASSERT] Saved updated stockpile.json.');
  } else {
    console.log('[TEST ASSERT] No updates made.');
  }
}

// Test Case 1: Simulating user replying to buy olive oil
console.log('\n--- TEST CASE 1: Confirm BUY Olive Oil ---');
simulateEmailResponse('BUY olive oil');

// Verify stockpile update
let stockpile = JSON.parse(fs.readFileSync(stockpilePath, 'utf8'));
if (stockpile.cooking.olive_oil.status === 'confirmed_buy') {
  console.log('✅ TEST CASE 1 PASSED: Olive oil status is confirmed_buy.');
} else {
  console.log('❌ TEST CASE 1 FAILED: Olive oil status is ' + stockpile.cooking.olive_oil.status);
}

// Test Case 2: Simulating user replying to monthly audit
console.log('\n--- TEST CASE 2: Update stock quantity ---');
simulateEmailResponse('toilet paper: 12 rolls\ndishwasher pods: 30 pods');

// Verify stockpile update
stockpile = JSON.parse(fs.readFileSync(stockpilePath, 'utf8'));
if (stockpile.household.toilet_paper.quantity === 12 && stockpile.household.dishwasher_pods.quantity === 30) {
  console.log('✅ TEST CASE 2 PASSED: Quantities updated correctly.');
} else {
  console.log('❌ TEST CASE 2 FAILED.');
}
