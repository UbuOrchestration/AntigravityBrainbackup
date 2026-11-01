const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');

const itemsToUpdate = {
  '800273275316': 'B004809YOC', // Leveling Blocks
  '800273404258': 'B0006IX870', // Water Filter
  '800274164837': 'B003YJJ27C', // Pressure Regulator
  '800273407865': 'B003BZD074', // Sewer Hose
  '800274166958': 'B015Y9A1Z8'  // Surge Protector
};

async function getEbayImagesForQuery(query) {
  try {
    const res = await axios.get(`https://www.ebay.com/sch/i.html?_nkw=${query}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    
    const html = res.data;
    const regex = /https:\/\/i\.ebayimg\.com\/images\/g\/([a-zA-Z0-9_-]+)\/s-l/g;
    let match;
    const ids = new Set();
    const urls = [];
    
    while ((match = regex.exec(html)) !== null) {
      if (!ids.has(match[1])) {
        ids.add(match[1]);
        urls.push(`https://i.ebayimg.com/images/g/${match[1]}/s-l1600.jpg`);
        if (urls.length >= 4) break;
      }
    }
    
    return urls;
  } catch (err) {
    console.error(`Error scraping eBay for ${query}:`, err.message);
    return [];
  }
}

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let token = config.accessToken;

    for (const [itemId, asin] of Object.entries(itemsToUpdate)) {
      console.log(`Fetching genuine images for ${asin}...`);
      let urls = await getEbayImagesForQuery(asin);
      
      // Fallback to name search if ASIN yields < 2 images
      if (urls.length < 2) {
        let nameQuery = '';
        if (asin === 'B0006IX870') nameQuery = 'Camco TastePURE RV Water Filter 40043';
        if (asin === 'B003BZD074') nameQuery = 'Valterra Revolution 20ft Sewer Hose Kit';
        if (asin === 'B003YJJ27C') nameQuery = 'Lippert Water Pressure Regulator Brass';
        if (asin === 'B015Y9A1Z8') nameQuery = 'Progressive Industries 30-Amp Smart Surge Protector';
        if (asin === 'B004809YOC') nameQuery = 'Camco 44505 RV Leveling Blocks';
        
        const fallbackUrls = await getEbayImagesForQuery(encodeURIComponent(nameQuery));
        for (const u of fallbackUrls) {
           if (!urls.includes(u)) urls.push(u);
        }
      }

      if (urls.length === 0) {
        console.log(`Could not find genuine images for ${asin}. Skipping.`);
        continue;
      }

      console.log(`Found ${urls.length} images for Item ${itemId}. Updating eBay listing...`);
      
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <ItemID>${itemId}</ItemID>
    <PictureDetails>
      ${urls.slice(0, 4).map(u => `<PictureURL>${u}</PictureURL>`).join('\n      ')}
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
        console.log(`SUCCESS: Images updated for ${itemId}`);
      } else {
        console.error(`FAILED to update images for ${itemId}:`, JSON.stringify(reviseResponse.Errors));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
