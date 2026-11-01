import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    const items = await db.all("SELECT sku, status, ebay_item_id, qc_notes FROM inventory WHERE status = 'ACTIVE' AND ebay_item_id IS NULL");
    console.log(items);
}

run().catch(console.error);
