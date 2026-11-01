import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    const statuses = await db.all('SELECT status, COUNT(*) as count FROM inventory GROUP BY status');
    console.log(statuses);
    
    // Also let's check one ERROR item
    const errorItems = await db.all("SELECT sku, qc_notes FROM inventory WHERE status = 'ERROR' LIMIT 5");
    console.log("Error items:", errorItems);
}

run().catch(console.error);
