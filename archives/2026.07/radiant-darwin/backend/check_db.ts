import { getDb } from './src/db.js';

async function queryTables() {
    const db = await getDb();
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables:", tables);

    try {
        const config = await db.all("SELECT * FROM fulfillment_config");
        console.log("fulfillment_config:", config);
    } catch(e) {}
}

queryTables();
