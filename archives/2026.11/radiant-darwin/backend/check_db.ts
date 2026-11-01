import { getDb } from './src/db.js';

async function check() {
    const db = await getDb();
    const row = await db.get("SELECT * FROM inventory WHERE ebay_item_id = '800275551044'");
    console.log(row);
}
check();
