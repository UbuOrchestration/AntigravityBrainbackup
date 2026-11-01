import { ensureValidToken } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';
import { getDb } from './src/db.js';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

async function run() {
    const config = loadConfig();
    const db = await getDb();
    const itemId = '800315497988';
    
    const images = ['https://m.media-amazon.com/images/I/71C7v52S02L._AC_SL1500_.jpg'];
    const title = "Valterra Surgeminder 30Amp Smart RV Surge Protector A10-30SMSP";
    
    try {
        const token = await ensureValidToken(config);
        const url = 'https://api.sandbox.ebay.com/ws/api.dll';

        const pictureUrlsXml = images.map((u: string) => `<PictureURL>${u}</PictureURL>`).join('\n');

        const xmlBody = `
        <Item>
            <ItemID>${itemId}</ItemID>
            <Title><![CDATA[${title}]]></Title>
            <PictureDetails>
                ${pictureUrlsXml}
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
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-CALL-NAME': callName,
            'X-EBAY-API-IAF-TOKEN': `Bearer ${token}`
        };

        const response = await axios.post(url, fullXml, { headers });
        const result = await parseStringPromise(response.data, { explicitArray: false });
        const apiResponse = result[`${callName}Response`];
        
        if (apiResponse.Ack === 'Success' || apiResponse.Ack === 'Warning') {
            console.log(`SUCCESS! Item ${itemId} updated with new title and images.`);
            await db.run('UPDATE inventory SET optimized_title = ?, valid_image_urls = ?, title = ? WHERE ebay_item_id = ?', [title, JSON.stringify(images), title, itemId]);
            console.log(`Database updated successfully.`);
        } else {
            console.error("eBay API Error:", JSON.stringify(apiResponse.Errors, null, 2));
        }
    } catch (e: any) {
        console.error("Failed to revise item:", e.message);
    }
}

run().catch(console.error);
