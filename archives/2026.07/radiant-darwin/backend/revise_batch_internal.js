const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');
const catalogPath = path.join(__dirname, 'verified_catalog_updated.json');
const mapPath = path.join(__dirname, 'config', 'listings_metadata.json');

function calculatePrice(sourcePrice) {
  const shippingCost = 5.00;
  const totalCost = sourcePrice + shippingCost;
  const desiredProfit = Math.max(totalCost * 0.40, 15.00);
  
  // eBay fee = 13.25% + 0.30
  // Final Price = (totalCost + desiredProfit + 0.30) / (1 - 0.1325)
  let finalPrice = (totalCost + desiredProfit + 0.30) / (1 - 0.1325);
  return parseFloat(finalPrice.toFixed(2));
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function buildReviseItemXml(itemId, price, images) {
  return `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <ItemID>${itemId}</ItemID>
    <StartPrice>${price}</StartPrice>
    <PictureDetails>
      ${images.map(u => `<PictureURL>${escapeXml(u)}</PictureURL>`).join('\n      ')}
    </PictureDetails>
  </Item>
</ReviseItemRequest>`;
}

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.accessToken;
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const maps = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

    // Create lookup map from catalog
    const catalogMap = {};
    for (const p of catalog) {
      catalogMap[p.asin] = p;
    }

    const itemsToRevise = [];
    for (const key in maps) {
      const item = maps[key];
      if (item.sourceSku && catalogMap[item.sourceSku]) {
        itemsToRevise.push(item);
      }
    }

    console.log(`Found ${itemsToRevise.length} listings to QC and Revise.`);

    let successCount = 0;

    for (const item of itemsToRevise) {
      console.log(`\nProcessing QC for ${item.sourceSku} (${item.title})`);
      const catalogData = catalogMap[item.sourceSku];
      
      const sourcePrice = catalogData.sourcePrice;
      const newPrice = calculatePrice(sourcePrice);
      const imagesToUse = catalogData.imageUrls; // exactly 4 images
      
      console.log(`Source Price: $${sourcePrice}`);
      console.log(`Calculated eBay Price: $${newPrice}`);
      console.log(`Injecting ${imagesToUse.length} explicit image URLs...`);
      
      const xml = buildReviseItemXml(item.itemId, newPrice, imagesToUse);
      
      try {
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
          console.log(`✅ SUCCESS: Revised ItemID ${item.itemId}`);
          
          // Update map
          maps[item.itemId].currentPrice = newPrice;
          maps[item.itemId].sourcePrice = sourcePrice;
          
          successCount++;
        } else {
          console.error(`❌ FAILED: ${JSON.stringify(reviseResponse.Errors)}`);
        }
      } catch (err) {
        console.error(`❌ API Error: ${err.message}`);
      }
    }
    
    fs.writeFileSync(mapPath, JSON.stringify(maps, null, 2));
    console.log(`\nFinished QC. Successfully revised ${successCount} items.`);
    
  } catch (error) {
    console.error('Fatal Error:', error.message);
  }
}

main();
