import { getActiveListings } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';

async function run() {
    const config = loadConfig();
    try {
        const liveItems = await getActiveListings(config);
        console.log(`Found ${liveItems.length} LIVE items on eBay:`);
        for (const item of liveItems) {
            console.log(`- ID: ${item.itemId} | SKU: ${item.sku} | Qty: ${item.quantityAvailable} | Title: ${item.title}`);
        }
    } catch (e: any) {
        console.error(`Error: ${e.message}`);
    }
}

run().catch(console.error);
