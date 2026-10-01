import { getDb } from './src/db.js';

async function check() {
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title, listing_description FROM inventory LIMIT 50");
    
    for (const row of rows) {
        if (row.listing_description.includes("```") || row.listing_description.includes("{") || row.listing_description.toLowerCase().includes("json") || row.listing_description.includes("Code") || row.listing_description.includes("code")) {
             console.log(`\n--- SKU: ${row.sku} --- Title: ${row.title}`);
             console.log("DESCRIPTION PREVIEW:\n", row.listing_description);
        }
    }
}
check();
