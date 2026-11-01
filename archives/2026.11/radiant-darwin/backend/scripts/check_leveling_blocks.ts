import { getDb } from '../src/db.js';

async function checkItem() {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM inventory WHERE title LIKE '%Leveling Blocks%' OR sku LIKE '%B004809YOC%' OR sku LIKE '%RV-011%'");
    console.log(JSON.stringify(rows, null, 2));
}

checkItem().catch(console.error);
