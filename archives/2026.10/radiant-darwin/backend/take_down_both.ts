import { getDb } from './src/db.js';
import { updateListingInventory } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';

async function run() {
    const config = loadConfig();
    const db = await getDb();
    
    // Suspend Valterra
    try {
        await updateListingInventory('800315497988', 135.04, 0, config);
        await db.run("UPDATE inventory SET status = 'ERROR', quantity = 0 WHERE ebay_item_id = '800315497988'");
        console.log("Suspended Valterra");
    } catch(e: any) {
        console.error(e.message);
    }

    // Suspend Dometic Grommets
    try {
        await updateListingInventory('800355524813', 25.81, 0, config);
        await db.run("UPDATE inventory SET status = 'ERROR', quantity = 0 WHERE ebay_item_id = '800355524813'");
        console.log("Suspended Dometic Grommets");
    } catch(e: any) {
        console.error(e.message);
    }
}

run().catch(console.error);
