const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');

const imageMap = {
  '800273275316': [
    'https://cdnimages.opentip.com/full/LNS/LNS-17-44505.jpg',
    'https://cdnimages.opentip.com/full/LNS/LNS-17-44505_1.jpg',
    'https://files.catbox.moe/1gi8hu.jpg'
  ],
  '800273404258': [
    'https://cdnimages.opentip.com/full/LNS/LNS-17-40045.jpg', 
    'https://files.catbox.moe/3qkrw4.jpg'
  ],
  '800274164837': [
    'https://cdnimages.opentip.com/full/LNS/LNS-17-40055.jpg',
    'https://files.catbox.moe/dqxs09.jpg'
  ],
  '800273407865': [
    'https://files.catbox.moe/7nkbmr.jpg'
  ],
  '800274166958': [
    'https://files.catbox.moe/9u8mvf.jpg'
  ]
};

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let token = config.accessToken;

    for (const [itemId, urls] of Object.entries(imageMap)) {
      console.log(`Fixing images for Item ${itemId}...`);
      
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <ItemID>${itemId}</ItemID>
    <PictureDetails>
      ${urls.map(u => `<PictureURL>${u}</PictureURL>`).join('\n      ')}
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
        console.log(`SUCCESS: Images fixed for ${itemId}`);
      } else {
        console.error(`FAILED to fix images for ${itemId}:`, JSON.stringify(reviseResponse.Errors));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
