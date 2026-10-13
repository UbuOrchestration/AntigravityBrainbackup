import { getDb } from '../src/db.js';

async function run() {
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title, source_url, ebay_item_id FROM inventory WHERE title LIKE '%Choice%' OR title LIKE '%Amazon%'");
    console.log(`Need to fix ${rows.length} titles.`);

    for (const row of rows) {
        // Extract a clean title from sku or source_url or search query
        // Let's see what information exists
        console.log(`SKU: ${row.sku} | ASIN: ${row.source_url} | Old Title: ${row.title}`);
    }
}

run().catch(console.error);
