import { getActiveListings, ensureValidToken } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

async function callTradingApi(callName: string, xmlBody: string, config: any): Promise<any> {
  const token = await ensureValidToken(config);
  const url = 'https://api.sandbox.ebay.com/ws/api.dll';
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
  return result[`${callName}Response`];
}

async function run() {
    const config = loadConfig();
    const liveItems = await getActiveListings(config);
    
    for (const item of liveItems) {
        if (item.quantityAvailable > 0) {
            console.log(`Ending item: ${item.itemId} - ${item.title}`);
            const xmlBody = `
                <ItemID>${item.itemId}</ItemID>
                <EndingReason>NotAvailable</EndingReason>
            `;
            try {
                const response = await callTradingApi('EndFixedPriceItem', xmlBody, config);
                if (response.Ack === 'Success' || response.Ack === 'Warning') {
                    console.log(`✅ SUCCESS: Ended ${item.itemId}`);
                } else {
                    console.error(`❌ FAILED ${item.itemId}:`, JSON.stringify(response.Errors));
                }
            } catch (e: any) {
                console.error(`Error ending ${item.itemId}: ${e.message}`);
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

run().catch(console.error);
