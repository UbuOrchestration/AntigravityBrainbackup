const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'config', 'listings_metadata.json');

async function main() {
  const maps = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

  // 1. Add Domain Violation
  maps['999999999991'] = {
    itemId: '999999999991',
    title: 'Generic Water Hose (Domain Risk)',
    currentPrice: 19.99,
    sourceUrl: 'https://www.unknownsupplier.com/dp/12345',
    sourceSku: '12345',
    sourcePrice: 5.00,
    autoPrice: true,
    autoStock: true,
    targetRoi: 40,
    lastChecked: new Date().toISOString(),
    status: 'Active'
  };

  // 2. Add VeRO Violation
  maps['999999999992'] = {
    itemId: '999999999992',
    title: 'Apple iPad Mount for RV',
    currentPrice: 29.99,
    sourceUrl: 'https://www.amazon.com/dp/APPLE123',
    sourceSku: 'APPLE123',
    sourcePrice: 10.00,
    autoPrice: true,
    autoStock: true,
    targetRoi: 40,
    lastChecked: new Date().toISOString(),
    status: 'Active'
  };

  fs.writeFileSync(mapPath, JSON.stringify(maps, null, 2));
  console.log('Injected dummy risk listings into map.');
}
main();
