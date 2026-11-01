import { ensureValidToken } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';
import { getDb } from './src/db.js';
import axios from 'axios';

async function run() {
    const config = loadConfig();
    const db = await getDb();
    
    // We will push the title for ARB-AMAZON-RV-021
    const token = await ensureValidToken(config);
    const url = 'https://api.sandbox.ebay.com/ws/api.dll';

    // Let's also find any other active items that need their title synced.
    const items = await db.all("SELECT sku, title, optimized_title, ebay_item_id FROM inventory WHERE ebay_item_id = '800315497988'");

    for (const item of items) {
        const titleToPush = item.optimized_title || item.title;
        console.log(`Pushing title to eBay for ${item.sku}: ${titleToPush}`);
        
        const xmlBody = `
        <Item>
            <ItemID>${item.ebay_item_id}</ItemID>
            <Title><![CDATA[${titleToPush.substring(0, 80)}]]></Title>
        </Item>`;
        
        const callName = 'ReviseFixedPriceItem';
        const fullXml = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  ${xmlBody}
</${callName}Request>`;

        const headers = {
            'Content-Type': 'text/xml',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-CALL-NAME': callName,
            'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
        };

        try {
            const response = await axios.post(url, fullXml, { headers });
            if (response.data.includes('<Ack>Success</Ack>') || response.data.includes('<Ack>Warning</Ack>')) {
                console.log(`✅ SUCCESS: Title updated for ${item.ebay_item_id}`);
            } else {
                console.error(`❌ FAILED:`, response.data);
            }
        } catch (e: any) {
            console.error(`Error: ${e.message}`);
        }
    }
}

run().catch(console.error);
