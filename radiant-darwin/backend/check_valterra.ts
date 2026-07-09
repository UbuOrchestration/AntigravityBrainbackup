import { getDb } from './src/db.js';

async function checkItem() {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM inventory WHERE title LIKE '%Valterra%'");
    console.log(JSON.stringify(rows, null, 2));
}

checkItem();
