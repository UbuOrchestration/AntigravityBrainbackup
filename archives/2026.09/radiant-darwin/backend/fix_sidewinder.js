const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const db = new sqlite3.Database('./data/database.sqlite');
const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');

// Accurate wholesale cost for Camco 43051 (20ft Sidewinder)
const sourcePrice = 28.50; 
const shippingCost = 5.00;
const totalCost = sourcePrice + shippingCost;
const desiredProfit = Math.max(totalCost * 0.40, 15.00);
const finalPrice = parseFloat(((totalCost + desiredProfit + 0.30) / (1 - 0.1325)).toFixed(2));

db.get('SELECT ebay_item_id, valid_image_urls, title FROM inventory WHERE sku = "ARB-AMAZON-RV-011"', [], async (err, row) => {
    if (err) throw err;
    if (!row || !row.ebay_item_id) return console.error("No active eBay ID found.");
    
    console.log(`Calculated accurate eBay Price: $${finalPrice}`);
    
    // Update DB
    db.run(`UPDATE inventory SET p_source = ?, p_ebay = ? WHERE sku = 'ARB-AMAZON-RV-011'`, [sourcePrice, finalPrice]);
    
    // Push ReviseItemRequest to eBay
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.accessToken;
    const imageUrls = JSON.parse(row.valid_image_urls);
    
    const escapeXml = (unsafe) => unsafe.replace(/[<>&'"]/g, (c) => {
        switch(c) {
            case '<': return '&lt;'; case '>': return '&gt;'; case '&': return '&amp;';
            case "'": return '&apos;'; case '"': return '&quot;';
        }
    });

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <ItemID>${row.ebay_item_id}</ItemID>
    <StartPrice>${finalPrice}</StartPrice>
  </Item>
</ReviseItemRequest>`;

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
        if (result.ReviseItemResponse.Ack === 'Success' || result.ReviseItemResponse.Ack === 'Warning') {
            console.log(`✅ SUCCESS: Synced price for ${row.ebay_item_id} ($${finalPrice})`);
        } else {
            console.error(`❌ FAILED:`, JSON.stringify(result.ReviseItemResponse.Errors));
        }
    } catch(apiErr) {
        console.error(`❌ API Error:`, apiErr.message);
    }
});
