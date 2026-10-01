import { getActiveListings, updateListingInventory } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';
import { getDb } from './src/db.js';

async function run() {
    const config = loadConfig();
    const db = await getDb();
    
    try {
        const liveItems = await getActiveListings(config);
        console.log(`Found ${liveItems.length} items total. Filtering for Qty > 0...`);
        
        for (const item of liveItems) {
            if (item.quantityAvailable > 0) {
                console.log(`Suspending: ${item.itemId} - ${item.title}`);
                try {
                    await updateListingInventory(item.itemId, item.price, 0, config);
                    await db.run("UPDATE inventory SET status = 'ERROR', quantity = 0 WHERE ebay_item_id = ?", [item.itemId]);
                } catch(e: any) {
                    console.error(`Failed to suspend ${item.itemId}: ${e.message}`);
                }
            }
        }
        
        console.log("Blanket takedown complete.");
    } catch (e: any) {
        console.error(`Error: ${e.message}`);
    }
}

run().catch(console.error);
