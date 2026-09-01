const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');
const sqlite3 = require('sqlite3').verbose();

const configPath = path.join(__dirname, 'config', 'ebay_credentials.json');

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

async function syncAllToEbay() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const token = config.accessToken;

        const dbPath = path.resolve(__dirname, 'data', 'database.sqlite');
        const db = new sqlite3.Database(dbPath);
        
        db.all('SELECT sku, title, p_ebay, ebay_item_id, valid_image_urls FROM inventory WHERE status = "ACTIVE" AND ebay_item_id IS NOT NULL', [], async (err, rows) => {
            if (err) throw err;
            
            console.log(`Found ${rows.length} active listings on eBay to update metadata and images for.`);
            let successCount = 0;
            
            for (const row of rows) {
                if (!row.valid_image_urls || row.valid_image_urls === '[]') continue;
                
                let imageUrls;
                try {
                    imageUrls = JSON.parse(row.valid_image_urls);
                } catch(e) {
                    continue;
                }
                
                // Filter out eBay's own CDN (EPS)
                imageUrls = imageUrls.filter(url => !url.includes('ebayimg.com'));
                
                if (imageUrls.length === 0) continue;
                
                console.log(`Pushing full payload to eBay Item ${row.ebay_item_id} (${row.sku})...`);
                
                const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <ItemID>${row.ebay_item_id}</ItemID>
    <Title>${escapeXml(row.title)}</Title>
    <StartPrice>${row.p_ebay}</StartPrice>
    <PictureDetails>
      ${imageUrls.map(u => `<PictureURL>${escapeXml(u)}</PictureURL>`).join('\n      ')}
    </PictureDetails>
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
                    const reviseResponse = result.ReviseItemResponse;

                    if (reviseResponse.Ack === 'Success' || reviseResponse.Ack === 'Warning') {
                        console.log(`✅ SUCCESS: Fully synced ${row.ebay_item_id}`);
                        successCount++;
                    } else {
                        console.error(`❌ FAILED for ${row.ebay_item_id}:`, JSON.stringify(reviseResponse.Errors));
                    }
                } catch(apiErr) {
                    console.error(`❌ API Error for ${row.ebay_item_id}:`, apiErr.message);
                }
                
                await new Promise(r => setTimeout(r, 1000));
            }
            
            console.log(`\nSync complete. Successfully revised ${successCount} listings.`);
        });
    } catch (error) {
        console.error('Fatal Error:', error.message);
    }
}

syncAllToEbay();
