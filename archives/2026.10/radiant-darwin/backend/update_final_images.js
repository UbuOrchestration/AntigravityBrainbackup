const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');

const imageMap = {
  '800273275316': 'https://cdnimages.opentip.com/full/LNS/LNS-17-44505.jpg', // Leveling Blocks
  '800273404258': 'https://cdnimages.opentip.com/full/LNS/LNS-17-40043.jpg', // Water Filter
  '800274164837': 'https://cdnimages.opentip.com/full/LNS/LNS-17-40055.jpg', // Pressure Regulator
  '800273407865': 'https://images.unsplash.com/photo-1621245086884-13e01bc465d6', // Sewer Hose placeholder
  '800274166958': 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b6'  // Surge Protector placeholder
};

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let token = config.accessToken;

    for (const [itemId, url] of Object.entries(imageMap)) {
      console.log(`Processing Item ${itemId} using image ${url}...`);
      
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <ItemID>${itemId}</ItemID>
    <PictureDetails>
      <PictureURL>${url}</PictureURL>
    </PictureDetails>
  </Item>
</ReviseItemRequest>`;

      const response = await axios.post('https://api.ebay.com/ws/api.dll', xml, {
        headers: {
          'Content-Type': 'text/xml',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-CALL-NAME': 'ReviseItem',
          'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
        }
      });

      const result = await parseStringPromise(response.data, { explicitArray: false });
      const reviseResponse = result.ReviseItemResponse;

      if (reviseResponse.Ack === 'Success' || reviseResponse.Ack === 'Warning') {
        console.log(`SUCCESS: Image updated for ${itemId}`);
      } else {
        console.error(`FAILED to update image for ${itemId}:`, JSON.stringify(reviseResponse.Errors));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
