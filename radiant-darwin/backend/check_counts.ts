import { getDb } from './src/db.js';
getDb().then(async db => {
    const active = await db.get("SELECT COUNT(*) as c FROM inventory WHERE status = 'ACTIVE'");
    const pending = await db.get("SELECT COUNT(*) as c FROM inventory WHERE status = 'PENDING'");
    console.log(`ACTIVE: ${active.c}, PENDING: ${pending.c}`);
});
