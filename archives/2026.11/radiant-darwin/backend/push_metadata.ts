import { getDb } from './src/db.js';
import { updateListingMetadata, updateListingInventory } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';

const GIMMICK_SENTENCE = "🔥 **LIMITED TIME OFFER: Act fast before we sell out! Fast and Free Shipping!** 🔥\n\n";

async function run() {
    const db = await getDb();
    const config = loadConfig();
    if (!config) throw new Error("No config");

    const activeRows = await db.all("SELECT id, sku, title, listing_description, ebay_item_id, p_ebay FROM inventory WHERE status = 'ACTIVE'");
    let count = 0;

    for (const row of activeRows) {
        if (!row.ebay_item_id) {
            console.warn(`Skipping ${row.sku} - No ebay_item_id`);
            continue;
        }
        
        // Check if already applied
        let newDesc = row.listing_description;
        if (!newDesc.includes("LIMITED TIME OFFER")) {
            newDesc = GIMMICK_SENTENCE + newDesc;
            await db.run("UPDATE inventory SET listing_description = ? WHERE id = ?", [newDesc, row.id]);
        }

        console.log(`Pushing ${row.sku}...`);
        
        try {
            await updateListingMetadata(row.ebay_item_id, row.title, newDesc, config);
            await updateListingInventory(row.ebay_item_id, row.p_ebay, undefined, config);
            count++;
        } catch (e: any) {
            console.error(`Failed to push ${row.sku}: ${e.message}`);
        }
        
        // Sleep to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`Pushed ${count} active listings.`);
}
run().catch(console.error);
