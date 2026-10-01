import { getDb } from './src/db.js';
import { updateListingMetadata } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';

async function run() {
    const config = loadConfig();
    const db = await getDb();
    
    // We will push the title for ARB-AMAZON-RV-021
    const items = await db.all("SELECT sku, title, optimized_title, ebay_item_id, listing_description FROM inventory WHERE ebay_item_id = '800315497988'");

    for (const item of items) {
        const titleToPush = item.optimized_title || item.title;
        console.log(`Pushing title to eBay for ${item.sku}: ${titleToPush}`);
        
        try {
            await updateListingMetadata(item.ebay_item_id, titleToPush.substring(0, 80), item.listing_description || 'Surge Protector', config);
            console.log(`✅ SUCCESS: Title updated for ${item.ebay_item_id}`);
        } catch (e: any) {
            console.error(`Error: ${e.message}`);
        }
    }
}

run().catch(console.error);
