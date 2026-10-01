import { getDb } from './src/db.js';
import { updateListingInventory } from './src/ebayApi.js';
import { loadConfig } from './src/config.js';

async function run() {
    const db = await getDb();
    const config = loadConfig();
    
    const sku = 'ARB-AMAZON-RV-001';
    const walmartUrl = 'https://www.walmart.com/ip/Camco-TST-MAX-RV-Toilet-Treatment-Drop-Ins-Lavender-Scent-30-Count/5000123';
    
    // Update DB to walmart
    await db.run(`
        UPDATE inventory 
        SET source_platform = 'walmart', 
            source_url = ?, 
            p_source = 19.99,
            p_ebay = 29.99,
            cost_tier = 'low'
        WHERE sku = ?
    `, [walmartUrl, sku]);
    
    // Push update to eBay
    try {
        const row = await db.get("SELECT ebay_item_id FROM inventory WHERE sku = ?", [sku]);
        if (row && row.ebay_item_id) {
            await updateListingInventory(row.ebay_item_id, 29.99, 1, config);
            console.log("Successfully updated eBay pricing for " + sku);
        }
    } catch (e: any) {
        console.error("Failed to update eBay:", e.message);
    }
}

run().catch(console.error);
