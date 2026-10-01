import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    const rows = await db.all("SELECT sku, title, status FROM inventory WHERE quantity = 0 AND title IS NOT NULL");
    console.log(`Found ${rows.length} items with 0 quantity.`);
    console.log(rows.slice(0, 15));
}

run().catch(console.error);
