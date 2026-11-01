const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');
const mapsPath = path.join(__dirname, 'config', 'listings_metadata.json');

const imageMap = {
  'B004809YOC': 'https://images-na.ssl-images-amazon.com/images/I/71uK5s9A9HL.jpg',
  'B0006IX870': 'https://images-na.ssl-images-amazon.com/images/I/71z-N7c7PGL.jpg',
  'B003BZD074': 'https://images-na.ssl-images-amazon.com/images/I/81xU-SHT11L.jpg',
  'B003YJJ27C': 'https://images-na.ssl-images-amazon.com/images/I/61sJ-13u-vL.jpg',
  'B015Y9A1Z8': 'https://images-na.ssl-images-amazon.com/images/I/71k-2z7rFRL.jpg'
};

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let token = config.accessToken;

    const maps = JSON.parse(fs.readFileSync(mapsPath, 'utf8'));
    const itemIds = Object.keys(maps);

    for (const itemId of itemIds) {
      const item = maps[itemId];
      const sku = item.sourceSku;
      const imageUrl = imageMap[sku];

      if (imageUrl) {
        console.log(`Updating image for Item ${itemId} (${item.title}) to ${imageUrl}`);
        
        const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <ItemID>${itemId}</ItemID>
    <PictureDetails>
      <PictureURL>${imageUrl}</PictureURL>
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
      } else {
        console.log(`No image mapped for SKU ${sku} on Item ${itemId}`);
      }
    }
  } catch (error) {
    console.error('Error updating images:', error.message);
  }
}

main();
