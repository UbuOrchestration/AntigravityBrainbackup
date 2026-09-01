const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');
const mapPath = path.join(__dirname, 'config', 'listings_metadata.json');

const itemId = '800274164837';

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let token = config.accessToken;
    
    // Set stock to 0 on eBay
    console.log(`Setting stock to 0 for item ${itemId}...`);
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseInventoryStatusRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <InventoryStatus>
    <ItemID>${itemId}</ItemID>
    <Quantity>0</Quantity>
  </InventoryStatus>
</ReviseInventoryStatusRequest>`;

    const response = await axios.post('https://api.ebay.com/ws/api.dll', xml, {
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-CALL-NAME': 'ReviseInventoryStatus',
        'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
      }
    });

    const result = await parseStringPromise(response.data, { explicitArray: false });
    const reviseResponse = result.ReviseInventoryStatusResponse;

    if (reviseResponse.Ack === 'Success' || reviseResponse.Ack === 'Warning') {
      console.log(`SUCCESS: Stock set to 0 for ${itemId}`);
    } else {
      console.error(`FAILED to set stock to 0 for ${itemId}:`, JSON.stringify(reviseResponse.Errors));
    }

    // Remove from local tracking mapping
    const maps = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    if (maps[itemId]) {
      delete maps[itemId];
      fs.writeFileSync(mapPath, JSON.stringify(maps, null, 2));
      console.log(`Removed item ${itemId} from local tracking mapping.`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
