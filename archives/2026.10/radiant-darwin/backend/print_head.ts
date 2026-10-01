import { getDb } from './src/db.js';

async function printHead() {
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title, listing_description FROM inventory LIMIT 5");
    
    for (const row of rows) {
        console.log(`\n--- SKU: ${row.sku} --- Title: ${row.title}`);
        console.log("DESCRIPTION PREVIEW:\n", row.listing_description);
    }
}
printHead();
