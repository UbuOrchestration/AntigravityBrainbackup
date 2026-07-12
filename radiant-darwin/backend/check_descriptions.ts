import { getDb } from './src/db.js';

async function checkDescriptions() {
    const db = await getDb();
    const rows = await db.all("SELECT id, sku, title, listing_description FROM inventory WHERE listing_description LIKE '%code%' COLLATE NOCASE");
    
    console.log(`Found ${rows.length} listings with code blocks in their descriptions.`);
    for (const row of rows) {
        console.log(`\n--- SKU: ${row.sku} --- Title: ${row.title}`);
        console.log("DESCRIPTION PREVIEW:\n", row.listing_description.substring(0, 150));
    }
}
checkDescriptions();
