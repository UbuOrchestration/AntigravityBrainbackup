import { getDb } from '../src/db.js';

async function run() {
    const db = await getDb();
    const rows = await db.all("SELECT sku, title, ebay_item_id, status, quantity, p_ebay, valid_image_urls, source_url FROM inventory WHERE ebay_item_id IS NOT NULL");
    console.log(`Found ${rows.length} rows with ebay_item_id.`);
    console.log(JSON.stringify(rows.slice(0, 10), null, 2));
}

run().catch(console.error);
