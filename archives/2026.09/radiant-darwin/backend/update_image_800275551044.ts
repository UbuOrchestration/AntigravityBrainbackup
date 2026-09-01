import { ensureValidToken } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';
import { getDb } from './src/db.js';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

async function updateImage() {
    const config = loadConfig();
    const db = await getDb();
    const itemId = '800275551044';
    
    // Valid Amazon-matching image from Home Depot
    const targetUrl = 'https://images.thdstatic.com/productImages/5fec019c-2d0f-47a0-a35f-44a9b3b575b6/svn/camco-rv-parts-22783-64_1000.jpg';
    
    console.log(`Submitting ReviseItem to eBay for ${itemId}...`);
    try {
        const token = await ensureValidToken(config);
        const url = 'https://api.sandbox.ebay.com/ws/api.dll';

        const xmlBody = `
        <Item>
            <ItemID>${itemId}</ItemID>
            <PictureDetails>
                <PictureURL>${targetUrl}</PictureURL>
            </PictureDetails>
        </Item>`;
        
        const callName = 'ReviseFixedPriceItem';
        const fullXml = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  ${xmlBody}
</${callName}Request>`;

        const headers = {
            'Content-Type': 'text/xml',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
            'X-EBAY-API-SITEID': '0', // US
            'X-EBAY-API-CALL-NAME': callName,
            'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
        };

        const response = await axios.post(url, fullXml, { headers });
        const result = await parseStringPromise(response.data, { explicitArray: false });
        const apiResponse = result[`${callName}Response`];
        
        if (apiResponse.Ack === 'Success' || apiResponse.Ack === 'Warning') {
            console.log(`SUCCESS! Item ${itemId} updated with new image: ${targetUrl}`);
            await db.run('UPDATE inventory SET valid_image_urls = ? WHERE ebay_item_id = ?', [JSON.stringify([targetUrl]), itemId]);
            console.log(`Database updated successfully.`);
        } else {
            console.error("eBay API Error:", JSON.stringify(apiResponse.Errors, null, 2));
        }
    } catch (e: any) {
        console.error("Failed to revise item:", e.message);
    }
}
updateImage();
