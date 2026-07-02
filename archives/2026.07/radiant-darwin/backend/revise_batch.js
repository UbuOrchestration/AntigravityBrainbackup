const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');
const catalogPath = path.join(__dirname, 'verified_catalog.json');
const mapPath = path.join(__dirname, 'config', 'listings_metadata.json');

// Map ASIN to the correct Camco Part Number for UPCitemDB query
const asinToPart = {
  'B000BUQOEQ': 'Camco 44505',
  'B000BGHYJ0': 'Camco 22505',
  'B00192JG9O': 'Camco 44414',
  'B000EDSSDO': 'Camco 44033',
  'B00074QWU0': 'Camco 39625',
  'B0024E6A3E': 'Camco 55501',
  'B0006JLW34': 'Camco 43981',
  'B000EDQQJS': 'Camco 42141',
  'B000EDUTNS': 'Camco 42153',
  'B0006JLSPI': 'Camco 22783'
};

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

function buildReviseItemXml(itemId, price, images, token) {
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

async function fetchProductData(query) {
  try {
    const res = await axios.get(`https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(query)}`);
    if (res.data && res.data.items && res.data.items.length > 0) {
      const item = res.data.items[0];
      return {
        price: item.lowest_recorded_price || 15.00,
        images: item.images ? item.images.slice(0, 4) : []
      };
    }
  } catch (e) {
    console.error(`Error querying UPCitemdb for ${query}:`, e.message);
  }
  return null;
}

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.accessToken;
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const maps = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

    // Find the 10 item IDs we need to revise
    const asinsToRevise = Object.keys(asinToPart);
    const itemsToRevise = [];
    
    for (const key in maps) {
      const item = maps[key];
      if (item.sourceSku && asinsToRevise.includes(item.sourceSku)) {
        itemsToRevise.push(item);
      }
    }

    console.log(`Found ${itemsToRevise.length} listings to QC and Revise.`);

    let successCount = 0;

    for (const item of itemsToRevise) {
      console.log(`\nProcessing QC for ${item.sourceSku} (${item.title})`);
      const query = asinToPart[item.sourceSku];
      console.log(`Querying API for: ${query}`);
      
      const apiData = await fetchProductData(query);
      
      if (apiData && apiData.images.length > 0) {
        const sourcePrice = apiData.price;
        const newPrice = calculatePrice(sourcePrice);
        const imagesToUse = apiData.images;
        
        console.log(`API Source Price: $${sourcePrice}`);
        console.log(`Calculated eBay Price: $${newPrice}`);
        console.log(`Found ${imagesToUse.length} genuine images.`);
        
        const xml = buildReviseItemXml(item.itemId, newPrice, imagesToUse, token);
        
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
            // Note: maps[item.itemId].images is not stored currently, but we updated it on eBay
            
            successCount++;
          } else {
            console.error(`❌ FAILED: ${JSON.stringify(reviseResponse.Errors)}`);
          }
        } catch (err) {
          console.error(`❌ API Error: ${err.message}`);
        }
        
      } else {
        console.log(`⚠️ Skipped: No data found on UPCitemdb for ${query}`);
      }
      
      // Delay to avoid hitting UPCitemdb rate limits
      await new Promise(r => setTimeout(r, 11000));
    }
    
    fs.writeFileSync(mapPath, JSON.stringify(maps, null, 2));
    console.log(`\nFinished QC. Successfully revised ${successCount} items.`);
    
  } catch (error) {
    console.error('Fatal Error:', error.message);
  }
}

main();
