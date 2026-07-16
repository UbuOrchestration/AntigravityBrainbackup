import { getDb } from './src/db.js';
getDb().then(async db => {
    const row = await db.get("SELECT * FROM inventory LIMIT 1");
    console.log(Object.keys(row));
});
