import { getDb } from './src/db.js';
import { updateListingInventory } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';

async function run() {
    const db = await getDb();
    await updateListingInventory('800315497928', 77.95, 0, loadConfig());
    await db.run("UPDATE inventory SET status = 'ERROR', quantity = 0, qc_notes = 'Mismatched product type' WHERE sku = 'ARB-AMAZON-RV-020'");
    console.log("Suspended ARB-AMAZON-RV-020");
}

run().catch(console.error);
