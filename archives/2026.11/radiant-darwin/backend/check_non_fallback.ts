import { getDb } from './src/db.js';

async function checkNonFallback() {
    const db = await getDb();
    // Get items that don't have the heuristic fallback string
    const rows = await db.all("SELECT id, sku, title, listing_description FROM inventory WHERE listing_description NOT LIKE '%Premium construction for ultimate durability%'");
    
    console.log(`Found ${rows.length} items without the heuristic fallback.`);
    for (const row of rows) {
        console.log(`\n--- SKU: ${row.sku} --- Title: ${row.title}`);
        console.log("DESCRIPTION PREVIEW:\n", row.listing_description);
    }
}
checkNonFallback();
