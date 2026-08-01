import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM inventory WHERE sku = 'ARB-AMAZON-RV-001'");
    console.log(JSON.stringify(rows, null, 2));
}

run().catch(console.error);
