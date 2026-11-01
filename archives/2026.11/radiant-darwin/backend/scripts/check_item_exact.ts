import { getDb } from '../src/db.js';

async function check() {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM inventory WHERE ebay_item_id = '800273275316' OR title LIKE '%Leveling Blocks%'");
    console.log(rows);
}

check().catch(console.error);
