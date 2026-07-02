const fs = require('fs');
const path = require('path');
const { updateListingInventory } = require('./dist/ebayApi.js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');
const mapPath = path.join(__dirname, 'config', 'listings_metadata.json');

const itemId = '800274164837';

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // The tracker map has it at 27.20
    console.log(`Setting stock to 0 for item ${itemId} using official ebayApi function...`);
    await updateListingInventory(itemId, 27.20, 0, config);
    console.log(`SUCCESS: Stock set to 0 for ${itemId}`);

    // Remove from local tracking mapping
    // We already removed it in the previous script! Wait, let me check if it's there
    const maps = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    if (maps[itemId]) {
      delete maps[itemId];
      fs.writeFileSync(mapPath, JSON.stringify(maps, null, 2));
      console.log(`Removed item ${itemId} from local tracking mapping.`);
    } else {
      console.log(`Item ${itemId} was already removed from mapping.`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
