import { getDb } from './src/db.js';

async function searchDb() {
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title, item_specifics_json, listing_description FROM inventory WHERE item_specifics_json LIKE '%code%' COLLATE NOCASE OR listing_description LIKE '%code%' COLLATE NOCASE");
    
    console.log(`Found ${rows.length} matches.`);
    for (const row of rows) {
        console.log(`\n--- SKU: ${row.sku} --- Title: ${row.title}`);
        console.log("DESCRIPTION PREVIEW:\n", row.listing_description);
    }
}
searchDb();
