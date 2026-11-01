import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    await db.run("DELETE FROM inventory WHERE sku IN ('12345', 'APPLE123')");
    console.log('Deleted mock SKUs');
}

run().catch(console.error);
