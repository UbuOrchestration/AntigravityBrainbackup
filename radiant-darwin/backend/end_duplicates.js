const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parseStringPromise } = require('xml2js');

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');

async function endListings() {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.accessToken;

    // SKUs to end (duplicates of leveling blocks)
    const skusToEnd = ['B004809YOC', 'ARB-AMAZON-RV-009', 'ARB-AMAZON-RV-010'];
    
    const dbPath = path.resolve(__dirname, 'data', 'database.sqlite');
    const db = new sqlite3.Database(dbPath);

    db.all(`SELECT sku, ebay_item_id FROM inventory WHERE sku IN (${skusToEnd.map(s => `'${s}'`).join(',')})`, [], async (err, rows) => {
        if (err) throw err;
        
        for (const row of rows) {
            if (!row.ebay_item_id) continue;
            console.log(`Ending eBay item ${row.ebay_item_id} (SKU: ${row.sku})...`);
            
            const xml = `<?xml version="1.0" encoding="utf-8"?>
<EndItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ItemID>${row.ebay_item_id}</ItemID>
  <EndingReason>NotAvailable</EndingReason>
</EndItemRequest>`;

            try {
                const response = await axios.post('https://api.ebay.com/ws/api.dll', xml, {
                    headers: {
                        'Content-Type': 'text/xml',
                        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
                        'X-EBAY-API-SITEID': '0',
                        'X-EBAY-API-CALL-NAME': 'EndItem',
                        'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
                    }
                });

                const result = await parseStringPromise(response.data, { explicitArray: false });
                if (result.EndItemResponse.Ack === 'Success' || result.EndItemResponse.Ack === 'Warning') {
                    console.log(`✅ SUCCESS: Ended ItemID ${row.ebay_item_id}`);
                    
                    // Mark inactive locally
                    db.run(`UPDATE inventory SET status = 'INACTIVE' WHERE sku = ?`, [row.sku]);
                } else {
                    console.error(`❌ FAILED for ${row.ebay_item_id}:`, JSON.stringify(result.EndItemResponse.Errors));
                }
            } catch(e) {
                console.error(`❌ API Error for ${row.ebay_item_id}:`, e.message);
            }
        }
        
        console.log("Cleanup complete!");
    });
}

endListings();
