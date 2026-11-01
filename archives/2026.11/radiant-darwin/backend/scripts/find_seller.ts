import { getDb } from '../src/db.js';

async function run() {
    const db = await getDb();
    const orders = await db.all("SELECT * FROM sales_orders LIMIT 5");
    console.log("Orders:", orders);
    const config = await db.all("SELECT * FROM fulfillment_config");
    console.log("Fulfillment config:", config);
}

run().catch(console.error);
