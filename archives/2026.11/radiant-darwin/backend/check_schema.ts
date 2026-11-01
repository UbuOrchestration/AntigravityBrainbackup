import { getDb } from './src/db.js';

async function run() {
    const db = await getDb();
    const info = await db.all('PRAGMA table_info(inventory)');
    console.log(info.map(i => i.name));
}

run().catch(console.error);
