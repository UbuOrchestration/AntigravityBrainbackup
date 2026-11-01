import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    const result = await db.run("UPDATE inventory SET status = 'PENDING' WHERE ebay_item_id IS NULL AND status = 'ACTIVE'");
    console.log(`Updated pending statuses`);
}

run().catch(console.error);
