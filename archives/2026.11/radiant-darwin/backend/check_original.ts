import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    const rows = await db.all("SELECT sku, title, upc_mpn, source_url FROM inventory WHERE sku LIKE 'ARB-AMAZON-RV-02%' OR sku LIKE 'ARB-AMAZON-RV-04%' LIMIT 10");
    console.log(rows);
}

run().catch(console.error);
